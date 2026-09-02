import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientIp } from "@repo/shared/rate-limit";
import { decryptSecret } from "@repo/shared/crypto";
import { buildFatturaPaJson, type CustomerData } from "@/lib/invoice/fatturapa";
import { invoicetronicClient } from "@/lib/invoice/invoicetronic-client";

interface InvoiceRequestBody {
  sessionId: string;
  customer: CustomerData;
}

function isValidCustomer(customer: CustomerData): boolean {
  if (customer.type === "privato") {
    return Boolean(
      customer.firstName?.trim() && customer.lastName?.trim() && customer.fiscalCode?.trim()
    );
  }
  return Boolean(customer.companyName?.trim() && customer.vatNumber?.trim());
}

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(`invoices:${clientIp(request)}`, 5, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as InvoiceRequestBody | null;
  if (!body?.sessionId || !body.customer || !isValidCustomer(body.customer)) {
    return NextResponse.json({ error: "Dati cliente incompleti" }, { status: 400 });
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

  // Idempotenza: un pagamento ha al massimo una fattura (vincolo unique
  // su invoices.payment_id). Se è già stata trasmessa con successo,
  // ritorna quella — mai una seconda chiamata reale a SDI per retry/doppio click.
  const [existing] = await sql<
    { id: string; status: string; invoice_number: number | null; provider_invoice_id: string | null }[]
  >`select id, status, invoice_number, provider_invoice_id from invoices where payment_id = ${payment.id}`;

  if (existing && (existing.status === "sent" || existing.status === "delivered")) {
    return NextResponse.json({ status: existing.status, invoiceId: existing.provider_invoice_id });
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
    }[]
  >`select name, vat_number, fiscal_code, regime_fiscale, address, address_zip,
           address_city, address_province, invoice_provider_api_key
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

  // La riga invoices va scritta PRIMA di chiamare il provider esterno: se
  // la trasmissione riesce ma qualcosa fallisce dopo, resta comunque
  // traccia (stato 'pending' con il numero già assegnato) invece di una
  // fattura realmente inviata a SDI ma invisibile nel nostro DB.
  let invoiceRowId: string;
  let invoiceNumber: number;

  if (existing) {
    invoiceRowId = existing.id;
    if (existing.invoice_number) {
      invoiceNumber = existing.invoice_number;
    } else {
      const [{ invoice_counter }] = await sql<{ invoice_counter: number }[]>`
        update venues set invoice_counter = invoice_counter + 1
        where id = ${session.venue_id} returning invoice_counter`;
      invoiceNumber = invoice_counter;
      await sql`update invoices set invoice_number = ${invoiceNumber} where id = ${invoiceRowId}`;
    }
  } else {
    const [{ invoice_counter }] = await sql<{ invoice_counter: number }[]>`
      update venues set invoice_counter = invoice_counter + 1
      where id = ${session.venue_id} returning invoice_counter`;
    invoiceNumber = invoice_counter;

    const [row] = await sql<{ id: string }[]>`
      insert into invoices (venue_id, payment_id, invoice_number, status)
      values (${session.venue_id}, ${payment.id}, ${invoiceNumber}, 'pending')
      returning id`;
    invoiceRowId = row.id;
  }

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

  const client = invoicetronicClient(decryptSecret(venue.invoice_provider_api_key));

  try {
    // Idempotency-Key stabile sul payment: anche se questa route viene
    // richiamata più volte (retry client, doppio submit), Invoicetronic
    // ritorna la risposta della prima trasmissione invece di inviare due
    // volte la stessa fattura a SDI.
    const { data } = await client.sendJsonPost(invoiceJson, true, "Auto", payment.id);

    await sql`
      update invoices set status = 'sent', provider_invoice_id = ${String(data.id)},
        sdi_identifier = ${data.identifier ?? null}
      where id = ${invoiceRowId}`;

    return NextResponse.json({ status: "sent", invoiceId: data.id });
  } catch (err) {
    console.error(`[invoices] invio fallito per payment ${payment.id}:`, err);

    await sql`update invoices set status = 'rejected' where id = ${invoiceRowId}`;

    const detail =
      err instanceof Error && "response" in err
        ? JSON.stringify((err as { response?: { data?: unknown } }).response?.data)
        : err instanceof Error
          ? err.message
          : "Errore invio fattura";

    return NextResponse.json({ error: "Invio fattura non riuscito", detail }, { status: 502 });
  }
}
