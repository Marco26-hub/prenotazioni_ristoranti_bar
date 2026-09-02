/**
 * Costruttore JSON FatturaPA (tracciato v1.2.2, PascalCase — Invoicetronic
 * accetta questo formato su /send/json, stessi nomi campo dello schema XML
 * ufficiale). Copre il caso comune: vendita a cliente italiano privato o
 * azienda e a cliente estero, TD01, pagamento già saldato, prezzi IVA inclusa.
 *
 * ATTENZIONE: la numerazione fatture (progressivo) e il regime fiscale
 * vanno verificati con un commercialista prima dell'uso reale — qui è
 * implementato il caso standard, non ogni casistica fiscale possibile
 * (split payment, regime forfettario, fatture verso PA, ecc).
 */

export interface VenueFiscalData {
  name: string;
  vatNumber: string;
  fiscalCode: string;
  regimeFiscale: string;
  addressStreet: string;
  addressZip: string;
  addressCity: string;
  addressProvince: string;
}

export type CustomerData =
  | {
      type: "privato";
      firstName: string;
      lastName: string;
      fiscalCode: string;
      email: string;
      addressStreet: string;
      addressZip: string;
      addressCity: string;
      addressProvince: string;
      pec?: string;
    }
  | {
      type: "azienda";
      companyName: string;
      vatNumber: string;
      email: string;
      addressStreet: string;
      addressZip: string;
      addressCity: string;
      addressProvince: string;
      sdiCode?: string;
      pec?: string;
    }
  | {
      type: "estero";
      customerName: string;
      taxId: string;
      countryCode: string;
      email: string;
      addressStreet: string;
      addressZip: string;
      addressCity: string;
    };

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceCents: number; // IVA inclusa (prezzo menu)
  vatRate: number; // es. 10.00
}

export interface BuildInvoiceInput {
  venue: VenueFiscalData;
  customer: CustomerData;
  lines: InvoiceLine[];
  invoiceNumber: number;
  invoiceDate: Date; // usare la data del pagamento, non "adesso"
}

const money = (cents: number) => (cents / 100).toFixed(2);
const qty = (n: number) => n.toFixed(2);
const rate = (n: number) => n.toFixed(2);

/**
 * Scorpora IVA da un importo lordo in centesimi, arrotondando al centesimo.
 * Le righe si sommano già arrotondate (non si ricalcola dal totale di
 * gruppo) così DettaglioLinee e DatiRiepilogo restano coerenti tra loro.
 */
function splitVat(grossCents: number, vatRate: number) {
  const taxableCents = Math.round(grossCents / (1 + vatRate / 100));
  const vatCents = grossCents - taxableCents;
  return { taxableCents, vatCents };
}

