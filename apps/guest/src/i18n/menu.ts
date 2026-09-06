import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Il menu pubblico del locale: la pagina che si apre inquadrando il QR e
 * l'unica di questa app che finisce nei motori di ricerca.
 *
 * Qui c'è solo l'interfaccia — etichette, pulsanti, avvisi. I nomi dei
 * piatti no: quelli li traduce il ristoratore in `lingue.ts`, in dieci
 * lingue, e passano da `traduci()`. Le due cose convivono nella stessa
 * pagina e non vanno confuse: un piatto in tedesco sotto un pulsante in
 * inglese è normale, un pulsante tradotto da noi in tedesco no.
 *
 * L'inglese è quello che un turista in Italia si aspetta di leggere su una
 * carta: "Opening hours" e non "Schedule", "staff" e non "waiters", e la
 * dicitura degli allergeni ricalcata sul Reg. UE 1169/2011 come nel resto
 * dell'applicazione.
 */

const IT = {
  // Metadata e dati strutturati: li legge Google, non il cliente al tavolo,
  // ma vanno nella lingua servita o la scheda nei risultati è mezza italiana.
  "meta.titolo": "Menu di {nome}",
  "meta.titolo.citta": "Menu di {nome} — {citta}",
  "meta.non_trovato": "Menu non trovato",
  "meta.descrizione":
    "Il menu aggiornato di {nome} a {citta}: {esempi} e altro, con i prezzi.",
  "meta.descrizione.senza_citta":
    "Il menu aggiornato di {nome}: {esempi} e altro, con i prezzi.",
  "meta.descrizione.breve": "Il menu di {nome}.",
  "meta.og.descrizione": "Menu e prezzi di {nome}.",
  "jsonld.menu": "Menu di {nome}",

  "intestazione.menu": "Menu",
  "lingua.menu": "Lingua del menu",

  // Filtri e corpo del menu
  "categorie.filtra": "Filtra il menu per categoria",
  "categorie.tutti": "Tutti",
  "categorie.info": "Info",
  "categorie.vuoto": "Il menu non è ancora pubblicato.",

  // Scheda del piatto
  "voce.apri": "Apri dettagli di {nome}",
  "voce.chiudi": "Chiudi dettagli",
  "voce.ingredienti": "Ingredienti",
  "voce.allergeni.nessuno":
    "Nessuno segnalato. Per allergie e intolleranze chiedi sempre al personale prima di ordinare.",
  "voce.conservazione.abbattuto":
    "Sottoposto ad abbattimento rapido di temperatura come previsto dal Reg. CE 853/2004.",
  "voce.conservazione.altro":
    "Prodotto non fresco, utilizzato in assenza di reperibilità del prodotto fresco.",
  "voce.origine": "Origine: {nota}",
  "voce.servizio": "Servizio: {nota}",

  // Sezione informazioni
  "informazioni.titolo": "Informazioni",
  "informazioni.aria": "Informazioni sul locale",
  "informazioni.orari": "Orari",
  "informazioni.orari.assenti": "Chiedi al locale: gli orari non sono indicati.",
  "informazioni.dove": "Dove siamo",
  "informazioni.indicazioni": "Apri le indicazioni",
  "informazioni.pratiche": "Buono a sapersi",
  "informazioni.contatti": "Contatti",

  // Piè di pagina
  "piede.allergeni":
    "Per allergie e intolleranze chiedi sempre al personale prima di ordinare: le informazioni sugli allergeni sono riportate su ogni piatto ai sensi del Reg. UE 1169/2011.",
  "piede.locale": "Il locale",
  "piede.contatti": "Contatti",
  "piede.chiama": "Chiama {numero}",
  "piede.informazioni": "Informazioni",
  "piede.legali": "Informazioni legali",
  "piede.privacy": "Privacy del locale",
  "piede.termini": "Termini di servizio",
  "piede.cookie": "Informativa cookie",
  "piede.inizio": "Torna all'inizio",

  // Assistente del locale
  "assistente.apri": "Chiedi al locale",
  "assistente.titolo": "Chiedi a {nome}",
  "assistente.sottotitolo": "Risponde con quello che è scritto qui",
  "assistente.invito":
    "Orari, piatti, come arrivare. Per allergie e intolleranze conferma sempre con il personale.",
  "assistente.suggerita.orari": "A che ora siete aperti?",
  "assistente.suggerita.vegetariani": "Avete piatti vegetariani?",
  "assistente.suggerita.consigli": "Quali piatti consigliate?",
  "assistente.suggerita.dove": "Dove siete e c'è parcheggio?",
  "assistente.errore": "Non riesco a rispondere adesso.",
  "assistente.errore.rete": "Connessione non riuscita. Riprova.",
  "assistente.attesa": "Sto guardando…",
  "assistente.placeholder": "Scrivi una domanda",
  "assistente.campo": "La tua domanda",
  "assistente.invia": "Chiedi",

  // Tema chiaro/scuro della carta
  "tema.notte": "☾ Notte",
  "tema.giorno": "☀ Giorno",
  "tema.passa_notte": "Passa al tema notte",
  "tema.passa_giorno": "Passa al tema giorno",
  "tema.titolo.notte": "Tema notte",
  "tema.titolo.giorno": "Tema giorno",
};

