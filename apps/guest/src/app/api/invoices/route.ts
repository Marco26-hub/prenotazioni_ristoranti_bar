import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { buildFatturaPaJson, type CustomerData } from "@/lib/invoice/fatturapa";
import { invoicetronicClient } from "@/lib/invoice/invoicetronic-client";

interface InvoiceRequestBody {
  sessionId: string;
  customer: CustomerData;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as InvoiceRequestBody | null;
  if (!body?.sessionId || !body.customer) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const sql = db();

  const [session] = await sql<{ id: string; venue_id: string; status: string }[]>`
    select id, venue_id, status from table_sessions where id = ${body.sessionId}`;
  if (!session) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 404 });
  }
  if (session.status !== "closed") {
    return NextResponse.json(
      { error: "Il conto non risulta ancora saldato" },
      { status: 409 }
    );
  }

  const [payment] = await sql<{ id: string }[]>`
    select id from payments
    where table_session_id = ${session.id} and status = 'succeeded'
    order by created_at desc limit 1`;
  if (!payment) {
    return NextResponse.json({ error: "Nessun pagamento trovato" }, { status: 409 });
  }

  const [venue] = await sql<
    {
      name: string;
      vat_number: string | null;
      fiscal_code: string | null;
      regime_fiscale: string | null;
      address: string | null;
      address_zip: string | null;
      address_city: string | null;
      address_province: string | null;
      invoice_provider_api_key: string | null;
      invoice_counter: number;
    }[]
  >`select name, vat_number, fiscal_code, regime_fiscale, address, address_zip,
           address_city, address_province, invoice_provider_api_key, invoice_counter
    from venues where id = ${session.venue_id}`;

  if (
    !venue?.invoice_provider_api_key ||
    !venue.vat_number ||
    !venue.fiscal_code ||
    !venue.address ||
    !venue.address_zip ||
    !venue.address_city ||
    !venue.address_province
  ) {
    return NextResponse.json(
      { error: "Il locale non ha ancora configurato la fatturazione elettronica" },
      { status: 409 }
    );
  }

  const orderItems = await sql<
    { name: string; quantity: number; unit_price_cents: number; vat_rate: number }[]
  >`
    select mi.name, oi.quantity, oi.unit_price_cents, mi.vat_rate
    from order_items oi
    join orders o on o.id = oi.order_id
    join menu_items mi on mi.id = oi.menu_item_id
    where o.table_session_id = ${session.id}
      and o.status != 'cancelled' and oi.status != 'cancelled'`;

  if (orderItems.length === 0) {
    return NextResponse.json({ error: "Nessuna riga da fatturare" }, { status: 409 });
  }

  // Incremento atomico: la numerazione fattura non può avere duplicati,
  // il pattern read-then-write sarebbe una race condition su due richieste
  // concorrenti per lo stesso venue.
  const [{ invoice_counter: invoiceNumber }] = await sql<{ invoice_counter: number }[]>`
    update venues set invoice_counter = invoice_counter + 1
    where id = ${session.venue_id}
    returning invoice_counter`;

  const invoiceJson = buildFatturaPaJson({
    venue: {
      name: venue.name,
      vatNumber: venue.vat_number,
      fiscalCode: venue.fiscal_code,
      regimeFiscale: venue.regime_fiscale ?? "RF01",
      addressStreet: venue.address,
      addressZip: venue.address_zip,
      addressCity: venue.address_city,
      addressProvince: venue.address_province,
    },
    customer: body.customer,
    lines: orderItems.map((i) => ({
      description: i.name,
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
      vatRate: Number(i.vat_rate),
    })),
    invoiceNumber,
    invoiceDate: new Date(),
  });

  const client = invoicetronicClient(venue.invoice_provider_api_key);

  try {
    const { data } = await client.sendJsonPost(invoiceJson, true, "Auto", payment.id);

    await sql`
      insert into invoices (venue_id, payment_id, provider_invoice_id, status, sdi_identifier)
      values (${session.venue_id}, ${payment.id}, ${String(data.id)}, 'sent', ${data.identifier ?? null})`;

    return NextResponse.json({ status: "sent", invoiceId: data.id });
  } catch (err) {
    const message =
      err instanceof Error && "response" in err
        ? JSON.stringify((err as { response?: { data?: unknown } }).response?.data)
        : err instanceof Error
          ? err.message
          : "Errore invio fattura";

    await sql`
      insert into invoices (venue_id, payment_id, status)
      values (${session.venue_id}, ${payment.id}, 'rejected')`;

    return NextResponse.json({ error: "Invio fattura non riuscito", detail: message }, { status: 502 });
  }
}
