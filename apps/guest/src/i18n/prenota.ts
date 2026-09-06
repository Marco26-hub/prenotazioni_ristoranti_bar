import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Le parole della prenotazione: la pagina pubblica, il modulo, la disdetta.
 *
 * Sono le pagine che il locale linka dal proprio sito e che finiscono
 * nell'email di conferma: chi le legge non è al tavolo, è a casa o in
 * albergo, e spesso non parla italiano. Un modulo che non si capisce è una
 * telefonata in più in orario di servizio.
 *
 * Sull'inglese: britannico, perché è quello che il turista medio in Italia
 * legge, e "book a table" — non "make a reservation", che è americano e
 * suona da catena. Il locale è "the restaurant", mai "the venue".
 */

const IT = {
  // Metadata della pagina pubblica di prenotazione
  "meta.titolo": "Prenota un tavolo da {nome}",
  "meta.titolo.citta": "Prenota un tavolo da {nome} — {citta}",
  "meta.descrizione":
    "Prenota online un tavolo da {nome}. Scegli giorno, ora e numero di persone: la conferma arriva dal locale.",
  "meta.descrizione.citta":
    "Prenota online un tavolo da {nome} a {citta}. Scegli giorno, ora e numero di persone: la conferma arriva dal locale.",
  "meta.non_trovato": "Locale non trovato",

  // Dati strutturati: è il nome della prenotazione che i motori mostrano
  "jsonld.tavolo": "Tavolo da {nome}",

  // Ripieghi dei testi che il ristoratore può riscrivere (TESTI_PUBBLICI).
  // Valgono solo quando il locale non ha scritto niente: il suo testo resta
  // suo, nella lingua in cui l'ha scritto.
  "prenota.titolo": "Prenota da {nome}",
  "prenota.chiuse.titolo": "Prenotazione online non disponibile",
  "prenota.chiuse.testo": "Contatta direttamente il locale per prenotare un tavolo.",
  "prenota.telefono": "Preferisci telefonare?",
  "prenota.link_menu": "Guarda il menu",

  // Il modulo
  "form.nome": "Nome e cognome",
  "form.persone": "Quante persone",
  "form.quando": "Giorno e ora",
  "form.telefono": "Telefono",
  "form.email": "Email",
  "form.contatti": "Lascia almeno uno dei due: servono a confermarti il tavolo.",
  "form.note": "Richieste particolari",
  "form.note.placeholder": "Allergie, seggiolone, tavolo all'aperto…",
  "form.invia": "Prenota il tavolo",
  "form.invio": "Invio…",
  "form.privacy":
    "Inviando accetti che {nome} tratti i tuoi dati per gestire la prenotazione. Vedi",
  "form.privacy.link": "l'informativa privacy",

  // Esito dell'invio
  "esito.grazie": "Grazie",
  "esito.ricevuta": "Prenotazione ricevuta. {nome} ti contatterà per la conferma.",
  "errore.invio": "Non siamo riusciti a registrare la prenotazione",
  "errore.rete": "Connessione non riuscita. Controlla la rete e riprova.",

  // La disdetta dal link ricevuto per email
  "disdici.meta.titolo": "Disdici la prenotazione",
  "disdici.titolo": "Disdici la prenotazione",
  "disdici.link.titolo": "Link non valido",
  "disdici.link.testo":
    "Questo link non corrisponde a nessuna prenotazione. Può essere scaduto, o già usato. Per disdire chiama direttamente il locale.",
  "disdici.gia.titolo": "Già disdetta",
  "disdici.gia.testo":
    "La prenotazione da {nome} del {quando} risulta disdetta. Non devi fare altro.",
  "disdici.rifiutata.titolo": "Richiesta non accolta",
  "disdici.rifiutata.motivo": "{nome} non ha potuto accogliere questa richiesta: {motivo}",
  "disdici.rifiutata.senza_motivo": "{nome} non ha potuto accogliere questa richiesta.",
  "disdici.rifiutata.niente": "Non c'è niente da disdire.",
  "disdici.rifiutata.riprova": "Per riprovare: {telefono}.",
  "disdici.chiusa.titolo": "Prenotazione già chiusa",
  "disdici.chiusa.testo":
    "Risulta che la serata sia già passata da {nome}: non si può più disdire.",
  "disdici.passata.titolo": "Prenotazione passata",
  "disdici.passata.testo": "Era per {quando} e non si può più disdire.",
  "disdici.qualsiasi": "Per qualsiasi cosa: {telefono}.",

  // Il riepilogo prima di disdire
  "disdici.locale": "Locale",
  "disdici.quando": "Quando",
  "disdici.a_nome": "A nome di",
  "disdici.persone": "Persone",
  "disdici.cambio":
    "Se invece vuoi solo cambiare orario o numero di persone, non disdire: chiama il locale, è più veloce che rifare tutto.",
  "disdici.cambio.telefono":
    "Se invece vuoi solo cambiare orario o numero di persone, non disdire: chiama il locale al {telefono}, è più veloce che rifare tutto.",
  "disdici.torna": "Torna alle prenotazioni",

  // Il pulsante che disdice davvero
  "disdetta.conferma": "Sì, disdici la prenotazione",
  "disdetta.invio": "Disdico…",
  "disdetta.fatta":
    "Disdetta. Grazie per averlo fatto sapere: il tavolo torna disponibile.",
  "disdetta.errore": "Non è riuscito. Riprova, o chiama il locale.",
};

