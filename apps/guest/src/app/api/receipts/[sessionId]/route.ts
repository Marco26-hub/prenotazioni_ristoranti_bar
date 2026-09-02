import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { allowed } = await checkRateLimit(clientKey(request, "receipt"), 30, 60);
  if (!allowed) return new NextResponse("Troppe richieste", { status: 429 });

  const { sessionId } = await params;
  const sql = db();

  const [session] = await sql<
    {
      id: string;
      status: string;
      table_code: string;
      venue_name: string;
      vat_number: string | null;
      address: string | null;
      address_zip: string | null;
      address_city: string | null;
      currency: string;
    }[]
  >`
    select ts.id, ts.status, t.code as table_code, v.name as venue_name,
           v.vat_number, v.address, v.address_zip, v.address_city, v.currency
      from table_sessions ts
      join tables t on t.id = ts.table_id
      join venues v on v.id = ts.venue_id
     where ts.id = ${sessionId}`;

  if (!session) return new NextResponse("Sessione non trovata", { status: 404 });

  const payments = await sql<
    { amount_cents: number; tip_cents: number; method: string; created_at: Date }[]
  >`
    select amount_cents, tip_cents, method, created_at
      from payments
     where table_session_id = ${session.id} and status = 'succeeded'
     order by created_at`;

  if (payments.length === 0) {
    return new NextResponse("Il pagamento e ancora in elaborazione. Riprova tra pochi secondi.", {
      status: 409,
    });
  }

  const items = await sql<
    {
      name: string;
      quantity: number;
      unit_price_cents: number;
      selected_options: Array<{ opzione?: string }>;
    }[]
  >`
    select mi.name, oi.quantity, oi.unit_price_cents, oi.selected_options
      from order_items oi
      join orders o on o.id = oi.order_id
      join menu_items mi on mi.id = oi.menu_item_id
     where o.table_session_id = ${session.id}
       and o.status != 'cancelled' and oi.status != 'cancelled'
     order by o.created_at, mi.name`;

  const itemTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0
  );
  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const tipTotal = payments.reduce((sum, payment) => sum + payment.tip_cents, 0);
  const extrasTotal = Math.max(paidTotal - itemTotal, 0);
  const currency = session.currency || "EUR";
  const date = payments.at(-1)?.created_at ?? new Date();
  const address = [session.address, session.address_zip, session.address_city]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" ");

  const itemRows = items
    .map((item) => {
      const options = (item.selected_options ?? [])
        .map((option) => option.opzione)
        .filter(Boolean)
        .map(escapeHtml)
        .join(" · ");
      return `<tr>
        <td><strong>${item.quantity}×</strong> ${escapeHtml(item.name)}${options ? `<small>${options}</small>` : ""}</td>
        <td>${escapeHtml(formatMoney(item.quantity * item.unit_price_cents, currency))}</td>
      </tr>`;
    })
    .join("");

  const methods = [...new Set(payments.map((payment) => payment.method))]
    .map((method) =>
      method === "satispay" ? "Satispay" : method === "cash" ? "Contanti" : "Carta"
    )
    .join(", ");

  const html = `<!doctype html>
  <html lang="it">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Ricevuta di pagamento - ${escapeHtml(session.venue_name)}</title>
      <style>
        :root { color-scheme: light; font-family: Inter, system-ui, sans-serif; color: #24211e; background: #f3f0ea; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px 16px; }
        main { max-width: 560px; margin: 0 auto; padding: 32px; background: #fffdf9; border: 1px solid #ded5c9; border-radius: 8px; }
        header { padding-bottom: 20px; border-bottom: 1px solid #ded5c9; }
        h1 { margin: 0 0 6px; font-family: Georgia, serif; font-size: 28px; }
        p { margin: 4px 0; color: #716b63; font-size: 14px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        td { padding: 10px 0; border-bottom: 1px solid #eee7de; vertical-align: top; }
        td:last-child { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        small { display: block; margin: 3px 0 0 24px; color: #716b63; }
        .totals { margin-left: auto; max-width: 300px; }
        .row { display: flex; justify-content: space-between; gap: 24px; padding: 5px 0; }
        .total { margin-top: 8px; padding-top: 12px; border-top: 2px solid #24211e; font-size: 18px; font-weight: 700; }
        .notice { margin-top: 24px; padding: 12px; background: #f3f0ea; border-radius: 6px; }
        button { width: 100%; margin-top: 20px; min-height: 48px; border: 0; border-radius: 999px; color: white; background: #a64b2a; font: inherit; font-weight: 700; cursor: pointer; }
        @media print { body { padding: 0; background: white; } main { border: 0; padding: 0; } button { display: none; } }
      </style>
    </head>
    <body>
      <main>
        <header>
          <h1>${escapeHtml(session.venue_name)}</h1>
          ${address ? `<p>${address}</p>` : ""}
          ${session.vat_number ? `<p>P.IVA ${escapeHtml(session.vat_number)}</p>` : ""}
          <p>Tavolo ${escapeHtml(session.table_code)} · ${escapeHtml(formatDate(date))}</p>
        </header>
        <table><tbody>${itemRows}</tbody></table>
        <div class="totals">
          <div class="row"><span>Piatti e bevande</span><strong>${escapeHtml(formatMoney(itemTotal, currency))}</strong></div>
          ${extrasTotal > 0 ? `<div class="row"><span>Coperto e servizio</span><strong>${escapeHtml(formatMoney(extrasTotal, currency))}</strong></div>` : ""}
          ${tipTotal > 0 ? `<div class="row"><span>Mancia</span><strong>${escapeHtml(formatMoney(tipTotal, currency))}</strong></div>` : ""}
          <div class="row total"><span>Pagato</span><span>${escapeHtml(formatMoney(paidTotal + tipTotal, currency))}</span></div>
        </div>
        <p class="notice">Pagamento effettuato con ${escapeHtml(methods)}. Documento di cortesia non fiscale.</p>
        <button type="button" onclick="window.print()">Stampa o salva in PDF</button>
      </main>
    </body>
  </html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    },
  });
}
