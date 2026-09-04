import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { decryptSecret } from "@repo/shared/crypto";
import { buildFatturaPaJson, type CustomerData } from "@/lib/invoice/fatturapa";
import { invoicetronicClient } from "@/lib/invoice/invoicetronic-client";
import { inviaEmail } from "@repo/shared/email";
import { messaggioErrore } from "@repo/shared/errori";
import { contoSessione } from "@repo/shared/conto";

interface InvoiceRequestBody {
  sessionId: string;
  customer: CustomerData;
}

function isValidCustomer(customer: CustomerData): boolean {
  const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const common =
    validEmail(customer.email ?? "") &&
    Boolean(customer.addressStreet?.trim() && customer.addressZip?.trim() && customer.addressCity?.trim());

  if (customer.type === "privato") {
    return common && Boolean(
      customer.firstName?.trim() &&
      customer.lastName?.trim() &&
      /^[A-Z0-9]{16}$/i.test(customer.fiscalCode?.trim()) &&
      /^\d{5}$/.test(customer.addressZip?.trim()) &&
      /^[A-Z]{2}$/i.test(customer.addressProvince?.trim()) &&
      (!customer.pec || validEmail(customer.pec))
    );
  }
  if (customer.type === "azienda") {
    return common && Boolean(
      customer.companyName?.trim() &&
      /^\d{11}$/.test(customer.vatNumber?.replace(/^IT/i, "").trim()) &&
      /^\d{5}$/.test(customer.addressZip?.trim()) &&
      /^[A-Z]{2}$/i.test(customer.addressProvince?.trim()) &&
      (!customer.sdiCode || /^[A-Z0-9]{7}$/i.test(customer.sdiCode.trim())) &&
      (!customer.pec || validEmail(customer.pec))
    );
  }
  if (customer.type === "estero") {
    return common && Boolean(
      customer.customerName?.trim() &&
      customer.taxId?.trim() &&
      customer.taxId.trim().length <= 28 &&
      /^[A-Z]{2}$/i.test(customer.countryCode?.trim()) &&
      customer.countryCode.trim().toUpperCase() !== "IT"
    );
  }
  return false;
}

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(clientKey(request, "invoices"), 5, 60);
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
    { id: string; status: string; invoice_number: number | null; provider_invoice_id: string | null; emailed_at: Date | null }[]
  >`select id, status, invoice_number, provider_invoice_id, emailed_at from invoices where payment_id = ${payment.id}`;

  if (existing && (existing.status === "sent" || existing.status === "delivered")) {
    return NextResponse.json({ status: existing.status, invoiceId: existing.provider_invoice_id, emailSent: Boolean(existing.emailed_at) });
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
      service_vat_rate: string;
    }[]
  >`select name, vat_number, fiscal_code, regime_fiscale, address, address_zip,
           address_city, address_province, invoice_provider_api_key,
           service_vat_rate
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

  /*
   * Le righe della fattura sono quelle del conto, non la somma dei piatti.
   *
   * Su un tavolo a prezzo fisso la query di prima prendeva tutte le voci a
   * listino: una formula da quattro persone a trenta euro produceva una
   * fattura da duecentottanta euro di piatti — un imponibile trasmesso allo
   * SDI che il cliente non ha mai pagato, mentre i centoventi realmente
   * incassati non comparivano da nessuna parte.
   */
  const conto = await contoSessione(sql, session.id);

  if (!conto.haOrdinato) {
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

  /*
   * Coperto e servizio vanno in fattura come tutto il resto.
   *
   * Il documento si costruiva dalle sole righe dei piatti, mentre il conto
   * incassa anche questi: la fattura dichiarava meno di quanto il cliente
   * aveva pagato, e la differenza non era un arrotondamento — quattro
   * coperti da due euro con il dieci per cento di servizio su un conto da
   * cento fanno diciotto euro non dichiarati.
   *
   * L'aliquota è quella impostata dal locale, perché non è una decisione che
   * spetta al programma: il coperto segue di norma l'aliquota della
   * somministrazione, ma il caso concreto lo stabilisce il commercialista.
   */
  const ivaSupplementi = Number(venue.service_vat_rate ?? 10);

  const righeFattura = conto.righe.map((r) => ({
    description: r.nome,
    quantity: r.quantita,
    unitPriceCents: r.prezzoUnitarioCents,
    vatRate: r.ivaPercent,
  }));

  /*
   * La formula è una riga come le altre, con la sua aliquota.
   *
   * Senza, il documento dichiarava meno di quanto incassato — e con la
   * formula la differenza è l'intero pasto, non un arrotondamento.
   */
  if (conto.aFormula) {
    if (conto.adulti > 0) {
      righeFattura.push({
        description: `Formula ${conto.fascia}`,
        quantity: conto.adulti,
        unitPriceCents: conto.formulaUnitarioCents,
        vatRate: ivaSupplementi,
      });
    }
    if (conto.bambini > 0) {
      const prezzo = conto.formulaBambinoCents ?? conto.formulaUnitarioCents;
      if (prezzo > 0) {
        righeFattura.push({
          description: `Formula ${conto.fascia} — bambini`,
          quantity: conto.bambini,
          unitPriceCents: prezzo,
          vatRate: ivaSupplementi,
        });
      }
    }
    if (conto.supplementoCents > 0) {
      righeFattura.push({
        description: "Supplemento per l'avanzato",
        quantity: 1,
        unitPriceCents: conto.supplementoCents,
        vatRate: ivaSupplementi,
      });
    }
  }

  if (conto.copertoTotaleCents > 0) {
    righeFattura.push({
      description: conto.etichettaCoperto,
      quantity: conto.coperti,
      unitPriceCents: conto.copertoUnitarioCents,
      vatRate: ivaSupplementi,
    });
  }

  if (conto.servizioCents > 0) {
    righeFattura.push({
      description: `Servizio ${conto.servizioPercent}%`,
      quantity: 1,
      unitPriceCents: conto.servizioCents,
      vatRate: ivaSupplementi,
    });
  }

  if (righeFattura.length === 0) {
    return NextResponse.json({ error: "Nessuna riga da fatturare" }, { status: 409 });
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
    lines: righeFattura,
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
        sdi_identifier = ${data.identifier ?? null},
        customer_first_name = ${body.customer.type === "privato" ? body.customer.firstName : null},
        customer_last_name = ${body.customer.type === "privato" ? body.customer.lastName : null},
        customer_company_name = ${body.customer.type === "azienda" ? body.customer.companyName : body.customer.type === "estero" ? body.customer.customerName : null},
        customer_fiscal_code = ${body.customer.type === "privato" ? body.customer.fiscalCode : null},
        customer_vat_number = ${body.customer.type === "azienda" ? body.customer.vatNumber : null},
        customer_email = ${body.customer.email},
        customer_type = ${body.customer.type},
        customer_sdi_code = ${body.customer.type === "azienda" ? body.customer.sdiCode ?? null : body.customer.type === "estero" ? "XXXXXXX" : null},
        customer_pec = ${body.customer.type !== "estero" ? body.customer.pec ?? null : null},
        customer_country_code = ${body.customer.type === "estero" ? body.customer.countryCode : "IT"},
        customer_tax_id = ${body.customer.type === "estero" ? body.customer.taxId : null},
        customer_address = ${body.customer.addressStreet},
        customer_zip = ${body.customer.addressZip},
        customer_city = ${body.customer.addressCity},
        customer_province = ${body.customer.type !== "estero" ? body.customer.addressProvince : null}
      where id = ${invoiceRowId}`;

    const recipientName = body.customer.type === "privato"
      ? `${body.customer.firstName} ${body.customer.lastName}`
      : body.customer.type === "azienda" ? body.customer.companyName : body.customer.customerName;

    let xmlBase64: string | null = null;
    try {
      const document = await client.sendIdGet(Number(data.id), true);
      const payload = document.data.payload;
      xmlBase64 = document.data.encoding === "Base64"
        ? payload
        : Buffer.from(payload, "utf8").toString("base64");
    } catch (documentError) {
      console.warn(
        `[invoices] XML non ancora disponibile per ${String(data.id)}: ${messaggioErrore(documentError)}`
      );
    }

    const emailResult = await inviaEmail({
      a: body.customer.email,
      oggetto: `Fattura ${invoiceNumber} — ${venue.name}`,
      testo: `Ciao ${recipientName},\n\nla fattura ${invoiceNumber} del ${venue.name} è stata trasmessa al Sistema di Interscambio.${xmlBase64 ? " Trovi il documento XML allegato." : " Il documento sarà recapitato tramite il canale fiscale indicato."}\nIdentificativo Invoicetronic: ${String(data.id)}\n\nQuesta email è una copia di cortesia della trasmissione.`,
      ...(xmlBase64
        ? {
            allegati: [{
              nomeFile: `fattura-${invoiceNumber}.xml`,
              contenutoBase64: xmlBase64,
              contentType: "application/xml",
            }],
          }
        : {}),
    });
    if (emailResult.inviata) {
      await sql`update invoices set emailed_at = now() where id = ${invoiceRowId}`;
    } else {
      console.warn(`[invoices] copia email non inviata per payment ${payment.id}: ${emailResult.errore}`);
    }

    return NextResponse.json({ status: "sent", invoiceId: data.id, emailSent: emailResult.inviata });
  } catch (err) {
    console.error(
      `[invoices] invio fallito per payment ${payment.id}: ${messaggioErrore(err)}`
    );

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
