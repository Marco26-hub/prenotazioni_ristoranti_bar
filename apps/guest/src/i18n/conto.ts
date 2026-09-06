import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Le parole del conto: il momento in cui si pagano soldi veri.
 *
 * Qui una parola ambigua non fa una brutta figura, fa una discussione al
 * tavolo. Per questo l'inglese è esplicito su chi paga cosa — "Pay your
 * share" contro "Pay the whole bill" — e usa i nomi che il turista trova sul
 * conto di un ristorante: "cover charge" per il coperto, "service charge"
 * per il servizio, "set menu" per la formula.
 *
 * Le voci fiscali (scontrino, fattura elettronica, SdI, PEC, codice
 * destinatario) restano riconoscibili anche in inglese: chi le deve
 * compilare le cerca con il nome italiano, che è quello che il
 * commercialista gli ha dato.
 */

const IT = {
  // Il conto
  "conto.titolo": "Il conto",
  "conto.saldato": "Conto saldato, grazie!",
  "conto.ricevuta": "Ricevuta di pagamento",
  "conto.ricevuta.nota":
    "La ricevuta di pagamento non sostituisce lo scontrino fiscale. Per la fattura elettronica inserisci i dati fiscali.",
  "conto.recensione": "Lascia una recensione",
  "conto.fermo":
    "Il conto non si sta aggiornando: quello che vedi potrebbe non essere l'importo corrente. Controlla la connessione, o chiedi al personale.",
  // A prezzo fisso il conto è coperti × prezzo, e i coperti li dichiara la
  // sala. Finché non l'ha fatto non c'è un importo da mostrare: dirlo è
  // meglio che mostrarne uno sbagliato e farci pagare sopra.
  "conto.coperti_da_confermare":
    "Il totale lo conferma il personale: al prezzo fisso serve sapere in quanti siete a tavolo. Puoi continuare a ordinare — per pagare, chiama il cameriere.",
  // Quando il tavolo ha già risposto: il numero c'è, manca solo la conferma.
  "conto.coperti_provvisori":
    "Totale provvisorio, calcolato sui coperti che avete dichiarato. Il personale lo conferma quando passa; per pagare con carta serve quella conferma.",

  // Formula a prezzo fisso
  "formula.pranzo": "Formula pranzo",
  "formula.cena": "Formula cena",
  "formula.bambini.uno": "{n} bambino",
  "formula.bambini.molti": "{n} bambini",
  "formula.supplemento": "Supplemento per l'avanzato",
  "formula.compresi":
    "I piatti della formula sono compresi. Dolci, caffè, amari, bevande e le voci segnate come extra si pagano a parte e li trovi qui sotto.",

  // Pagamento
  "pagamento.non_attivo":
    "Il pagamento con carta non è attivo in questo locale: si paga in contanti al tavolo.",
  "pagamento.tutto": "Pago tutto",
  "pagamento.mia_parte": "Pago solo i miei piatti",
  "pagamento.carta": "Paga con carta — {importo}",
  "pagamento.satispay": "Paga con Satispay — {importo}",
  "pagamento.satispay.intero":
    "Satispay al momento accetta solo il pagamento dell'intero conto.",
  "pagamento.elaborazione": "Elaborazione...",
  "pagamento.conferma": "Conferma pagamento",

  // Mancia
  "mancia.etichetta": "Mancia per il personale",
  "mancia.nessuna": "Nessuna",
  "mancia.suggerita": "· più scelta",

  // Contanti
  "contanti.paga": "Pago in contanti",
  "contanti.titolo": "Paghi al tavolo in contanti",
  "contanti.documento": "Cosa ti serve",
  "contanti.scontrino": "Scontrino",
  "contanti.fattura": "Fattura",
  "contanti.chiamo": "Chiamo…",
  "contanti.chiama": "Chiama il cameriere",
  "contanti.torna": "Torna ai pagamenti",

  // Fattura elettronica
  "fattura.richiedi": "Richiedi fattura",
  "fattura.inviata": "Fattura trasmessa al Sistema di Interscambio.",
  "fattura.inviata.email": " La copia è stata inviata anche via email.",
  "fattura.inviata.email_no":
    " Il recapito fiscale resta attivo anche se la copia email non è partita.",
  "fattura.intestatario": "Intestatario",
  "fattura.privato": "Privato",
  "fattura.azienda": "Azienda",
  "fattura.estero": "Estero",
  "fattura.sede": "Sede di fatturazione",
  "fattura.privacy":
    "I dati saranno usati per emettere e recapitare la fattura elettronica.",
  "fattura.privacy.link": "Informativa privacy",
  "fattura.invio": "Invio...",
  "fattura.invia": "Invia richiesta fattura",

  // Campi della fattura
  "campo.nome": "Nome",
  "campo.cognome": "Cognome",
  "campo.codice_fiscale": "Codice fiscale",
  "campo.ragione_sociale": "Ragione sociale",
  "campo.partita_iva": "Partita IVA",
  "campo.codice_destinatario": "Codice destinatario",
  "campo.codice_destinatario.esempio": "7 caratteri",
  "campo.nome_o_ragione_sociale": "Nome o ragione sociale",
  "campo.paese": "Paese (codice ISO)",
  "campo.identificativo_estero": "Identificativo fiscale estero",
  "campo.indirizzo": "Indirizzo",
  "campo.cap": "CAP",
  "campo.codice_postale": "Codice postale",
  "campo.citta": "Città",
  "campo.provincia": "Prov.",
  "campo.email_copia": "Email per la copia",
  "campo.pec.azienda": "PEC (alternativa al codice destinatario)",
  "campo.pec.privato": "PEC (facoltativa)",

  // Errori
  "errore.chiamata": "Non riesco a chiamare il personale",
  "errore.chiamata.rete": "Nessuna connessione: chiama il personale a voce",
  "errore.pagamento": "Errore avvio pagamento",
  "errore.pagamento.satispay": "Errore avvio pagamento Satispay",
  "errore.pagamento.fallito": "Pagamento non riuscito",
  "errore.fattura": "Errore invio fattura",
};