export function buildFatturaPaJson(input: BuildInvoiceInput) {
  const { venue, customer, lines, invoiceNumber, invoiceDate } = input;

  const totalGrossCents = lines.reduce(
    (sum, l) => sum + Math.round(l.unitPriceCents * l.quantity),
    0
  );

  const detailLines = lines.map((line, i) => {
    const grossCents = Math.round(line.unitPriceCents * line.quantity);
    const { taxableCents } = splitVat(grossCents, line.vatRate);
    return {
      NumeroLinea: String(i + 1),
      Descrizione: line.description,
      Quantita: qty(line.quantity),
      PrezzoUnitario: money(Math.round(taxableCents / line.quantity)),
      PrezzoTotale: money(taxableCents),
      AliquotaIVA: rate(line.vatRate),
    };
  });

  const byRate = new Map<number, { taxableCents: number; vatCents: number }>();
  for (const line of lines) {
    const grossCents = Math.round(line.unitPriceCents * line.quantity);
    const { taxableCents, vatCents } = splitVat(grossCents, line.vatRate);
    const acc = byRate.get(line.vatRate) ?? { taxableCents: 0, vatCents: 0 };
    acc.taxableCents += taxableCents;
    acc.vatCents += vatCents;
    byRate.set(line.vatRate, acc);
  }

  const summary = Array.from(byRate.entries()).map(([vatRate, agg]) => ({
    AliquotaIVA: rate(vatRate),
    ImponibileImporto: money(agg.taxableCents),
    Imposta: money(agg.vatCents),
    EsigibilitaIVA: "I",
  }));

  const cessionarioAnagrafica =
    customer.type === "privato"
      ? { Nome: customer.firstName, Cognome: customer.lastName }
      : { Denominazione: customer.type === "azienda" ? customer.companyName : customer.customerName };

  const cessionarioIdFiscale =
    customer.type === "azienda"
      ? { IdFiscaleIVA: { IdPaese: "IT", IdCodice: customer.vatNumber.replace(/^IT/i, "").trim() } }
      : customer.type === "estero"
        ? { IdFiscaleIVA: { IdPaese: customer.countryCode.trim().toUpperCase(), IdCodice: customer.taxId.trim() } }
        : {};

  const cessionarioCodiceFiscale =
    customer.type === "privato" ? { CodiceFiscale: customer.fiscalCode } : {};

  const codiceDestinatario =
    customer.type === "estero"
      ? "XXXXXXX"
      : customer.type === "azienda" && customer.sdiCode
        ? customer.sdiCode.trim().toUpperCase()
        : "0000000";

  const pecDestinatario =
    customer.type !== "estero" && codiceDestinatario === "0000000" && customer.pec
      ? { PECDestinatario: customer.pec }
      : {};

  const sedeCessionario =
    customer.type === "estero"
      ? {
          Indirizzo: customer.addressStreet,
          CAP: "00000",
          Comune: customer.addressCity,
          Nazione: customer.countryCode.trim().toUpperCase(),
        }
      : {
          Indirizzo: customer.addressStreet,
          CAP: customer.addressZip,
          Comune: customer.addressCity,
          Provincia: customer.addressProvince.trim().toUpperCase(),
          Nazione: "IT",
        };

  return {
    FatturaElettronicaHeader: {
      DatiTrasmissione: {
        IdTrasmittente: { IdPaese: "IT", IdCodice: venue.vatNumber },
        ProgressivoInvio: String(invoiceNumber).padStart(5, "0"),
        FormatoTrasmissione: "FPR12",
        CodiceDestinatario: codiceDestinatario,
        ...pecDestinatario,
      },
      CedentePrestatore: {
        DatiAnagrafici: {
          IdFiscaleIVA: { IdPaese: "IT", IdCodice: venue.vatNumber },
          CodiceFiscale: venue.fiscalCode,
          Anagrafica: { Denominazione: venue.name },
          RegimeFiscale: venue.regimeFiscale,
        },
        Sede: {
          Indirizzo: venue.addressStreet,
          CAP: venue.addressZip,
          Comune: venue.addressCity,
          Provincia: venue.addressProvince,
          Nazione: "IT",
        },
      },
      CessionarioCommittente: {
        DatiAnagrafici: {
          ...cessionarioIdFiscale,
          ...cessionarioCodiceFiscale,
          Anagrafica: cessionarioAnagrafica,
        },
        Sede: sedeCessionario,
      },
    },
    FatturaElettronicaBody: {
      DatiGenerali: {
        DatiGeneraliDocumento: {
          TipoDocumento: "TD01",
          Divisa: "EUR",
          Data: invoiceDate.toISOString().slice(0, 10),
          Numero: String(invoiceNumber),
          ImportoTotaleDocumento: money(totalGrossCents),
        },
      },
      DatiBeniServizi: {
        DettaglioLinee: detailLines,
        DatiRiepilogo: summary,
      },
      DatiPagamento: [
        {
          CondizioniPagamento: "TP02",
          DettaglioPagamento: [
            { ModalitaPagamento: "MP08", ImportoPagamento: money(totalGrossCents) },
          ],
        },
      ],
    },
  };
}
