import { dizionario, type LinguaUI, type Speculare } from "@repo/shared/i18n";

/**
 * Le parole di prenotazioni e recensioni, lato gestionale.
 *
 * Chi legge queste schermate sta in sala con il telefono in mano: sono le
 * pagine che si aprono mentre qualcuno aspetta una risposta. Per questo
 * l'inglese qui è quello del mestiere e non quello del vocabolario —
 * "covers" e non "seats", "no-show" e non "did not arrive", "seated" e non
 * "arrived": è la parola che un maître inglese cerca senza doverci pensare.
 *
 * "Booking" e non "reservation": è la forma britannica, ed è quella che il
 * personale straniero in Italia ha già visto ovunque. Il cliente del tavolo
 * è "the guest", mai "the customer": in sala si chiama così.
 *
 * Attenzione: gli stati (pending, confirmed, seated, no_show, declined,
 * cancelled) sono valori di database. Qui si traducono solo le etichette;
 * i valori restano quelli e non si toccano.
 */

const IT = {
  // --- Pagina prenotazioni ---------------------------------------------
  "pagina.titolo": "Prenotazioni",
  "pagina.nessun_locale": "Nessun locale associato.",
  "pagina.da_confermare_mese": "{n} da confermare questo mese",

  // Avvisi in testa alla pagina
  "avviso.email_non_configurata":
    "L'invio email non è ancora configurato: le richieste arrivano solo qui dentro e il cliente non riceve conferme. Vanno gestite a telefono.",
  "avviso.indirizzo_mancante":
    "Non hai indicato un indirizzo per le richieste di prenotazione. Impostalo in Impostazioni, altrimenti non ti arriva nessuna notifica.",
  // Spezzato in tre perché in mezzo c'è il percorso in grassetto.
  "avviso.capienza.testo":
    "Non hai indicato quanti coperti puoi accogliere per fascia oraria: le richieste vengono accettate tutte e la disponibilita la valuti tu. Impostala in",
  "avviso.capienza.percorso": "Impostazioni → Prenotazioni",
  "avviso.capienza.coda": "per far rifiutare da sole quelle che non entrano.",

  // --- Calendario -------------------------------------------------------
  "calendario.mese_precedente": "Mese precedente",
  "calendario.mese_successivo": "Mese successivo",
  "calendario.giorno.lun": "lun",
  "calendario.giorno.mar": "mar",
  "calendario.giorno.mer": "mer",
  "calendario.giorno.gio": "gio",
  "calendario.giorno.ven": "ven",
  "calendario.giorno.sab": "sab",
  "calendario.giorno.dom": "dom",
  // Sta in una casella di sedici pixel: "p" prenotazioni, "c" coperti.
  "calendario.sintesi": "{p}p · {c}c",
  "calendario.da_confermare": "{n} da conf.",
  "calendario.legenda":
    "Su ogni giorno: prenotazioni attive e coperti totali. In ambra i giorni con richieste ancora da confermare.",

  // --- Giorno selezionato ----------------------------------------------
  "giorno.coperti": "{n} coperti",
  "giorno.vuoto": "Nessuna prenotazione in questa giornata.",

  // --- Inserimento manuale ---------------------------------------------
  "aggiungi.titolo": "Aggiungi a mano",
  "aggiungi.spiegazione": "Per chi prenota al telefono. Nasce già confermata: l'hai presa tu.",
  "aggiungi.nome": "Nome",
  "aggiungi.quando": "Giorno e ora",
  "aggiungi.persone": "Persone",
  "aggiungi.telefono": "Telefono",
  "aggiungi.email": "Email (facoltativa)",
  "aggiungi.note": "Note: seggiolone, allergie, tavolo fuori…",
  "aggiungi.invia": "Aggiungi prenotazione",

  // --- Stati della prenotazione (solo etichette) ------------------------
  "stato.pending": "Da confermare",
  "stato.confirmed": "Confermata",
  "stato.seated": "Arrivato",
  "stato.declined": "Rifiutata",
  "stato.cancelled": "Annullata",
  "stato.no_show": "Non presentato",

  // --- Scheda della prenotazione ---------------------------------------
  "card.persone.uno": "{n} persona",
  "card.persone.molti": "{n} persone",
  "card.tavolo.uno": "Tavolo",
  "card.tavolo.molti": "Tavoli",
  "card.motivo": "Motivo: {motivo}",
  "card.email_non_inviata": "Email al cliente non inviata ({errore}). Avvisalo tu.",
  "card.richiesta_non_arrivata": "Questa richiesta non ti è arrivata per email ({errore}).",
  "card.rifiuto.etichetta": "Cosa scriviamo al cliente",
  "card.rifiuto.nota":
    "Insieme al motivo mandiamo gli orari vicini in cui c'è posto davvero, calcolati sulle prenotazioni già prese.",
  "card.rifiuto.invio": "Invio…",
  "card.rifiuto.conferma": "Rifiuta e avvisa",
  "card.conferma": "Conferma",
  "card.rifiuta": "Rifiuta",
  "card.arrivato": "È arrivato",
  "card.non_presentato": "Non presentato",
  // Qui "Annulla" annulla la prenotazione, non l'operazione: in inglese
  // sono due parole diverse e confonderle cancella un tavolo per sbaglio.
  "card.annulla_prenotazione": "Annulla",

  // Motivi pronti del rifiuto: finiscono nell'email al cliente.
  "motivo.completo": "Siamo al completo per quell'orario.",
  "motivo.chiusura": "Chiusura straordinaria in quella data.",
  "motivo.gruppo": "Non possiamo accogliere un gruppo di queste dimensioni.",

  // --- Errori delle azioni ---------------------------------------------
  "errore.non_trovata": "Prenotazione non trovata",
  "errore.disdetta_dal_cliente":
    "Il cliente ha disdetto questa prenotazione: non si può confermare.",
  "errore.gia_chiusa": "Questa richiesta è già stata chiusa.",
  "errore.nessun_tavolo_fascia": "Nessun tavolo libero adatto in questa fascia oraria.",
  "errore.nessun_tavolo": "Nessun tavolo libero adatto",

  // --- Avvisi dopo l'azione, per chi sta in sala ------------------------
  "avviso.confermata.email_ko.telefono":
    "Confermata, ma l'email al cliente non è partita: {errore}. Chiamalo al {telefono}.",
  "avviso.confermata.email_ko":
    "Confermata, ma l'email al cliente non è partita: {errore}. Chiamalo.",
  "avviso.confermata.senza_email.telefono":
    "Confermata. Il cliente non ha lasciato un'email: avvisalo al {telefono}.",
  "avviso.confermata.senza_email":
    "Confermata. Il cliente non ha lasciato un'email: avvisalo tu.",
  "avviso.rifiutata.email_ko.telefono":
    "Rifiutata, ma l'email al cliente non è partita: {errore}. Chiamalo al {telefono}.",
  "avviso.rifiutata.email_ko":
    "Rifiutata, ma l'email al cliente non è partita: {errore}. Chiamalo.",
  "avviso.rifiutata.senza_email.telefono":
    "Rifiutata. Il cliente non ha lasciato un'email: avvisalo al {telefono}.",
  "avviso.rifiutata.senza_email":
    "Rifiutata. Il cliente non ha lasciato un'email: avvisalo tu.",

  // --- Email al cliente -------------------------------------------------
  // Queste vanno nella lingua di CHI HA PRENOTATO (reservations.lingua),
  // non in quella di chi sta al gestionale.
  "email.locale.ripiego": "il ristorante",
  "email.locale.ripiego.noi": "noi",
  "email.saluto": "Ciao {nome},",
  "email.conferma.oggetto": "Prenotazione confermata — {locale}",
  "email.conferma.intro": "la tua prenotazione da {locale} è confermata.",
  "email.conferma.quando": "Quando: {quando}",
  "email.conferma.persone": "Persone: {n}",
  "email.conferma.tavolo": "Tavolo: {tavoli}",
  "email.conferma.richieste": "Richieste: {note}",
  "email.conferma.cambiamenti.telefono": "Per qualsiasi cambiamento chiamaci al {telefono}.",
  "email.conferma.cambiamenti": "Per qualsiasi cambiamento rispondi a questa email.",
  "email.conferma.disdetta.riga1": "Se non riesci a venire, disdici da qui: ci vuole un momento e",
  "email.conferma.disdetta.riga2": "il tavolo torna disponibile per qualcun altro.",
  "email.rifiuto.oggetto": "Prenotazione non disponibile — {locale}",
  "email.rifiuto.intro": "purtroppo per {quando} non possiamo accogliere {n} persone.",
  "email.rifiuto.motivo_predefinito": "Non abbiamo disponibilità per quell'orario.",
  "email.rifiuto.alternative": "Abbiamo posto in questi orari:",
  "email.rifiuto.alternativa": "— {quando}",
  "email.rifiuto.nessuna_alternativa": "Puoi provare un altro giorno o un altro orario.",
  "email.rifiuto.prenota": "Prenota qui: {url}",
  "email.rifiuto.telefono": "Oppure chiamaci al {telefono}.",
  "email.rifiuto.saluto": "Ci dispiace, e ci farebbe piacere vederti presto.",

  // --- Recensioni -------------------------------------------------------
  "recensioni.titolo": "Recensioni",
  "recensioni.media": "di media su {totale}",
  "recensioni.da_leggere": "{n} da leggere",
  "recensioni.vuoto":
    "Ancora nessuna. La richiesta compare in fondo al menu del tavolo, dopo il conto: la lasciano mentre sono ancora seduti, quindi arrivano dal primo servizio con i QR sui tavoli. Il link alla tua pagina pubblica si imposta in Impostazioni.",
  "recensioni.voto": "{voto} su 5",
  "recensioni.tavolo": "tavolo {codice}",
  "recensioni.nuova": "nuova",
  "recensioni.segna": "Segna lette ({quante})",
  "recensioni.segna.corso": "Segno…",
  "recensioni.segnate": "{n} segnate come lette.",
};

