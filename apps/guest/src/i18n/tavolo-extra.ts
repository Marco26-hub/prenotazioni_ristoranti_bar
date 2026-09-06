import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * I contorni della pagina del tavolo: l'annuncio del locale, il numero di
 * ritiro al banco, la recensione di fine cena.
 *
 * Tre pezzi che non stanno nel menu e non stanno nel conto, ma che il cliente
 * legge nello stesso momento e con lo stesso telefono in mano. Stanno insieme
 * qui perché condividono il tono: brevi, gentili, mai un modulo.
 *
 * Sull'inglese della recensione: chi ha dato meno di cinque stelle si è già
 * accorto che qualcosa non è andato, e non va interrogato. "What wasn't quite
 * right?" chiede la stessa cosa di un reclamo senza suonarne come uno.
 */

const IT = {
  // Annuncio del locale
  "annuncio.chiudi": "Chiudi l'annuncio",
  "annuncio.vai_al_menu": "Vai al menu",

  // Numero di ritiro al banco
  "ritiro.sezione": "Il tuo numero",
  "ritiro.pronto": "Pronto, vieni a ritirare",
  "ritiro.pronto.dettaglio": "Al banco chiedi il numero {n}.",
  "ritiro.preparazione": "In preparazione",
  "ritiro.preparazione.dettaglio":
    "Il tuo numero è {n}. Ti avvisiamo qui quando è pronto.",

  // Recensione — modulo
  "recensione.sezione": "Lascia la tua opinione",
  "recensione.titolo": "Com'è andata?",
  "recensione.sottotitolo": "Lo legge il locale, non viene pubblicato da nessuna parte.",
  "recensione.voto.gruppo": "Voto da 1 a 5",
  "recensione.stelle.uno": "{n} stella",
  "recensione.stelle.molti": "{n} stelle",
  "recensione.voto.1": "Male",
  "recensione.voto.2": "Poco",
  "recensione.voto.3": "Nella media",
  "recensione.voto.4": "Bene",
  "recensione.voto.5": "Benissimo",
  "recensione.aggiungi": "Vuoi aggiungere qualcosa?",
  "recensione.cosa_non_va": "Cosa non è andato?",
  "recensione.cosa_non_va.aiuto":
    "Scrivilo qui: lo legge il titolare, e su una cosa scritta stasera si può ancora rimediare.",
  "recensione.commento.alto": "Cosa ti è piaciuto di più?",
  "recensione.commento.basso": "L'attesa, un piatto, il locale, il servizio…",
  "recensione.nome": "Come ti chiami (se vuoi)",
  "recensione.nome.segnaposto": "Anche solo il nome",
  "recensione.invio": "Invio…",
  "recensione.invia.alto": "Manda al locale",
  "recensione.invia.basso": "Manda al titolare",

  // Recensione — esito
  "recensione.errore.invio": "Non è riuscito. Riprova fra poco.",
  "recensione.errore.rete": "Non è riuscito: controlla la connessione.",
  "recensione.grazie.alto": "Grazie. Fa piacere davvero.",
  "recensione.grazie.basso":
    "Grazie: il titolare legge di persona, e sapere cosa non ha funzionato è l'unico modo per rimediare.",
  "recensione.pubblica.invito": "Se ti va di scriverlo anche pubblicamente, per noi conta molto:",
  "recensione.pubblica.azione": "Scrivi una recensione pubblica",
};

const EN: Speculare<typeof IT> = {
  "annuncio.chiudi": "Close the announcement",
  "annuncio.vai_al_menu": "Go to the menu",

  "ritiro.sezione": "Your number",
  "ritiro.pronto": "Ready — come and collect",
  "ritiro.pronto.dettaglio": "Ask for number {n} at the counter.",
  "ritiro.preparazione": "Being prepared",
  "ritiro.preparazione.dettaglio":
    "Your number is {n}. We'll let you know here when it's ready.",

  "recensione.sezione": "Leave your feedback",
  "recensione.titolo": "How was it?",
  "recensione.sottotitolo": "Only the restaurant reads this, it isn't published anywhere.",
  "recensione.voto.gruppo": "Rating from 1 to 5",
  "recensione.stelle.uno": "{n} star",
  "recensione.stelle.molti": "{n} stars",
  "recensione.voto.1": "Poor",
  "recensione.voto.2": "Not great",
  "recensione.voto.3": "Average",
  "recensione.voto.4": "Good",
  "recensione.voto.5": "Excellent",
  "recensione.aggiungi": "Anything you'd like to add?",
  "recensione.cosa_non_va": "What wasn't quite right?",
  "recensione.cosa_non_va.aiuto":
    "Tell us here: the owner reads it personally, and something raised tonight can still be put right.",
  "recensione.commento.alto": "What did you enjoy most?",
  "recensione.commento.basso": "The wait, a dish, the room, the service…",
  "recensione.nome": "Your name (if you like)",
  "recensione.nome.segnaposto": "First name is fine",
  "recensione.invio": "Sending…",
  "recensione.invia.alto": "Send to the restaurant",
  "recensione.invia.basso": "Send to the owner",

  "recensione.errore.invio": "That didn't work. Try again shortly.",
  "recensione.errore.rete": "That didn't work: check your connection.",
  "recensione.grazie.alto": "Thank you. That really means a lot.",
  "recensione.grazie.basso":
    "Thank you: the owner reads this personally, and knowing what went wrong is the only way to put it right.",
  "recensione.pubblica.invito": "If you'd like to say it publicly too, it would mean a lot to us:",
  "recensione.pubblica.azione": "Write a public review",
};

export const tTavoloExtra = dizionario(IT, EN);
export type VociTavoloExtra = typeof IT;
