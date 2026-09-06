import {
  COOKIE_LINGUA,
  dizionario,
  scegliLinguaUI,
  type LinguaUI,
  type Speculare,
} from "@repo/shared/i18n";

/**
 * Le risposte delle rotte pubbliche, nella lingua di chi ha inquadrato il QR.
 *
 * Sono i messaggi che il cliente legge quando qualcosa non è andato: tavolo
 * non trovato, conto già pagato, attesa fra un'ordinazione e la successiva.
 * Prima erano italiani fissi, quindi un turista con l'interfaccia in inglese
 * riceveva un errore in italiano proprio nel momento in cui aveva più
 * bisogno di capire.
 *
 * Le email al *locale* restano dove sono e restano in italiano: le legge il
 * ristoratore, non il cliente. Qui c'è solo quello che arriva al cliente.
 */

const IT = {
  // Errori comuni a più rotte
  "errore.troppe_richieste_riprova": "Troppe richieste, riprova tra poco",
  "errore.troppe_richieste": "Troppe richieste",
  "errore.richiesta_non_valida": "Richiesta non valida",
  "errore.payload_non_valido": "Payload non valido",
  "errore.sessione_id_mancante": "sessionId mancante",
  "coperti.errore.numero": "Numero di coperti non valido.",
  "coperti.errore.non_possibile":
    "Non è possibile cambiare i coperti su questo tavolo. Dillo al personale.",
  "errore.sessione_tavolo_non_valida": "Sessione tavolo non valida",
  "errore.sessione_non_valida": "Sessione non valida",
  "errore.locale_non_trovato": "Locale non trovato",

  // Ordine dal tavolo
  "ordine.errore.righe_non_valide": "Righe ordine non valide",
  "ordine.errore.non_attivo":
    "Ordine dal tavolo non attivo per questo locale — chiedi al personale",
  "ordine.errore.piatto_non_trovato": "Piatto non trovato",
  "ordine.errore.piatto_non_disponibile": "Piatto non disponibile",
  // Intervallo fra un'ordinazione e la successiva: al singolare la frase
  // italiana non contiene il numero, ed è giusto che non lo contenga.
  "ordine.attesa.uno": "Ancora un minuto e puoi ordinare di nuovo.",
  "ordine.attesa.molti": "Puoi ordinare di nuovo fra {n} minuti.",

  // Prenotazione
  "prenotazione.errore.campi_mancanti": "Compila nome, data e ora",
  "prenotazione.errore.troppe":
    "Troppe prenotazioni dallo stesso dispositivo. Riprova più tardi o chiamaci.",
  "prenotazione.errore.coperti_max":
    "Indica da 1 a {max} persone. Per gruppi più grandi chiamaci.",
  "prenotazione.errore.recapito":
    "Lascia un telefono o un'email: servono per confermarti il tavolo",
  "prenotazione.errore.non_attiva":
    "Prenotazione online non attiva per questo locale — chiama il ristorante",
  "prenotazione.errore.data_non_valida": "Data non valida",
  "prenotazione.errore.data_passata": "La data è già passata",
  "prenotazione.errore.data_lontana": "Data troppo lontana — controlla l'anno",
  "prenotazione.errore.pieno":
    "Per {orario} non abbiamo più posto per {persone} persone.",
  "prenotazione.errore.nessun_tavolo":
    "Non c'è un tavolo libero adatto per {persone} persone in questo orario.",
  "prenotazione.messaggio.confermata": "Tavolo confermato per {quando}.",
  "prenotazione.messaggio.in_attesa":
    "Richiesta inviata per {quando}. {locale} ti risponde a breve.",

  // Email al cliente che ha prenotato
  "prenotazione.email.oggetto.confermata": "Prenotazione confermata — {locale}",
  "prenotazione.email.oggetto.richiesta": "Richiesta ricevuta — {locale}",
  "prenotazione.email.saluto": "Ciao {nome},",
  "prenotazione.email.confermata": "la tua prenotazione da {locale} è confermata.",
  "prenotazione.email.in_attesa":
    "abbiamo ricevuto la tua richiesta per {locale}. Non è ancora una prenotazione: il locale ti risponde a breve, e ti arriva un'altra email.",
  "prenotazione.email.quando": "Quando: {quando}",
  "prenotazione.email.persone": "Persone: {persone}",
  "prenotazione.email.tavolo": "Tavolo: {tavoli}",
  "prenotazione.email.richieste": "Richieste: {note}",
  "prenotazione.email.cambio.telefono": "Se qualcosa cambia, chiamaci al {telefono}.",
  "prenotazione.email.cambio.email":
    "Se qualcosa cambia, faccelo sapere rispondendo a questa email.",
  "prenotazione.email.disdetta":
    "Se non puoi più venire, disdici da qui — ci vuole un momento e il\ntavolo torna disponibile per qualcun altro:",

  // Disdetta
  "disdetta.errore.link_non_valido": "Link non valido",
  "disdetta.errore.troppi_tentativi": "Troppi tentativi",
  "disdetta.errore.non_disdicibile": "Prenotazione non disdicibile",

  // Recensione dal tavolo
  "recensione.errore.gia_lasciata": "Hai già lasciato la tua opinione. Grazie!",
  "recensione.errore.nessun_servizio": "Nessun servizio recente a questo tavolo",

  // Chiamata dal tavolo
  "chiamata.errore.gia_chiamato": "Hai già chiamato. Il personale sta arrivando.",
  "chiamata.errore.documento_non_valido": "Documento non valido",
  "chiamata.errore.nessun_tavolo": "Nessun tavolo aperto: chiedi al personale",
  "chiamata.messaggio.contanti": "Il personale sta arrivando al tavolo per l'incasso.",
  "chiamata.messaggio.arrivo": "Il personale sta arrivando.",

  // Pagamento
  "pagamento.errore.non_attivo":
    "Pagamento dal tavolo non attivo per questo locale — chiedi al personale",
  "pagamento.errore.coperti_da_confermare":
    "Il personale deve confermare in quanti siete prima che si possa pagare il prezzo fisso. Chiama il cameriere: ci vuole un momento.",
  "pagamento.errore.locale_non_abilitato": "Locale non ancora abilitato ai pagamenti",
  "pagamento.errore.satispay_non_abilitato": "Locale non ancora abilitato a Satispay",
  "pagamento.errore.non_disponibile":
    "Pagamento online non disponibile al momento — chiedi al personale",
  "pagamento.errore.temporaneo":
    "Pagamento non disponibile in questo momento, riprova fra poco",
  "pagamento.errore.altro_split":
    "Qualcuno al tavolo sta pagando i suoi piatti. Aspetta che finisca, poi riprova.",
  "pagamento.errore.altro_in_corso":
    "Un pagamento su questo tavolo è già in corso. Aspetta che finisca, poi riprova.",
  "pagamento.errore.altro_conto_intero":
    "Qualcuno sta pagando l'intero conto. Aspetta che finisca, poi riprova.",
  "pagamento.errore.altro_metodo": "Un pagamento con un altro metodo è già in corso",
  "pagamento.errore.gia_pagato": "Conto già pagato",
  "pagamento.errore.nessun_importo": "Nessun importo da pagare",
  "pagamento.errore.piatti_gia_pagati":
    "Alcuni piatti sono già stati pagati o sono in pagamento",
};