const EN: Speculare<typeof IT> = {
  "pagina.titolo": "Bookings",
  "pagina.nessun_locale": "No restaurant linked to this account.",
  "pagina.da_confermare_mese": "{n} to confirm this month",

  "avviso.email_non_configurata":
    "Email sending is not set up yet: requests only arrive in here and the guest gets no confirmation. Handle them by phone.",
  "avviso.indirizzo_mancante":
    "You haven't given an address for booking requests. Set it in Settings, otherwise no notification reaches you.",
  "avviso.capienza.testo":
    "You haven't said how many covers you can take per time slot: every request is accepted and you judge availability yourself. Set it in",
  "avviso.capienza.percorso": "Settings → Bookings",
  "avviso.capienza.coda": "to have the ones that don't fit declined automatically.",

  "calendario.mese_precedente": "Previous month",
  "calendario.mese_successivo": "Next month",
  "calendario.giorno.lun": "mon",
  "calendario.giorno.mar": "tue",
  "calendario.giorno.mer": "wed",
  "calendario.giorno.gio": "thu",
  "calendario.giorno.ven": "fri",
  "calendario.giorno.sab": "sat",
  "calendario.giorno.dom": "sun",
  "calendario.sintesi": "{p}b · {c}c",
  "calendario.da_confermare": "{n} to conf.",
  "calendario.legenda":
    "On each day: active bookings and total covers. Days with requests still to confirm are in amber.",

  "giorno.coperti": "{n} covers",
  "giorno.vuoto": "No bookings on this day.",

  "aggiungi.titolo": "Add manually",
  "aggiungi.spiegazione": "For guests who book by phone. It starts confirmed: you took it yourself.",
  "aggiungi.nome": "Name",
  "aggiungi.quando": "Day and time",
  "aggiungi.persone": "People",
  "aggiungi.telefono": "Phone",
  "aggiungi.email": "Email (optional)",
  "aggiungi.note": "Notes: high chair, allergies, table outside…",
  "aggiungi.invia": "Add booking",

  "stato.pending": "To confirm",
  "stato.confirmed": "Confirmed",
  "stato.seated": "Seated",
  "stato.declined": "Declined",
  "stato.cancelled": "Cancelled",
  "stato.no_show": "No-show",

  "card.persone.uno": "{n} person",
  "card.persone.molti": "{n} people",
  "card.tavolo.uno": "Table",
  "card.tavolo.molti": "Tables",
  "card.motivo": "Reason: {motivo}",
  "card.email_non_inviata": "Email to the guest not sent ({errore}). Let them know yourself.",
  "card.richiesta_non_arrivata": "This request didn't reach you by email ({errore}).",
  "card.rifiuto.etichetta": "What we write to the guest",
  "card.rifiuto.nota":
    "Along with the reason we send nearby times where there is genuinely room, worked out from the bookings already taken.",
  "card.rifiuto.invio": "Sending…",
  "card.rifiuto.conferma": "Decline and notify",
  "card.conferma": "Confirm",
  "card.rifiuta": "Decline",
  "card.arrivato": "Seated",
  "card.non_presentato": "No-show",
  "card.annulla_prenotazione": "Cancel booking",

  "motivo.completo": "We're fully booked for that time.",
  "motivo.chiusura": "We're closed on that date.",
  "motivo.gruppo": "We can't take a group of that size.",

  "errore.non_trovata": "Booking not found",
  "errore.disdetta_dal_cliente": "The guest cancelled this booking: it can't be confirmed.",
  "errore.gia_chiusa": "This request has already been closed.",
  "errore.nessun_tavolo_fascia": "No suitable table free in this time slot.",
  "errore.nessun_tavolo": "No suitable table free",

  "avviso.confermata.email_ko.telefono":
    "Confirmed, but the email to the guest didn't go out: {errore}. Call them on {telefono}.",
  "avviso.confermata.email_ko":
    "Confirmed, but the email to the guest didn't go out: {errore}. Call them.",
  "avviso.confermata.senza_email.telefono":
    "Confirmed. The guest left no email address: let them know on {telefono}.",
  "avviso.confermata.senza_email":
    "Confirmed. The guest left no email address: let them know yourself.",
  "avviso.rifiutata.email_ko.telefono":
    "Declined, but the email to the guest didn't go out: {errore}. Call them on {telefono}.",
  "avviso.rifiutata.email_ko":
    "Declined, but the email to the guest didn't go out: {errore}. Call them.",
  "avviso.rifiutata.senza_email.telefono":
    "Declined. The guest left no email address: let them know on {telefono}.",
  "avviso.rifiutata.senza_email":
    "Declined. The guest left no email address: let them know yourself.",

  "email.locale.ripiego": "the restaurant",
  "email.locale.ripiego.noi": "us",
  "email.saluto": "Hello {nome},",
  "email.conferma.oggetto": "Booking confirmed — {locale}",
  "email.conferma.intro": "your booking at {locale} is confirmed.",
  "email.conferma.quando": "When: {quando}",
  "email.conferma.persone": "People: {n}",
  "email.conferma.tavolo": "Table: {tavoli}",
  "email.conferma.richieste": "Requests: {note}",
  "email.conferma.cambiamenti.telefono": "If anything changes, call us on {telefono}.",
  "email.conferma.cambiamenti": "If anything changes, just reply to this email.",
  "email.conferma.disdetta.riga1": "If you can't make it, cancel here: it takes a moment and",
  "email.conferma.disdetta.riga2": "the table goes back to someone else.",
  "email.rifiuto.oggetto": "Booking not available — {locale}",
  "email.rifiuto.intro": "we're sorry, on {quando} we can't take {n} people.",
  "email.rifiuto.motivo_predefinito": "We have no availability for that time.",
  "email.rifiuto.alternative": "We have room at these times:",
  "email.rifiuto.alternativa": "— {quando}",
  "email.rifiuto.nessuna_alternativa": "You could try another day or another time.",
  "email.rifiuto.prenota": "Book here: {url}",
  "email.rifiuto.telefono": "Or call us on {telefono}.",
  "email.rifiuto.saluto": "We're sorry, and we'd be glad to see you soon.",

  "recensioni.titolo": "Reviews",
  "recensioni.media": "average across {totale}",
  "recensioni.da_leggere": "{n} unread",
  "recensioni.vuoto":
    "None yet. The request appears at the bottom of the table menu, after the bill: guests leave it while they're still seated, so they start arriving from the first service with the QR codes on the tables. The link to your public page is set in Settings.",
  "recensioni.voto": "{voto} out of 5",
  "recensioni.tavolo": "table {codice}",
  "recensioni.nuova": "new",
  "recensioni.segna": "Mark as read ({quante})",
  "recensioni.segna.corso": "Marking…",
  "recensioni.segnate": "{n} marked as read.",
};

