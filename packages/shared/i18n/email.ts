import { dizionario, type Speculare } from "./index";

/**
 * Le email che partono senza che il cliente sia collegato.
 *
 * Il promemoria del giorno prima lo manda un cron alle nove del mattino: non
 * c'è una richiesta, non c'è un header, non c'è un cookie. La lingua arriva
 * dalla riga della prenotazione, salvata quando il cliente ha compilato il
 * modulo — è l'unico posto dove sopravvive.
 *
 * Le email scritte mentre il cliente c'è (conferma immediata, disdetta)
 * stanno nei dizionari delle rotte che le mandano: lì la lingua si legge
 * dalla richiesta e non serve passare da qui.
 */

const IT = {
  "promemoria.oggetto": "Domani ti aspettiamo — {locale}",
  "promemoria.saluto": "Ciao {nome},",
  "promemoria.corpo": "un promemoria: domani hai un tavolo da {locale}.",
  "promemoria.quando": "Quando: {quando}",
  "promemoria.persone": "Persone: {persone}",
  "promemoria.telefono": "Se cambia qualcosa chiamaci al {telefono}.",
  "promemoria.rispondi": "Se cambia qualcosa rispondi a questa email.",
  "promemoria.disdetta.1": "Se non riesci a venire, disdici da qui: ci vuole un momento e",
  "promemoria.disdetta.2": "il tavolo torna disponibile per qualcun altro.",

  // Fattura di cortesia. "Sistema di Interscambio" non si traduce: è il nome
  // dell'infrastruttura dell'Agenzia delle Entrate, ed è quello che compare
  // sui documenti che il cliente ha in mano.
  "fattura.oggetto": "Fattura {numero} — {locale}",
  "fattura.saluto": "Ciao {nome},",
  "fattura.trasmessa":
    "la fattura {numero} del {locale} è stata trasmessa al Sistema di Interscambio.",
  "fattura.allegato": "Trovi il documento XML allegato.",
  "fattura.canale": "Il documento sarà recapitato tramite il canale fiscale indicato.",
  "fattura.identificativo": "Identificativo Invoicetronic: {id}",
  "fattura.cortesia": "Questa email è una copia di cortesia della trasmissione.",

  // Ricevuta di cortesia. "Documento di cortesia non fiscale" è la dicitura
  // che la distingue dallo scontrino: va detta in tutte e due le lingue,
  // perché è quella che evita che il cliente la porti in detrazione.
  "ricevuta.titolo": "Ricevuta di pagamento",
  "ricevuta.tavolo": "Tavolo {codice}",
  "ricevuta.piatti": "Piatti e bevande",
  "ricevuta.supplementi": "Coperto e servizio",
  "ricevuta.mancia": "Mancia",
  "ricevuta.pagato": "Pagato",
  "ricevuta.metodo": "Pagamento effettuato con {metodi}. Documento di cortesia non fiscale.",
  "ricevuta.stampa": "Stampa o salva in PDF",
  "ricevuta.metodo.carta": "Carta",
  "ricevuta.metodo.contanti": "Contanti",
  "ricevuta.in_corso":
    "Il pagamento è ancora in elaborazione. Riprova tra pochi secondi.",
  "ricevuta.non_trovata": "Sessione non trovata",
  "ricevuta.troppe": "Troppe richieste",

  // Avviso al LOCALE, non al cliente: va nella lingua che il locale ha
  // dichiarato per sé, perché non c'è un utente collegato da cui dedurla.
  "disdetta.locale.oggetto": "Disdetta — {nome}, {persone}p, {quando}",
  "disdetta.locale.testo": "Una prenotazione è stata disdetta dal cliente.",
  "disdetta.locale.nome": "Nome: {nome}",
  "disdetta.locale.persone": "Persone: {persone}",
  "disdetta.locale.quando": "Quando era: {quando}",
  "disdetta.locale.libero": "Il tavolo è tornato libero ed è di nuovo prenotabile.",
};

const EN: Speculare<typeof IT> = {
  "promemoria.oggetto": "See you tomorrow — {locale}",
  "promemoria.saluto": "Hello {nome},",
  "promemoria.corpo": "a reminder: you have a table at {locale} tomorrow.",
  "promemoria.quando": "When: {quando}",
  "promemoria.persone": "Guests: {persone}",
  "promemoria.telefono": "If anything changes, call us on {telefono}.",
  "promemoria.rispondi": "If anything changes, just reply to this email.",
  "promemoria.disdetta.1": "Can't make it? Cancel here — it takes a moment and",
  "promemoria.disdetta.2": "frees the table for someone else.",

  "fattura.oggetto": "Invoice {numero} — {locale}",
  "fattura.saluto": "Hello {nome},",
  "fattura.trasmessa":
    "invoice {numero} from {locale} has been filed with the Sistema di Interscambio, the Italian Revenue Agency's e-invoicing system.",
  "fattura.allegato": "The XML document is attached.",
  "fattura.canale": "The document will be delivered through the tax channel you provided.",
  "fattura.identificativo": "Invoicetronic reference: {id}",
  "fattura.cortesia": "This email is a courtesy copy of the filing.",

  "ricevuta.titolo": "Payment receipt",
  "ricevuta.tavolo": "Table {codice}",
  "ricevuta.piatti": "Food and drinks",
  "ricevuta.supplementi": "Cover and service charge",
  "ricevuta.mancia": "Tip",
  "ricevuta.pagato": "Paid",
  "ricevuta.metodo":
    "Paid by {metodi}. Courtesy document — this is not an official tax receipt.",
  "ricevuta.stampa": "Print or save as PDF",
  "ricevuta.metodo.carta": "Card",
  "ricevuta.metodo.contanti": "Cash",
  "ricevuta.in_corso": "The payment is still being processed. Try again in a few seconds.",
  "ricevuta.non_trovata": "Session not found",
  "ricevuta.troppe": "Too many requests",

  "disdetta.locale.oggetto": "Cancellation — {nome}, {persone} guests, {quando}",
  "disdetta.locale.testo": "A guest has cancelled their booking.",
  "disdetta.locale.nome": "Name: {nome}",
  "disdetta.locale.persone": "Guests: {persone}",
  "disdetta.locale.quando": "It was for: {quando}",
  "disdetta.locale.libero": "The table is free again and open for bookings.",
};

export const tEmail = dizionario(IT, EN);