const EN: Speculare<typeof IT> = {
  "meta.titolo": "Book a table at {nome}",
  "meta.titolo.citta": "Book a table at {nome} — {citta}",
  "meta.descrizione":
    "Book a table online at {nome}. Choose the day, the time and how many of you: the restaurant confirms.",
  "meta.descrizione.citta":
    "Book a table online at {nome} in {citta}. Choose the day, the time and how many of you: the restaurant confirms.",
  "meta.non_trovato": "Restaurant not found",

  "jsonld.tavolo": "Table at {nome}",

  "prenota.titolo": "Book at {nome}",
  "prenota.chiuse.titolo": "Online booking is not available",
  "prenota.chiuse.testo": "Contact the restaurant directly to book a table.",
  "prenota.telefono": "Rather call?",
  "prenota.link_menu": "See the menu",

  "form.nome": "Full name",
  "form.persone": "How many people",
  "form.quando": "Day and time",
  "form.telefono": "Phone",
  "form.email": "Email",
  "form.contatti": "Leave at least one of the two: we need it to confirm your table.",
  "form.note": "Special requests",
  "form.note.placeholder": "Allergies, high chair, table outside…",
  "form.invia": "Book the table",
  "form.invio": "Sending…",
  "form.privacy":
    "By sending this you agree that {nome} may process your data to handle the booking. See",
  "form.privacy.link": "the privacy notice",

  "esito.grazie": "Thank you",
  "esito.ricevuta": "Booking received. {nome} will be in touch to confirm.",
  "errore.invio": "We couldn't register your booking",
  "errore.rete": "Connection failed. Check your network and try again.",

  "disdici.meta.titolo": "Cancel your booking",
  "disdici.titolo": "Cancel your booking",
  "disdici.link.titolo": "Link not valid",
  "disdici.link.testo":
    "This link doesn't match any booking. It may have expired, or already been used. To cancel, please call the restaurant directly.",
  "disdici.gia.titolo": "Already cancelled",
  "disdici.gia.testo":
    "Your booking at {nome} for {quando} is cancelled. There is nothing else to do.",
  "disdici.rifiutata.titolo": "Booking not accepted",
  "disdici.rifiutata.motivo": "{nome} could not accept this booking: {motivo}",
  "disdici.rifiutata.senza_motivo": "{nome} could not accept this booking.",
  "disdici.rifiutata.niente": "There is nothing to cancel.",
  "disdici.rifiutata.riprova": "To try again: {telefono}.",
  "disdici.chiusa.titolo": "Booking already closed",
  "disdici.chiusa.testo":
    "That evening at {nome} has already been and gone: it can no longer be cancelled.",
  "disdici.passata.titolo": "Booking in the past",
  "disdici.passata.testo": "It was for {quando} and can no longer be cancelled.",
  "disdici.qualsiasi": "For anything at all: {telefono}.",

  "disdici.locale": "Restaurant",
  "disdici.quando": "When",
  "disdici.a_nome": "In the name of",
  "disdici.persone": "People",
  "disdici.cambio":
    "If you only want to change the time or the number of people, don't cancel: call the restaurant, it's quicker than starting over.",
  "disdici.cambio.telefono":
    "If you only want to change the time or the number of people, don't cancel: call the restaurant on {telefono}, it's quicker than starting over.",
  "disdici.torna": "Back to booking",

  "disdetta.conferma": "Yes, cancel the booking",
  "disdetta.invio": "Cancelling…",
  "disdetta.fatta":
    "Cancelled. Thank you for letting us know: the table is free again.",
  "disdetta.errore": "That didn't work. Try again, or call the restaurant.",
};

export const tPrenota = dizionario(IT, EN);