export const tPrenotazioni = dizionario(IT, EN);

/** Le chiavi, per chi deve tenerne una in una tabella di corrispondenze. */
export type ChiavePrenotazioni = Extract<keyof typeof IT, string>;

/**
 * Le date che il traduttore non copre.
 *
 * `t.data()` mette sempre il giorno: per l'intestazione del calendario serve
 * solo mese e anno, e per il titolo del giorno serve il giorno della
 * settimana per esteso. Stanno qui e non nelle pagine perché la locale non
 * va scritta a mano in mezzo al JSX: en-GB e non en-US, giorno prima del
 * mese, come sul resto del gestionale.
 */
const LOCALE_UI: Record<LinguaUI, string> = { it: "it-IT", en: "en-GB" };

/** "settembre 2026" — l'intestazione del calendario. */
export function meseAnno(d: Date, lingua: LinguaUI): string {
  return new Intl.DateTimeFormat(LOCALE_UI[lingua] ?? LOCALE_UI.it, {
    month: "long",
    year: "numeric",
  }).format(d);
}

/** "venerdì 5 settembre" — il titolo del giorno selezionato. */
export function giornoLungo(d: Date, lingua: LinguaUI): string {
  return new Intl.DateTimeFormat(LOCALE_UI[lingua] ?? LOCALE_UI.it, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

/**
 * Giorno e ora per esteso nel fuso del locale, nella lingua di chi legge.
 *
 * Come `formattaOrario` di @repo/shared/prenotazioni, che però è fissa
 * sull'italiano: un'email in inglese con dentro "venerdì 5 settembre" è
 * mezza email che non si capisce. Il fuso resta quello del locale — l'ora
 * della prenotazione è l'ora del ristorante, non quella del telefono.
 */
export function orarioLungo(d: Date, fuso: string, lingua: LinguaUI): string {
  return new Intl.DateTimeFormat(LOCALE_UI[lingua] ?? LOCALE_UI.it, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  }).format(d);
}
