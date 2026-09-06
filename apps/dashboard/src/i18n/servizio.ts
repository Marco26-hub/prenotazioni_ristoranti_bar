import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Le parole del servizio: comande, schermo di cucina, banco, numeri di ritiro.
 *
 * Questo inglese lo legge chi cucina, di fretta, su uno schermo appeso a due
 * metri. Quindi corto e imperativo — "Ready", "Served", "Hold", "Send" — e
 * mai una frase dove basta una parola. Le spiegazioni lunghe restano solo
 * dove si leggono da fermi: la didascalia dei comandi vocali, l'avviso sulla
 * privacy del microfono, il testo che dice perché una pagina è vuota.
 *
 * Il vocabolario è quello del mestiere e non del dizionario: "station" per
 * il reparto, "prep" per la preparazione, "on the pass" per il passe, "run"
 * per portare in sala, "front of house" per la sala, "ticket" per la
 * comanda, "hold" e "send" per trattenere e mandare. Non si usa "86'd", che
 * è americano e in una cucina italiana non lo capisce nessuno.
 *
 * "N. " davanti al numero di ritiro NON è una parola tradotta a caso: il
 * codice di gruppo che arriva alla Server Action lo contiene, e la query lo
 * riconosce con un `like 'N. %'`. Qui si traduce solo l'etichetta che si
 * legge a schermo (`banco.ritiro.n`); la chiave che viaggia resta "N. ".
 */