const EN: Speculare<typeof IT> = {
  "meta.titolo": "{nome} menu",
  "meta.titolo.citta": "{nome} menu — {citta}",
  "meta.non_trovato": "Menu not found",
  "meta.descrizione":
    "The up-to-date menu at {nome} in {citta}: {esempi} and more, with prices.",
  "meta.descrizione.senza_citta":
    "The up-to-date menu at {nome}: {esempi} and more, with prices.",
  "meta.descrizione.breve": "The menu at {nome}.",
  "meta.og.descrizione": "Menu and prices at {nome}.",
  "jsonld.menu": "{nome} menu",

  "intestazione.menu": "Menu",
  "lingua.menu": "Menu language",

  "categorie.filtra": "Filter the menu by category",
  "categorie.tutti": "All",
  "categorie.info": "Info",
  "categorie.vuoto": "The menu has not been published yet.",

  "voce.apri": "Open details for {nome}",
  "voce.chiudi": "Close details",
  "voce.ingredienti": "Ingredients",
  "voce.allergeni.nessuno":
    "None declared. For allergies and intolerances always ask a member of staff before ordering.",
  "voce.conservazione.abbattuto":
    "Subjected to rapid blast-chilling as required by Reg. EC 853/2004.",
  "voce.conservazione.altro":
    "Not fresh, used when fresh product is unavailable.",
  "voce.origine": "Origin: {nota}",
  "voce.servizio": "Serving: {nota}",

  "informazioni.titolo": "Information",
  "informazioni.aria": "About the restaurant",
  "informazioni.orari": "Opening hours",
  "informazioni.orari.assenti":
    "Ask the restaurant: opening hours are not listed.",
  "informazioni.dove": "Find us",
  "informazioni.indicazioni": "Open directions",
  "informazioni.pratiche": "Good to know",
  "informazioni.contatti": "Contact",

  "piede.allergeni":
    "For allergies and intolerances always ask a member of staff before ordering: allergen information is shown on every dish in accordance with Reg. EU 1169/2011.",
  "piede.locale": "The restaurant",
  "piede.contatti": "Contact",
  "piede.chiama": "Call {numero}",
  "piede.informazioni": "Information",
  "piede.legali": "Legal information",
  "piede.privacy": "Restaurant privacy notice",
  "piede.termini": "Terms of service",
  "piede.cookie": "Cookie notice",
  "piede.inizio": "Back to top",

  "assistente.apri": "Ask the restaurant",
  "assistente.titolo": "Ask {nome}",
  "assistente.sottotitolo": "Answers from what is written here",
  "assistente.invito":
    "Opening hours, dishes, how to get here. For allergies and intolerances always check with a member of staff.",
  "assistente.suggerita.orari": "What time are you open?",
  "assistente.suggerita.vegetariani": "Do you have vegetarian dishes?",
  "assistente.suggerita.consigli": "What dishes do you recommend?",
  "assistente.suggerita.dove": "Where are you, and is there parking?",
  "assistente.errore": "I cannot answer right now.",
  "assistente.errore.rete": "Connection failed. Try again.",
  "assistente.attesa": "Having a look…",
  "assistente.placeholder": "Type a question",
  "assistente.campo": "Your question",
  "assistente.invia": "Ask",

  "tema.notte": "☾ Night",
  "tema.giorno": "☀ Day",
  "tema.passa_notte": "Switch to the night theme",
  "tema.passa_giorno": "Switch to the day theme",
  "tema.titolo.notte": "Night theme",
  "tema.titolo.giorno": "Day theme",
};

export const tMenu = dizionario(IT, EN);
