import { expect, test } from "@playwright/test";
import { buildFatturaPaJson, type CustomerData } from "../apps/guest/src/lib/invoice/fatturapa";

const venue = {
  name: "Locale Test",
  vatNumber: "12345678901",
  fiscalCode: "12345678901",
  regimeFiscale: "RF01",
  addressStreet: "Via Roma 1",
  addressZip: "00100",
  addressCity: "Roma",
  addressProvince: "RM",
};

function build(customer: CustomerData) {
  return buildFatturaPaJson({
    venue,
    customer,
    lines: [{ description: "Cena", quantity: 1, unitPriceCents: 1100, vatRate: 10 }],
    invoiceNumber: 42,
    invoiceDate: new Date("2026-09-03T12:00:00Z"),
  });
}

test("il cliente estero usa il destinatario SDI XXXXXXX", () => {
  const invoice = build({
    type: "estero",
    customerName: "Bistrot Exemple",
    countryCode: "fr",
    taxId: "FR123456789",
    email: "client@example.fr",
    addressStreet: "10 Rue Exemple",
    addressZip: "75001",
    addressCity: "Paris",
  });

  expect(invoice.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario).toBe("XXXXXXX");
  expect(invoice.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.IdFiscaleIVA).toEqual({
    IdPaese: "FR",
    IdCodice: "FR123456789",
  });
  expect(invoice.FatturaElettronicaHeader.CessionarioCommittente.Sede).toMatchObject({
    CAP: "00000",
    Comune: "Paris",
    Nazione: "FR",
  });
});

test("il codice destinatario italiano ha precedenza sulla PEC", () => {
  const invoice = build({
    type: "azienda",
    companyName: "Ristorante Test SRL",
    vatNumber: "IT12345678901",
    sdiCode: "abc1234",
    pec: "azienda@pec.example",
    email: "azienda@example.com",
    addressStreet: "Via Milano 2",
    addressZip: "20100",
    addressCity: "Milano",
    addressProvince: "mi",
  });

  expect(invoice.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario).toBe("ABC1234");
  expect(invoice.FatturaElettronicaHeader.DatiTrasmissione.PECDestinatario).toBeUndefined();
  expect(invoice.FatturaElettronicaHeader.CessionarioCommittente.Sede).toMatchObject({
    CAP: "20100",
    Provincia: "MI",
    Nazione: "IT",
  });
});