const IT = {
  // --- Ordini in corso ----------------------------------------------------
  "comande.titolo": "Ordini in corso",
  "comande.stampa": "Stampa comande",
  "comande.senza_locale":
    "Il tuo utente non è associato a nessun locale. Chiedi al titolare di aggiungerti al personale.",
  "comande.vuoto": "Nessun ordine in corso.",
  "comande.vuoto.miei": "Nessun ordine sui tuoi tavoli.",

  // --- Stati e legenda ----------------------------------------------------
  "stato.pending": "Da inviare",
  "stato.sent_to_kitchen": "Da preparare",
  "stato.preparing": "In preparazione",
  "stato.ready": "Pronto",
  "stato.served": "Servito",

  "legenda.pending": "da inviare",
  "legenda.sent_to_kitchen": "in coda",
  "legenda.preparing": "in cottura",
  "legenda.ready": "pronto",
  "legenda.served": "portato",
  "legenda.ritardo": "in ritardo",

  // --- Azioni sulla riga --------------------------------------------------
  "azione.sent_to_kitchen": "Metti in preparazione",
  "azione.preparing": "Segna pronto",
  "azione.ready": "Segna servito",
  "azione.trattieni": "Ritarda",
  "azione.manda": "Manda ora",
  "azione.trattieni.piatto": "Ritarda {piatto}",
  "azione.manda.piatto": "Manda ora {piatto}",
  "riga.trattenuto": "Trattenuto — non preparare",
  "riga.portato": "portato",

  // --- Azioni su tutto il tavolo ------------------------------------------
  "tavolo.etichetta": "Tavolo",
  "tavolo.tutto_servito": "tutto servito",
  "tavolo.attesa": "{n} min",
  "tavolo.attesa.ritardo": "{n} min · in ritardo",
  "tavolo.tutti_preparazione": "Tutto in preparazione ({n})",
  "tavolo.tutti_pronti": "Tutto pronto ({n})",
  "tavolo.tutti_serviti": "Tutto servito ({n})",
  "tavolo.manda_trattenuti": "Manda i {n} trattenuti",
  "tavolo.trattieni": "Ritarda il tavolo",

  // --- Filtri di schermo --------------------------------------------------
  "filtro.schermo": "Questo schermo:",
  "filtro.tutto": "Tutto",
  "filtro.miei_tavoli": "I miei tavoli",
  "filtro.tutta_sala": "Tutta la sala",

  // --- Reparti ------------------------------------------------------------
  "reparto.cucina": "Cucina",
  "reparto.bar": "Bar",
  "reparto.pizzeria": "Pizzeria",
  "reparto.pasticceria": "Pasticceria",

  // Gli stessi nomi in mezzo a una frase: "è del reparto cucina", non "è del
  // reparto Cucina". Sono quattro voci in più e non un `toLowerCase()` perché
  // in inglese la minuscola non basta — "pizza station" non è "Pizzeria"
  // abbassata.
  "reparto.minuscolo.cucina": "cucina",
  "reparto.minuscolo.bar": "bar",
  "reparto.minuscolo.pizzeria": "pizzeria",
  "reparto.minuscolo.pasticceria": "pasticceria",

  // --- Comando vocale -----------------------------------------------------
  "vocale.attiva": "Comando vocale",
  "vocale.attivo": "Ascolto attivo",
  "vocale.parla": "Parla al tavolo, non allo schermo.",
  "vocale.non_disponibile": "Il comando vocale richiede Chrome o Safari.",
  "vocale.privacy":
    "Con l'ascolto attivo il browser invia l'audio al proprio servizio di trascrizione — su Chrome, ai server di Google. In cucina si parla di tutto: accendilo quando serve e spegnilo dopo.",
  "vocale.aiuto.titolo": "Comandi vocali che puoi usare",
  "vocale.aiuto.preparing": "«tavolo 3 in preparazione»",
  "vocale.aiuto.preparing.spiega": "la cucina lo prende in mano",
  "vocale.aiuto.ready": "«tavolo 3 pronto»",
  "vocale.aiuto.ready.spiega": "è al passe, da portare",
  "vocale.aiuto.served": "«tavolo 3 servito»",
  "vocale.aiuto.served.spiega": "è arrivato al tavolo",
  "vocale.aiuto.trattieni": "«ritarda il 3»",
  "vocale.aiuto.trattieni.spiega": "trattiene: la cucina non lo prepara",
  "vocale.aiuto.manda": "«manda il 3»",
  "vocale.aiuto.manda.spiega": "libera quello che era trattenuto",
  "vocale.aiuto.varianti":
    "Vanno bene anche «pronto il tre», «t7 servito», «aspetta il quattro»: il numero può essere detto a parole e l'ordine non conta.",
  "vocale.aiuto.cucina":
    " Segnare servito spetta alla sala: quel comando non ti risponde.",
  "vocale.aiuto.sala":
    " Segnare pronto spetta alla cucina: quel comando non ti risponde.",
  "vocale.non_capito": "Non ho capito: \"{frase}\"",
  "vocale.tavolo.vuoto": "Tavolo {tavolo}: nessuna comanda aperta",
  "vocale.tavolo.trattenuti": "Tavolo {tavolo}: {piatti} trattenuti",
  "vocale.tavolo.mandati": "Tavolo {tavolo}: {piatti} mandati",
  "vocale.tavolo.niente_trattenere": "Tavolo {tavolo}: niente da trattenere",
  "vocale.tavolo.niente_mandare": "Tavolo {tavolo}: niente da mandare",
  "vocale.tavolo.spostati": "Tavolo {tavolo}: {piatti} → {stato}",
  "vocale.tavolo.niente_spostare": "Tavolo {tavolo}: niente da spostare in {stato}",
  "vocale.piatti.uno": "{n} piatto",
  "vocale.piatti.molti": "{n} piatti",
  "vocale.errore.browser": "Questo browser non riconosce la voce. Usa Chrome o Safari.",
  "vocale.errore.microfono": "Microfono negato. Concedilo dalle impostazioni del browser.",
  "vocale.errore.interrotto": "Riconoscimento interrotto ({errore}).",
  "vocale.errore.avvio": "Non è stato possibile avviare il microfono.",

  // --- Avvisi -------------------------------------------------------------
  "avviso.scollegato":
    "Schermo non aggiornato: nessuna risposta dal server. Quello che vedi potrebbe non essere più vero.",
  "avviso.non_riuscito": "Non ha funzionato: controlla la connessione e riprova.",

  // --- Errori delle azioni ------------------------------------------------
  "errore.ruolo": "Il tuo ruolo non può fare questa modifica.",
  "errore.ruolo.ready": "Solo la cucina può segnare un piatto pronto.",
  "errore.ruolo.served": "Solo chi è in sala può segnare un piatto servito.",
  "errore.reparto": "Questa riga è del reparto {reparto}, su cui non operi.",
  "errore.gia_spostato": "Qualcuno l'ha già spostato: guarda lo stato aggiornato.",
  "errore.riga": "Riga non trovata o già servita",
  "errore.senza_locale": "Nessun locale associato.",

  // --- Stampa delle comande ----------------------------------------------
  "stampa.titolo": "Comande da stampare",
  "stampa.sottotitolo": "Fogli separati per ordine e reparto, pronti per la cucina.",
  "stampa.indietro": "← Torna agli ordini in corso",
  "stampa.conteggio.comande": "Comande",
  "stampa.conteggio.pezzi": "Pezzi",
  "stampa.conteggio.reparti": "Reparti",
  "stampa.intestazione": "Comande aperte · {quando}",
  "stampa.vuoto": "Nessuna comanda in corso.",
  "stampa.cliente": "Cliente: {nome}",
  "stampa.comanda": "Comanda #{numero}",
  "stampa.nota_ordine": "Nota ordine: {nota}",
  "stampa.pezzi.uno": "{n} pezzo",
  "stampa.pezzi.molti": "{n} pezzi",
  // Sul foglio la comanda in attesa è "In coda" e non "Da preparare": la
  // stampa la legge chi sta in cucina, che quella riga la deve ancora
  // prendere in mano. Voce sua perché la parola è diversa da quella dello
  // schermo, non per una svista.
  "stampa.stato.sent_to_kitchen": "In coda",

  // --- Storico ------------------------------------------------------------
  "storico.titolo": "Storico ordini",
  "storico.in_corso": "Ordini in corso",
  "storico.giorno_prima": "← Giorno prima",
  "storico.giorno_dopo": "Giorno dopo →",
  "storico.vai": "Vai",
  "storico.ordinato": "Ordinato",
  "storico.incassato": "Incassato",
  "storico.ordini": "Ordini",
  "storico.scarto":
    "Ordinato e incassato non coincidono quando un conto è stato pagato in contanti, è ancora aperto, oppure include una mancia.",
  "storico.piu_ordinati": "Più ordinati",
  "storico.vuoto": "Nessun ordine in questa giornata.",

  // --- Banco --------------------------------------------------------------
  "banco.titolo": "Banco",
  "banco.non_attivo":
    "I numeri di ritiro non sono attivi. Servono a chi consegna al bancone invece che al tavolo: si accendono in Impostazioni, insieme al modo di avvisare chi aspetta — segnaposto numerato, cercapersone o avviso sul telefono di chi ha ordinato.",
  "banco.ritiro.n": "N. {n}",
  "banco.conteggio": "{pronti} · {inCorso} in preparazione",
  "banco.pronti.uno": "{n} pronto",
  "banco.pronti.molti": "{n} pronti",
  "banco.metodo.segnaposto": "Consegna il piatto a chi ha il segnaposto con questo numero.",
  "banco.metodo.cercapersone": "Fai vibrare il cercapersone con questo numero.",
  "banco.metodo.telefono": "Sul telefono di chi ha ordinato compare «pronto» da solo.",
  "banco.sezione.pronti": "Pronti",
  "banco.sezione.in_preparazione": "In preparazione",
  "banco.pronti.vuoto": "Nessun ordine pronto. Compaiono qui appena la cucina li segna.",
  "banco.coda.vuota": "Niente in coda.",
  "banco.chiamato": "Chiamato",
  "banco.da_chiamare": "Da chiamare",
  "banco.di_ieri": "Rimasto da ieri",
  "banco.azione.chiama": "Chiama",
  "banco.azione.non_pronto": "Non era pronto",
  "banco.azione.ritirato": "Ritirato",
  "banco.esito.chiamato": "Numero {n} chiamato.",
  "banco.esito.ritirato": "Numero {n} ritirato.",
  "banco.esito.in_attesa": "Numero {n} rimesso in attesa.",
  "banco.errore.ordine": "Ordine non trovato",
};