const EN: Speculare<typeof IT> = {
  "conto.titolo": "Your bill",
  "conto.saldato": "Bill settled, thank you!",
  "conto.ricevuta": "Payment receipt",
  "conto.ricevuta.nota":
    "This payment receipt does not replace the official tax receipt. For an electronic invoice, enter your tax details.",
  "conto.recensione": "Leave a review",
  "conto.fermo":
    "The bill is not updating: the amount you see may not be the current one. Check your connection, or ask a member of staff.",
  "conto.coperti_da_confermare":
    "Staff will confirm the total: the set menu is priced per person, so we need to know how many of you are at the table. Keep ordering — to pay, call a waiter.",
  "conto.coperti_provvisori":
    "Provisional total, based on the cover count you gave. Staff will confirm it when they come by; card payment needs that confirmation.",

  "formula.pranzo": "Lunch set menu",
  "formula.cena": "Dinner set menu",
  "formula.bambini.uno": "{n} child",
  "formula.bambini.molti": "{n} children",
  "formula.supplemento": "Surcharge for uneaten food",
  "formula.compresi":
    "The dishes on the set menu are included. Desserts, coffee, digestifs, drinks and anything marked as extra are charged separately and are listed below.",

  "pagamento.non_attivo":
    "Card payment is not available at this restaurant: you pay cash at the table.",
  "pagamento.tutto": "Pay the whole bill",
  "pagamento.mia_parte": "Pay your share",
  "pagamento.carta": "Pay by card — {importo}",
  "pagamento.satispay": "Pay with Satispay — {importo}",
  "pagamento.satispay.intero":
    "Satispay currently accepts payment of the whole bill only.",
  "pagamento.elaborazione": "Processing...",
  "pagamento.conferma": "Confirm payment",

  "mancia.etichetta": "Tip for the staff",
  "mancia.nessuna": "No tip",
  "mancia.suggerita": "· most chosen",

  "contanti.paga": "Pay cash",
  "contanti.titolo": "Paying cash at the table",
  "contanti.documento": "What do you need",
  "contanti.scontrino": "Receipt",
  "contanti.fattura": "Invoice",
  "contanti.chiamo": "Calling…",
  "contanti.chiama": "Call the waiter",
  "contanti.torna": "Back to payment options",

  "fattura.richiedi": "Request an invoice",
  "fattura.inviata":
    "Invoice sent to the Italian Revenue Agency's exchange system (SdI).",
  "fattura.inviata.email": " A copy has also been sent by email.",
  "fattura.inviata.email_no":
    " The invoice has still been filed for tax purposes, even though the email copy did not go out.",
  "fattura.intestatario": "Billed to",
  "fattura.privato": "Individual",
  "fattura.azienda": "Company",
  "fattura.estero": "Outside Italy",
  "fattura.sede": "Billing address",
  "fattura.privacy":
    "Your details will be used to issue and deliver the electronic invoice.",
  "fattura.privacy.link": "Privacy notice",
  "fattura.invio": "Sending...",
  "fattura.invia": "Send invoice request",

  "campo.nome": "First name",
  "campo.cognome": "Surname",
  "campo.codice_fiscale": "Italian tax code (codice fiscale)",
  "campo.ragione_sociale": "Registered company name",
  "campo.partita_iva": "VAT number",
  "campo.codice_destinatario": "SdI recipient code",
  "campo.codice_destinatario.esempio": "7 characters",
  "campo.nome_o_ragione_sociale": "Name or company name",
  "campo.paese": "Country (ISO code)",
  "campo.identificativo_estero": "Foreign tax identification number",
  "campo.indirizzo": "Street address",
  "campo.cap": "Postcode",
  "campo.codice_postale": "Postcode",
  "campo.citta": "Town or city",
  "campo.provincia": "Prov.",
  "campo.email_copia": "Email for your copy",
  "campo.pec.azienda": "PEC certified email (instead of the SdI code)",
  "campo.pec.privato": "PEC certified email (optional)",

  "errore.chiamata": "Cannot call the staff right now",
  "errore.chiamata.rete": "No connection: please call a member of staff yourself",
  "errore.pagamento": "Could not start the payment",
  "errore.pagamento.satispay": "Could not start the Satispay payment",
  "errore.pagamento.fallito": "Payment unsuccessful",
  "errore.fattura": "Could not send the invoice request",
};

export const tConto = dizionario(IT, EN);