const EN: Speculare<typeof IT> = {
  "errore.troppe_richieste_riprova": "Too many requests, please try again shortly",
  "errore.troppe_richieste": "Too many requests",
  "errore.richiesta_non_valida": "Invalid request",
  "errore.payload_non_valido": "Invalid request data",
  "errore.sessione_id_mancante": "sessionId missing",
  "coperti.errore.numero": "That number of covers isn’t valid.",
  "coperti.errore.non_possibile":
    "The cover count can’t be changed on this table. Please tell a member of staff.",
  "errore.sessione_tavolo_non_valida": "Table session not valid",
  "errore.sessione_non_valida": "Session not valid",
  "errore.locale_non_trovato": "Restaurant not found",

  "ordine.errore.righe_non_valide": "Invalid order lines",
  "ordine.errore.non_attivo":
    "Ordering from the table is not enabled at this restaurant — please ask a member of staff",
  "ordine.errore.piatto_non_trovato": "Dish not found",
  "ordine.errore.piatto_non_disponibile": "Dish not available",
  "ordine.attesa.uno": "One more minute and you can order again.",
  "ordine.attesa.molti": "You can order again in {n} minutes.",

  "prenotazione.errore.campi_mancanti": "Please fill in your name, the date and the time",
  "prenotazione.errore.troppe":
    "Too many bookings from the same device. Please try again later, or give us a call.",
  "prenotazione.errore.coperti_max":
    "Please enter between 1 and {max} people. For larger groups, give us a call.",
  "prenotazione.errore.recapito":
    "Leave a phone number or an email address: we need one to confirm your table",
  "prenotazione.errore.non_attiva":
    "Online booking is not enabled at this restaurant — please call the restaurant",
  "prenotazione.errore.data_non_valida": "Invalid date",
  "prenotazione.errore.data_passata": "That date has already passed",
  "prenotazione.errore.data_lontana": "That date is too far ahead — check the year",
  "prenotazione.errore.pieno":
    "We are fully booked at {orario} for a party of {persone}.",
  "prenotazione.errore.nessun_tavolo":
    "There is no suitable table free for a party of {persone} at that time.",
  "prenotazione.messaggio.confermata": "Table confirmed for {quando}.",
  "prenotazione.messaggio.in_attesa":
    "Request sent for {quando}. {locale} will get back to you shortly.",

  "prenotazione.email.oggetto.confermata": "Booking confirmed — {locale}",
  "prenotazione.email.oggetto.richiesta": "Request received — {locale}",
  "prenotazione.email.saluto": "Hello {nome},",
  "prenotazione.email.confermata": "your booking at {locale} is confirmed.",
  "prenotazione.email.in_attesa":
    "we have received your request for {locale}. It is not a booking yet: the restaurant will get back to you shortly, and you will receive another email.",
  "prenotazione.email.quando": "When: {quando}",
  "prenotazione.email.persone": "People: {persone}",
  "prenotazione.email.tavolo": "Table: {tavoli}",
  "prenotazione.email.richieste": "Requests: {note}",
  "prenotazione.email.cambio.telefono": "If anything changes, call us on {telefono}.",
  "prenotazione.email.cambio.email":
    "If anything changes, let us know by replying to this email.",
  "prenotazione.email.disdetta":
    "If you can no longer come, cancel here — it only takes a moment and\nthe table goes back to someone else:",

  "disdetta.errore.link_non_valido": "Invalid link",
  "disdetta.errore.troppi_tentativi": "Too many attempts",
  "disdetta.errore.non_disdicibile": "This booking cannot be cancelled",

  "recensione.errore.gia_lasciata": "You have already left your feedback. Thank you!",
  "recensione.errore.nessun_servizio": "No recent service at this table",

  "chiamata.errore.gia_chiamato": "You have already called. A member of staff is on the way.",
  "chiamata.errore.documento_non_valido": "Invalid document type",
  "chiamata.errore.nessun_tavolo": "No open table: please ask a member of staff",
  "chiamata.messaggio.contanti":
    "A member of staff is coming to your table to take payment.",
  "chiamata.messaggio.arrivo": "A member of staff is on the way.",

  "pagamento.errore.non_attivo":
    "Paying from the table is not enabled at this restaurant — please ask a member of staff",
  "pagamento.errore.coperti_da_confermare":
    "Staff need to confirm how many of you are at the table before the set menu can be paid. Call a waiter — it only takes a moment.",
  "pagamento.errore.locale_non_abilitato":
    "This restaurant is not set up to take payments yet",
  "pagamento.errore.satispay_non_abilitato":
    "This restaurant is not set up for Satispay yet",
  "pagamento.errore.non_disponibile":
    "Online payment is unavailable at the moment — please ask a member of staff",
  "pagamento.errore.temporaneo":
    "Payment is unavailable right now, please try again shortly",
  "pagamento.errore.altro_split":
    "Someone at your table is paying for their dishes. Wait until they have finished, then try again.",
  "pagamento.errore.altro_in_corso":
    "A payment is already in progress for this table. Wait until it has finished, then try again.",
  "pagamento.errore.altro_conto_intero":
    "Someone is paying the whole bill. Wait until they have finished, then try again.",
  "pagamento.errore.altro_metodo":
    "A payment with another method is already in progress",
  "pagamento.errore.gia_pagato": "Bill already paid",
  "pagamento.errore.nessun_importo": "Nothing left to pay",
  "pagamento.errore.piatti_gia_pagati":
    "Some of those dishes have already been paid for, or are being paid for right now",
};

export const tApi = dizionario(IT, EN);

/**
 * La lingua di una richiesta alle rotte pubbliche.
 *
 * Qui non c'è `searchParams` e non c'è `next/headers`: c'è solo la Request.
 * Restano due segnali, il cookie che ricorda la scelta fatta sul selettore e
 * la lingua del telefono. L'ordine è quello di `scegliLinguaUI`, lo stesso
 * che usa `linguaPagina()` per le pagine: un errore che arriva in una lingua
 * diversa da quella della pagina che lo mostra è peggio di nessun errore.
 */
export function linguaRichiesta(req: Request): LinguaUI {
  const intestazione = req.headers.get("cookie") ?? "";
  const voce = intestazione
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE_LINGUA}=`));
  const cookie = voce ? decodeURIComponent(voce.slice(COOKIE_LINGUA.length + 1)) : null;

  return scegliLinguaUI(null, cookie, req.headers.get("accept-language"));
}