const EN: Speculare<typeof IT> = {
  "comande.titolo": "Open orders",
  "comande.stampa": "Print tickets",
  "comande.senza_locale":
    "Your account is not linked to any venue. Ask the owner to add you to the staff.",
  "comande.vuoto": "No open orders.",
  "comande.vuoto.miei": "No orders on your tables.",

  "stato.pending": "To send",
  "stato.sent_to_kitchen": "To prep",
  "stato.preparing": "Prepping",
  "stato.ready": "Ready",
  "stato.served": "Served",

  "legenda.pending": "to send",
  "legenda.sent_to_kitchen": "queued",
  "legenda.preparing": "cooking",
  "legenda.ready": "ready",
  "legenda.served": "served",
  "legenda.ritardo": "late",

  "azione.sent_to_kitchen": "Start prep",
  "azione.preparing": "Mark ready",
  "azione.ready": "Mark served",
  "azione.trattieni": "Hold",
  "azione.manda": "Send now",
  "azione.trattieni.piatto": "Hold {piatto}",
  "azione.manda.piatto": "Send {piatto} now",
  "riga.trattenuto": "On hold — do not prep",
  "riga.portato": "served",

  "tavolo.etichetta": "Table",
  "tavolo.tutto_servito": "all served",
  "tavolo.attesa": "{n} min",
  "tavolo.attesa.ritardo": "{n} min · late",
  "tavolo.tutti_preparazione": "Start all ({n})",
  "tavolo.tutti_pronti": "All ready ({n})",
  "tavolo.tutti_serviti": "All served ({n})",
  "tavolo.manda_trattenuti": "Send the {n} on hold",
  "tavolo.trattieni": "Hold table",

  "filtro.schermo": "This screen:",
  "filtro.tutto": "All",
  "filtro.miei_tavoli": "My tables",
  "filtro.tutta_sala": "Whole floor",

  "reparto.cucina": "Kitchen",
  "reparto.bar": "Bar",
  "reparto.pizzeria": "Pizza station",
  "reparto.pasticceria": "Pastry",

  "reparto.minuscolo.cucina": "kitchen",
  "reparto.minuscolo.bar": "bar",
  "reparto.minuscolo.pizzeria": "pizza station",
  "reparto.minuscolo.pasticceria": "pastry",

  "vocale.attiva": "Voice command",
  "vocale.attivo": "Listening",
  "vocale.parla": "Speak to the table, not to the screen.",
  "vocale.non_disponibile": "Voice commands need Chrome or Safari.",
  "vocale.privacy":
    "While listening, the browser sends the audio to its own transcription service — on Chrome, to Google's servers. A kitchen talks about everything: switch it on when you need it and off afterwards.",
  "vocale.aiuto.titolo": "Voice commands you can use",
  "vocale.aiuto.preparing": "“table 3 cooking”",
  "vocale.aiuto.preparing.spiega": "the kitchen takes it on",
  "vocale.aiuto.ready": "“table 3 ready”",
  "vocale.aiuto.ready.spiega": "it's on the pass, to run",
  "vocale.aiuto.served": "“table 3 served”",
  "vocale.aiuto.served.spiega": "it reached the table",
  "vocale.aiuto.trattieni": "“hold table 3”",
  "vocale.aiuto.trattieni.spiega": "holds it: the kitchen won't start it",
  "vocale.aiuto.manda": "“send table 3”",
  "vocale.aiuto.manda.spiega": "releases what was on hold",
  "vocale.aiuto.varianti":
    "“ready table three”, “t7 served”, “wait on table four” work too: say the number in words if you like, the word order doesn't matter.",
  "vocale.aiuto.cucina": " Marking served is front of house: that command won't answer you.",
  "vocale.aiuto.sala": " Marking ready is the kitchen's call: that command won't answer you.",
  "vocale.non_capito": "Didn't catch that: \"{frase}\"",
  "vocale.tavolo.vuoto": "Table {tavolo}: no open order",
  "vocale.tavolo.trattenuti": "Table {tavolo}: {piatti} on hold",
  "vocale.tavolo.mandati": "Table {tavolo}: {piatti} sent",
  "vocale.tavolo.niente_trattenere": "Table {tavolo}: nothing to hold",
  "vocale.tavolo.niente_mandare": "Table {tavolo}: nothing to send",
  "vocale.tavolo.spostati": "Table {tavolo}: {piatti} → {stato}",
  "vocale.tavolo.niente_spostare": "Table {tavolo}: nothing to move to {stato}",
  "vocale.piatti.uno": "{n} dish",
  "vocale.piatti.molti": "{n} dishes",
  "vocale.errore.browser": "This browser has no speech recognition. Use Chrome or Safari.",
  "vocale.errore.microfono": "Microphone denied. Allow it in your browser settings.",
  "vocale.errore.interrotto": "Recognition stopped ({errore}).",
  "vocale.errore.avvio": "The microphone could not be started.",

  "avviso.scollegato":
    "Screen not updating: no answer from the server. What you see may no longer be true.",
  "avviso.non_riuscito": "That didn't work: check the connection and try again.",

  "errore.ruolo": "Your role cannot make this change.",
  "errore.ruolo.ready": "Only the kitchen can mark a dish ready.",
  "errore.ruolo.served": "Only front of house can mark a dish served.",
  "errore.reparto": "This item belongs to the {reparto} station, which you don't work.",
  "errore.gia_spostato": "Someone has already moved it: look at the updated status.",
  "errore.riga": "Item not found, or already served",
  "errore.senza_locale": "No venue linked.",

  "stampa.titolo": "Tickets to print",
  "stampa.sottotitolo": "One sheet per order and station, ready for the kitchen.",
  "stampa.indietro": "← Back to open orders",
  "stampa.conteggio.comande": "Tickets",
  "stampa.conteggio.pezzi": "Items",
  "stampa.conteggio.reparti": "Stations",
  "stampa.intestazione": "Open tickets · {quando}",
  "stampa.vuoto": "No open tickets.",
  "stampa.cliente": "Guest: {nome}",
  "stampa.comanda": "Ticket #{numero}",
  "stampa.nota_ordine": "Order note: {nota}",
  "stampa.pezzi.uno": "{n} item",
  "stampa.pezzi.molti": "{n} items",
  "stampa.stato.sent_to_kitchen": "Queued",

  "storico.titolo": "Order history",
  "storico.in_corso": "Open orders",
  "storico.giorno_prima": "← Previous day",
  "storico.giorno_dopo": "Next day →",
  "storico.vai": "Go",
  "storico.ordinato": "Ordered",
  "storico.incassato": "Taken",
  "storico.ordini": "Orders",
  "storico.scarto":
    "Ordered and taken differ when a bill was paid in cash, is still open, or includes a tip.",
  "storico.piu_ordinati": "Top sellers",
  "storico.vuoto": "No orders on this day.",

  "banco.titolo": "Counter",
  "banco.non_attivo":
    "Pickup numbers are off. They are for venues that hand over at the counter instead of serving at the table: switch them on in Settings, together with how waiting customers are called — numbered table stand, pager, or a notice on the phone of whoever ordered.",
  "banco.ritiro.n": "No. {n}",
  "banco.conteggio": "{pronti} · {inCorso} in prep",
  "banco.pronti.uno": "{n} ready",
  "banco.pronti.molti": "{n} ready",
  "banco.metodo.segnaposto": "Hand the food to whoever holds the stand with this number.",
  "banco.metodo.cercapersone": "Buzz the pager with this number.",
  "banco.metodo.telefono": "“Ready” appears by itself on the phone of whoever ordered.",
  "banco.sezione.pronti": "Ready",
  "banco.sezione.in_preparazione": "In prep",
  "banco.pronti.vuoto": "No orders ready. They show up here as soon as the kitchen marks them.",
  "banco.coda.vuota": "Nothing queued.",
  "banco.chiamato": "Called",
  "banco.da_chiamare": "To call",
  "banco.di_ieri": "Left over from yesterday",
  "banco.azione.chiama": "Call",
  "banco.azione.non_pronto": "Wasn't ready",
  "banco.azione.ritirato": "Picked up",
  "banco.esito.chiamato": "Number {n} called.",
  "banco.esito.ritirato": "Number {n} picked up.",
  "banco.esito.in_attesa": "Number {n} back to waiting.",
  "banco.errore.ordine": "Order not found",
};

export const tServizio = dizionario(IT, EN);
