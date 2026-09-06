import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Il guscio del gestionale: quello che si vede prima di entrare e quello che
 * resta intorno a ogni pagina una volta dentro.
 *
 * Pagina commerciale, accesso, registrazione, intestazione, navigazione,
 * avvisi. Sono le uniche schermate che vede anche chi non ha ancora un
 * account, quindi sono anche le prime a dover parlare inglese: un titolare
 * che non legge l'italiano si ferma qui, non alla pagina degli ordini.
 *
 * Sull'inglese: è quello del mestiere, non del vocabolario. "covers" per i
 * coperti, "table turn" per il giro di tavolo, "bill" e non "check" — il
 * locale è in Italia e il turista che legge l'inglese è più spesso europeo
 * che americano, come già la locale `en-GB` dei formattatori.
 *
 * I nomi fiscali italiani restano in italiano con la spiegazione fra
 * parentesi la prima volta che compaiono su una schermata: chi legge
 * "Partita IVA" qui la ritrova scritta uguale sul portale dell'Agenzia, e
 * "VAT number" invece lo lascerebbe a cercare.
 */

const IT = {
  // ---- Metadata dell'applicazione -----------------------------------
  "app.titolo": "Gestionale locale",
  "app.descrizione": "Tavoli, ordini, menu e prenotazioni del tuo locale.",

  // ---- Pagina commerciale: testata e apertura -----------------------
  "vetrina.meta.titolo": "Ordini e pagamenti al tavolo per ristoranti e bar",
  "vetrina.meta.descrizione":
    "Menu QR, ordine e pagamento al tavolo, conto alla romana, prenotazioni online e fattura elettronica. Con il marchio del tuo locale, e senza percentuali trattenute da noi sui tuoi incassi.",

  "vetrina.accedi": "Accedi",
  "vetrina.call": "Prenota una call",
  "vetrina.whatsapp.messaggio":
    "Buongiorno, vorrei prenotare una call per conoscere Tavolo.",
  "vetrina.whatsapp.contatta": "Contattaci su WhatsApp",

  "vetrina.badge": "Per ristoranti e bar in Italia",
  "vetrina.titolo": "I tuoi clienti ordinano e pagano dal tavolo.",
  "vetrina.sottotitolo":
    "Tu servi, non rincorri il POS. Menu QR, ordine, pagamento e prenotazioni — con il marchio del tuo locale. Le commissioni della carta le paghi al tuo fornitore, non a noi.",
  "vetrina.menu_vero": "Guarda un menu vero",
  "vetrina.prova.domanda": "Preferisci provare da solo?",
  "vetrina.prova.link": "Inizia {giorni} giorni gratis",
  "vetrina.prova.coda": ", senza carta.",

  // ---- Nastro scorrevole --------------------------------------------
  "vetrina.nastro.menuqr": "Menu QR",
  "vetrina.nastro.ordine": "Ordine al tavolo",
  "vetrina.nastro.romana": "Conto alla romana",
  "vetrina.nastro.applepay": "Apple Pay",
  "vetrina.nastro.satispay": "Satispay",
  "vetrina.nastro.prenotazioni": "Prenotazioni online",
  "vetrina.nastro.fattura": "Fattura elettronica",
  "vetrina.nastro.allergeni": "Allergeni a norma",
  "vetrina.nastro.marchio": "Il tuo marchio",
  "vetrina.nastro.percentuale": "Nessuna percentuale trattenuta",

  // ---- Come funziona -------------------------------------------------
  "vetrina.passi.titolo": "Quattro passaggi, nessuna attesa",

  "vetrina.passo.qr.titolo": "Il cliente inquadra il QR",
  "vetrina.passo.qr.testo":
    "Si apre il menu del locale sul suo telefono, con foto, ingredienti e allergeni. Nessuna app da scaricare.",
  "vetrina.passo.ordina.titolo": "Ordina dal tavolo",
  "vetrina.passo.ordina.testo":
    "Sceglie i piatti, aggiunge le note per la cucina, invia. L'ordine compare subito in gestionale.",
  "vetrina.passo.paga.titolo": "Paga quando vuole",
  "vetrina.passo.paga.testo":
    "Carta, Apple Pay, Google Pay o Satispay. Può dividere il conto per piatto o pagare tutto lui, e lasciare la mancia.",
  "vetrina.passo.libera.titolo": "Il tavolo si libera",
  "vetrina.passo.libera.testo":
    "Conto saldato, sessione chiusa. Nessuno aspetta il POS, e chi vuole la fattura la chiede dal telefono.",

  // ---- Funzioni ------------------------------------------------------
  "vetrina.funzioni.titolo": "Tutto quello che serve, già dentro",

  "vetrina.funzione.menu.titolo": "Menu sempre aggiornato",
  "vetrina.funzione.menu.testo":
    "Aggiungi, modifica, riordina e nascondi i piatti in tempo reale. Finito il branzino, lo togli e sparisce da tutti i tavoli nello stesso istante.",
  "vetrina.funzione.allergeni.titolo": "Allergeni a norma",
  "vetrina.funzione.allergeni.testo":
    "Campo dedicato su ogni piatto, come richiede il Reg. UE 1169/2011. Il cliente li legge da solo.",
  "vetrina.funzione.romana.titolo": "Conto alla romana",
  "vetrina.funzione.romana.testo":
    "Ognuno paga i propri piatti dal proprio telefono. Il conto si chiude da sé quando è tutto saldato.",
  "vetrina.funzione.prenotazioni.titolo": "Prenotazioni online",
  "vetrina.funzione.prenotazioni.testo":
    "Una pagina da mettere sul tuo sito e sui social. Le richieste arrivano dritte in gestionale, con il promemoria automatico il giorno prima e un link per disdire: il tavolo dimenticato si libera in tempo per darlo a qualcun altro.",
  "vetrina.funzione.recensioni.titolo": "Recensioni chieste al tavolo",
  "vetrina.funzione.recensioni.testo":
    "Appena finito di mangiare, col telefono già in mano. Chi è contento lo scrive anche pubblicamente; chi non lo è ti dice cosa non è andato, e lo leggi stasera invece che su Google fra una settimana.",
  "vetrina.funzione.banco.titolo": "Numero di ritiro al banco",
  "vetrina.funzione.banco.testo":
    "Piadineria, pizza al taglio, gastronomia: chi ordina prende un numero che riparte da uno ogni giorno. Avvisi come preferisci — segnaposto sul tavolo, cercapersone, o il numero che diventa «pronto» da solo sul telefono di chi ha ordinato. Sullo schermo del banco vedi cosa chiamare.",
  "vetrina.funzione.formula.titolo": "All you can eat",
  "vetrina.funzione.formula.testo":
    "Prezzo a persona, pranzo e cena separati, bambini a tariffa ridotta o gratis. Le ordinazioni a ondate, con l'attesa che decidi tu: senza, un tavolo da sei manda ottanta piatti in tre minuti e metà restano nel piatto.",
  "vetrina.funzione.marchio.titolo": "Il tuo marchio",
  "vetrina.funzione.marchio.testo":
    "Logo, colori e dati del locale su ogni pagina che vede il cliente. Il nostro nome non compare mai.",
  "vetrina.funzione.fattura.titolo": "Fattura elettronica",
  "vetrina.funzione.fattura.testo":
    "Il cliente inserisce i dati dal tavolo e la fattura parte allo SDI, tramite un intermediario che colleghi tu.",
  "vetrina.funzione.google.titolo": "Trovabile su Google e dalle AI",
  "vetrina.funzione.google.testo":
    "Il menu ha una pagina pubblica con dati strutturati: è quello che motori di ricerca e assistenti leggono e citano.",
  "vetrina.funzione.accessi.titolo": "Accessi separati",
  "vetrina.funzione.accessi.testo":
    "Titolare, responsabile, sala e cucina vedono solo il proprio. Chi è in sala non tocca incassi e dati fiscali.",
  "vetrina.funzione.importa.titolo": "Importazione del menu",
  "vetrina.funzione.importa.testo":
    "Da file CSV o TSV, oppure dalla cassa Tilby. Non si ribatte tutto a mano.",
  "vetrina.funzione.assistenza.titolo": "Assistenza dentro il gestionale",
  "vetrina.funzione.assistenza.testo":
    "Scrivi da qui, non su WhatsApp: la richiesta non vive nel telefono di chi l'ha ricevuta, e la risposta la ritrovi una settimana dopo dov'era.",

  // ---- Prezzo --------------------------------------------------------
  "vetrina.prezzo.titolo": "Un prezzo solo, scritto sul sito",
  "vetrina.prezzo.sottotitolo":
    "Nessun preventivo da chiedere, nessuna percentuale nascosta sul tuo incassato.",
  "vetrina.prezzo.consigliato": "Consigliato",
  "vetrina.prezzo.almese": "al mese",
  "vetrina.prezzo.attivazione": "+ {prezzo} di attivazione",
  "vetrina.prezzo.nota":
    "Sull'annuale due mesi sono in omaggio. L'attivazione si paga una sola volta e vale 449 € per le sole prenotazioni, 649 € dove ci sono anche gli ordini: comprende menu caricato, QR pronti da stampare, Stripe collegato e marchio configurato. Hai già la tua cassa? Prendi solo quello che ti manca: i moduli si comprano separati.",

  // I nomi dei piani stanno in `plans.ts`, che è condiviso e resta in
  // italiano: qui ci sono le versioni da mostrare, una per chiave di piano.
  "piano.ordini.titolo": "Ordini e pagamenti",
  "piano.ordini.testo":
    "Menu QR, ordine al tavolo, conto alla romana, fattura elettronica.",
  "piano.ordini.nota": "Disdetta in qualsiasi momento",
  "piano.prenotazioni.titolo": "Solo prenotazioni",
  "piano.prenotazioni.testo":
    "Pagina di prenotazione per il tuo sito, calendario e conferme.",
  "piano.prenotazioni.nota": "Senza gestionale di sala",
  "piano.completo.titolo": "Tutto",
  "piano.completo.testo": "Ordini, pagamenti e prenotazioni insieme.",
  "piano.completo.nota": "59 € in meno dei due separati",

  // ---- Confronto -----------------------------------------------------
  "vetrina.confronto.noi": "Noi",
  "vetrina.confronto.altri": "Gli altri in Italia",

  "confronto.canone.voce": "Canone",
  "confronto.canone.noi": "da 89 €/mese",
  "confronto.canone.altri": "29–249 €/mese",
  "confronto.attivazione.voce": "Costo di attivazione",
  "confronto.attivazione.noi": "449–649 €",
  "confronto.attivazione.altri": "0–600 €",
  "confronto.percentuale.voce": "Percentuale che tratteniamo noi",
  "confronto.percentuale.noi": "Nessuna",
  "confronto.percentuale.altri": "1,2–2% dell'incassato",
  "confronto.marchio.voce": "Il tuo marchio sulle pagine cliente",
  "confronto.marchio.noi": "Incluso",
  "confronto.marchio.altri": "Raro, o a pagamento",
  "confronto.fattura.voce": "Fattura elettronica dal tavolo",
  "confronto.fattura.noi": "Inclusa",
  "confronto.fattura.altri": "Quasi mai",
  "confronto.prenotazioni.voce": "Prenotazioni online incluse",
  "confronto.prenotazioni.noi": "Sì",
  "confronto.prenotazioni.altri": "Spesso a parte",
  "confronto.fornitore.voce": "Scegli tu il fornitore di pagamento",
  "confronto.fornitore.noi": "Sì",
  "confronto.fornitore.altri": "Quasi mai",
  "confronto.moduli.voce": "Compri solo il modulo che ti serve",
  "confronto.moduli.noi": "Sì",
  "confronto.moduli.altri": "Quasi mai",
  "confronto.promemoria.voce": "Promemoria e disdetta al cliente",
  "confronto.promemoria.noi": "Inclusi",
  "confronto.promemoria.altri": "Solo sui portali, con commissione",
  "confronto.formula.voce": "Formula a prezzo fisso (all you can eat)",
  "confronto.formula.noi": "Inclusa",
  "confronto.formula.altri": "Rara",
  "confronto.banco.voce": "Numero di ritiro al banco",
  "confronto.banco.noi": "Incluso",
  "confronto.banco.altri": "Di solito un sistema a parte",

  // ---- Come si paga --------------------------------------------------
  "vetrina.pagamenti.titolo": "Come si paga davvero",
  "vetrina.pagamenti.forte": "Noi non prendiamo nulla sui tuoi incassi.",
  "vetrina.pagamenti.uno":
    "Le commissioni della carta le paghi al tuo fornitore di pagamento, non a noi, e il denaro arriva sul tuo conto senza passare da noi.",
  "vetrina.pagamenti.due":
    "Chi ti offre un canone basso e una percentuale unica sta incassando lui e girandoti il resto. A volte quella percentuale conviene, soprattutto con volumi bassi. Quello che perdi è il rapporto diretto: non puoi negoziare la tariffa, non puoi cambiare fornitore senza cambiare gestionale, e il giorno che cresci la percentuale cresce con te.",
  "vetrina.pagamenti.tre":
    "Da noi il fornitore di pagamento è tuo. Se hai già un POS e un acquirer che ti fa una tariffa buona, tienili: il conto si chiude segnando l'incasso sul tuo terminale e il tavolo si libera lo stesso.",
  "vetrina.prezzo.piede":
    "Prezzi IVA esclusa. L'attivazione è una sola volta e comprende il menu caricato, i QR pronti da stampare, Stripe collegato e il marchio configurato. La colonna di destra riporta i listini pubblici dei concorrenti italiani a settembre 2026; molti non pubblicano i propri prezzi.",

  // ---- Solo prenotazioni ---------------------------------------------
  "vetrina.soloprenotazioni.titolo": "Solo prenotazioni, se è quello che ti serve",
  "vetrina.soloprenotazioni.testo":
    "Una pagina di prenotazione da mettere sul tuo sito e nei profili social. Il cliente sceglie giorno, ora e persone; tu ricevi la richiesta per email e la confermi o la rifiuti dal calendario.",
  "vetrina.soloprenotazioni.capienza":
    "— Controllo capienza: se quell'ora è piena, il sistema lo dice subito",
  "vetrina.soloprenotazioni.alternative":
    "— Rifiutando, al cliente arrivano gli orari vicini in cui c'è posto",
  "vetrina.soloprenotazioni.calendario":
    "— Calendario del mese con coperti e richieste da confermare",
  "vetrina.soloprenotazioni.automatica":
    "— Conferma automatica, se preferisci non rispondere a mano",
  "vetrina.soloprenotazioni.noshow":
    "— Arrivi e no-show segnati, per sapere su chi contare",
  "vetrina.soloprenotazioni.sola":
    "— Funziona da sola: non serve il resto del gestionale",
  "vetrina.soloprenotazioni.prova": "Prova la pagina di prenotazione",

  // ---- Cosa serve ----------------------------------------------------
  "vetrina.serve.titolo": "Cosa serve per partire",
  "vetrina.serve.stripe": "Un account Stripe del locale, per incassare. La verifica è di Stripe.",
  "vetrina.serve.dati": "I dati del locale: indirizzo, telefono, partita IVA.",
  "vetrina.serve.menu": "Il menu, da caricare da file o scrivere in gestionale.",
  "vetrina.serve.qr": "Una stampa dei QR, uno per tavolo, che generi tu.",
  "vetrina.serve.nota":
    "Per la fattura elettronica serve in più un intermediario SDI accreditato; per il collegamento alla cassa Tilby, l'adesione al loro programma per sviluppatori.",

  // ---- Chiusura ------------------------------------------------------
  "vetrina.chiusura.titolo": "Provalo sul tuo menu, non sul nostro",
  "vetrina.chiusura.testo":
    "{giorni} giorni per caricare i tuoi piatti, stampare i QR e far provare il servizio a un tavolo vero.",
  "vetrina.chiusura.prova": "Comincia la prova",
  "vetrina.chiusura.gia": "Hai già un account?",

  "vetrina.piede.claim": "Ordini e pagamenti al tavolo per ristoranti e bar.",
  "vetrina.piede.privacy": "Privacy",
  "vetrina.piede.dpa": "Trattamento dati",
  "vetrina.piede.cookie": "Cookie",

  // ---- Accesso -------------------------------------------------------
  "accesso.titolo": "Accesso staff",
  "accesso.sottotitolo": "Gestisci tavoli, ordini e menu del tuo locale.",
  "accesso.email": "Email",
  "accesso.password": "Password",
  "accesso.errore": "Email o password non corretti",
  "accesso.in_corso": "Accesso...",
  "accesso.entra": "Accedi",
  "accesso.registra": "Registra un nuovo locale",

  // ---- Registrazione -------------------------------------------------
  "registrazione.fatto.titolo": "Locale creato",
  "registrazione.fatto.testo":
    "Ora puoi accedere e trovare i QR dei tavoli già pronti da stampare in Gestione tavoli.",
  "registrazione.fatto.vai": "Vai al login",
  "registrazione.titolo": "Registra il tuo locale",
  "registrazione.sottotitolo":
    "Bastano un minuto e il numero di tavoli: i QR li generiamo noi.",
  "registrazione.nome": "Nome del locale",
  "registrazione.email": "Email",
  "registrazione.password": "Password (min 8 caratteri)",
  "registrazione.tavoli": "Quanti tavoli",
  "registrazione.tavoli.nota":
    "Creiamo subito un QR per ogni tavolo. Potrai aggiungerne o toglierne dopo.",
  "registrazione.dpa.prima": "Ho letto e accetto la",
  "registrazione.dpa.nomina": "nomina a responsabile del trattamento",
  // Attaccato al link che segue in italiano ("l'informativa"), staccato in
  // inglese: lo spazio finale sta nella voce, non nel JSX.
  "registrazione.dpa.mezzo": "e l'",
  "registrazione.dpa.privacy": "informativa privacy",
  "registrazione.dpa.dopo": ". Resto titolare dei dati dei miei clienti.",
  "registrazione.in_corso": "Creazione...",
  "registrazione.crea": "Crea locale",
  "registrazione.gia": "Ho già un account",

  // ---- Guscio del gestionale -----------------------------------------
  "guscio.salta": "Vai al contenuto",
  "guscio.senza_nome": "Gestionale",
  "guscio.esci": "Esci",
  "guscio.nessun_locale": "Nessun locale associato a questo utente.",

  "guscio.manca.piva": "la partita IVA",
  "guscio.manca.indirizzo": "l'indirizzo",
  "guscio.manca.contatto": "un contatto per i clienti",

  // ---- Navigazione ---------------------------------------------------
  "nav.etichetta": "Sezioni del gestionale",
  "nav.menu": "Menu",
  "nav.apri": "menu",
  "nav.chiudi": "chiudi",

  "nav.tavoli": "Tavoli",
  "nav.avvio": "Primi passi",
  "nav.ordini": "Ordini",
  "nav.banco": "Banco",
  "nav.prenotazioni": "Prenotazioni",
  "nav.menu_locale": "Menu",
  "nav.qr": "QR e tavoli",
  "nav.analisi": "Analisi",
  "nav.fatture": "Fatture",
  "nav.fiscale": "Corrispettivi",
  "nav.recensioni": "Recensioni",
  "nav.staff": "Personale",
  "nav.impostazioni": "Impostazioni",
  "nav.abbonamento": "Abbonamento",
  "nav.assistenza": "Assistenza",

  // ---- Avvisi in tempo reale -----------------------------------------
  "avvisi.tavolo": "Tavolo {tavolo}:",
  "avvisi.contanti.fattura": "paga in contanti — porta la fattura",
  "avvisi.contanti.scontrino": "paga in contanti — porta lo scontrino",
  "avvisi.conto": "chiede il conto",
  "avvisi.cameriere": "chiama il cameriere",
  "avvisi.sala": "Vai in sala",
  "avvisi.nuova": "Nuova prenotazione:",
  "avvisi.daconfermare.uno": "{n} richiesta da confermare",
  "avvisi.daconfermare.molti": "{n} richieste da confermare",
  "avvisi.vedi": "Vedi",

  // ---- Avviso di conformità in cima al gestionale ---------------------
  "conformita.dpa.testo":
    "Per trattare i dati dei tuoi clienti serve un accordo scritto fra te, che ne sei titolare, e noi che li trattiamo per tuo conto.",
  "conformita.dpa.link": "Leggi la nomina a responsabile",
  "conformita.dpa.registro": "Registro…",
  "conformita.dpa.accetto": "Accetto",
  // Singolare e plurale: "manca l'indirizzo" ma "mancano l'indirizzo e la
  // partita IVA". In inglese cambia il verbo allo stesso modo.
  "conformita.dati.uno":
    "L'informativa privacy mostrata ai tuoi clienti è incompleta: manca {elenco}.",
  "conformita.dati.molti":
    "L'informativa privacy mostrata ai tuoi clienti è incompleta: mancano {elenco}.",
  "conformita.dati.link": "Completa i dati del locale",

  // ---- Prima password, scelta da chi entra con quella data a voce ------
  "primaccesso.titolo": "Scegli la tua password",
  "primaccesso.spiegazione":
    "Quella con cui sei entrato ti è stata comunicata a voce per darti il primo accesso: da quel momento non è più solo tua. Scegline una tu.",
  "primaccesso.nuova": "Nuova password",
  "primaccesso.ripeti": "Ripetila",
  "primaccesso.regola": "Almeno 10 caratteri, non solo numeri.",
  "primaccesso.salvo": "Salvo…",
  "primaccesso.salva": "Salva e entra",
  "primaccesso.errore.non_autorizzato": "Non autorizzato",
  "primaccesso.errore.corta": "Almeno 10 caratteri",
  "primaccesso.errore.diverse": "Le due password non coincidono",
  "primaccesso.errore.solo_numeri": "Non solo numeri: aggiungi lettere",

  // ---- Errori della registrazione -------------------------------------
  "registrazione.errore.troppi": "Troppi tentativi, riprova più tardi",
  "registrazione.errore.campi": "Nome locale ed email sono obbligatori",
  "registrazione.errore.password": "La password deve essere di almeno 8 caratteri",
  "registrazione.errore.tavoli": "Numero tavoli non valido (1-200)",
  "registrazione.errore.dpa":
    "Per procedere devi accettare la nomina a responsabile del trattamento",
  "registrazione.errore.email_presa": "Esiste già un account con questa email",
  "registrazione.errore.generico": "Registrazione non riuscita, riprova",

  // ---- Modulo non attivo ---------------------------------------------
  "modulo.ordini": "Ordini e pagamenti",
  "modulo.prenotazioni": "Prenotazioni",
  "modulo.titolo": "{nome} non è attivo",
  "modulo.testo.prima": "Questa parte del gestionale fa parte del modulo",
  "modulo.testo.dopo":
    ", che il tuo abbonamento non comprende — o non è più attivo.",
  "modulo.abbonamento": "Vedi l'abbonamento",
};

const EN: Speculare<typeof IT> = {
  "app.titolo": "Venue back office",
  "app.descrizione": "Tables, orders, menu and bookings for your venue.",

  "vetrina.meta.titolo": "Order and pay at the table, for restaurants and bars",
  "vetrina.meta.descrizione":
    "QR menu, ordering and payment at the table, split the bill, online bookings and e-invoicing (fattura elettronica). Under your own branding, and with no cut of your takings kept by us.",

  "vetrina.accedi": "Sign in",
  "vetrina.call": "Book a call",
  "vetrina.whatsapp.messaggio":
    "Hello, I would like to book a call to find out about Tavolo.",
  "vetrina.whatsapp.contatta": "Contact us on WhatsApp",

  "vetrina.badge": "For restaurants and bars in Italy",
  "vetrina.titolo": "Your guests order and pay from the table.",
  "vetrina.sottotitolo":
    "You serve, instead of chasing the card machine. QR menu, ordering, payment and bookings — under your own branding. Card fees you pay to your provider, not to us.",
  "vetrina.menu_vero": "See a real menu",
  "vetrina.prova.domanda": "Would you rather try it yourself?",
  "vetrina.prova.link": "Start {giorni} days free",
  "vetrina.prova.coda": ", no card needed.",

  "vetrina.nastro.menuqr": "QR menu",
  "vetrina.nastro.ordine": "Table ordering",
  "vetrina.nastro.romana": "Split the bill",
  "vetrina.nastro.applepay": "Apple Pay",
  "vetrina.nastro.satispay": "Satispay",
  "vetrina.nastro.prenotazioni": "Online bookings",
  "vetrina.nastro.fattura": "E-invoicing (fattura elettronica)",
  "vetrina.nastro.allergeni": "Allergens to EU law",
  "vetrina.nastro.marchio": "Your branding",
  "vetrina.nastro.percentuale": "No cut of your takings",

  "vetrina.passi.titolo": "Four steps, no waiting",

  "vetrina.passo.qr.titolo": "The guest scans the QR code",
  "vetrina.passo.qr.testo":
    "Your menu opens on their phone, with photos, ingredients and allergens. No app to download.",
  "vetrina.passo.ordina.titolo": "They order from the table",
  "vetrina.passo.ordina.testo":
    "They pick the dishes, add notes for the kitchen, send. The order shows up in the back office straight away.",
  "vetrina.passo.paga.titolo": "They pay when they want",
  "vetrina.passo.paga.testo":
    "Card, Apple Pay, Google Pay or Satispay. They can split the bill dish by dish or pay for everyone, and leave a tip.",
  "vetrina.passo.libera.titolo": "The table turns",
  "vetrina.passo.libera.testo":
    "Bill settled, session closed. Nobody waits for the card machine, and anyone who wants an invoice asks for it from their phone.",

  "vetrina.funzioni.titolo": "Everything you need, already inside",

  "vetrina.funzione.menu.titolo": "A menu that is always current",
  "vetrina.funzione.menu.testo":
    "Add, edit, reorder and hide dishes in real time. Out of sea bass, you take it off and it disappears from every table at the same instant.",
  "vetrina.funzione.allergeni.titolo": "Allergens to EU law",
  "vetrina.funzione.allergeni.testo":
    "A dedicated field on every dish, as required by Reg. EU 1169/2011. The guest reads them without asking.",
  "vetrina.funzione.romana.titolo": "Split the bill",
  "vetrina.funzione.romana.testo":
    "Everyone pays for their own dishes from their own phone. The bill closes itself once it is all settled.",
  "vetrina.funzione.prenotazioni.titolo": "Online bookings",
  "vetrina.funzione.prenotazioni.testo":
    "A page for your website and your social profiles. Requests land straight in the back office, with an automatic reminder the day before and a link to cancel: the forgotten table frees up in time to give it to someone else.",
  "vetrina.funzione.recensioni.titolo": "Reviews asked for at the table",
  "vetrina.funzione.recensioni.testo":
    "Right after the meal, phone still in hand. Guests who are happy will say so publicly too; those who are not tell you what went wrong, and you read it tonight instead of on Google in a week.",
  "vetrina.funzione.banco.titolo": "Counter pickup numbers",
  "vetrina.funzione.banco.testo":
    "Piadina bar, pizza by the slice, deli counter: whoever orders takes a number that restarts from one every day. You call them however you like — a table marker, a pager, or the number turning to “ready” by itself on the phone of whoever ordered. The counter screen shows you what to call.",
  "vetrina.funzione.formula.titolo": "All you can eat",
  "vetrina.funzione.formula.testo":
    "A price per person, lunch and dinner kept apart, children at a reduced rate or free. Orders in waves, with the wait you set: without it, a table of six sends eighty dishes in three minutes and half stay on the plate.",
  "vetrina.funzione.marchio.titolo": "Your branding",
  "vetrina.funzione.marchio.testo":
    "Logo, colours and venue details on every page the guest sees. Our name never appears.",
  "vetrina.funzione.fattura.titolo": "E-invoicing (fattura elettronica)",
  "vetrina.funzione.fattura.testo":
    "The guest enters the details from the table and the invoice goes to the SDI (the exchange system of the Italian revenue agency), through an intermediary you connect yourself.",
  "vetrina.funzione.google.titolo": "Found on Google and by AI",
  "vetrina.funzione.google.testo":
    "The menu has a public page with structured data: that is what search engines and assistants read and quote.",
  "vetrina.funzione.accessi.titolo": "Separate logins",
  "vetrina.funzione.accessi.testo":
    "Owner, manager, front of house and kitchen each see only their own. Whoever is on the floor does not touch takings and tax data.",
  "vetrina.funzione.importa.titolo": "Menu import",
  "vetrina.funzione.importa.testo":
    "From a CSV or TSV file, or from the Tilby till. Nothing is retyped by hand.",
  "vetrina.funzione.assistenza.titolo": "Support inside the back office",
  "vetrina.funzione.assistenza.testo":
    "Write from here, not on WhatsApp: the request does not live in the phone of whoever received it, and a week later you find the answer where you left it.",

  "vetrina.prezzo.titolo": "One price, published on the site",
  "vetrina.prezzo.sottotitolo":
    "No quote to ask for, no hidden cut of your takings.",
  "vetrina.prezzo.consigliato": "Recommended",
  "vetrina.prezzo.almese": "per month",
  "vetrina.prezzo.attivazione": "+ {prezzo} setup",
  "vetrina.prezzo.nota":
    "On the annual plan two months are free. Setup is paid once and costs € 449 for bookings alone, € 649 where there are orders too: it covers the menu loaded, QR codes ready to print, Stripe connected and your branding set up. Already have a till? Take only what you are missing: the modules are sold separately.",

  "piano.ordini.titolo": "Orders and payments",
  "piano.ordini.testo":
    "QR menu, table ordering, split the bill, e-invoicing (fattura elettronica).",
  "piano.ordini.nota": "Cancel at any time",
  "piano.prenotazioni.titolo": "Bookings only",
  "piano.prenotazioni.testo":
    "A booking page for your website, calendar and confirmations.",
  "piano.prenotazioni.nota": "Without the floor back office",
  "piano.completo.titolo": "Everything",
  "piano.completo.testo": "Orders, payments and bookings together.",
  "piano.completo.nota": "€ 59 less than the two apart",

  "vetrina.confronto.noi": "Us",
  "vetrina.confronto.altri": "The others in Italy",

  "confronto.canone.voce": "Subscription",
  "confronto.canone.noi": "from € 89/month",
  "confronto.canone.altri": "€ 29–249/month",
  "confronto.attivazione.voce": "Setup fee",
  "confronto.attivazione.noi": "€ 449–649",
  "confronto.attivazione.altri": "€ 0–600",
  "confronto.percentuale.voce": "Percentage we keep",
  "confronto.percentuale.noi": "None",
  "confronto.percentuale.altri": "1.2–2% of takings",
  "confronto.marchio.voce": "Your branding on guest pages",
  "confronto.marchio.noi": "Included",
  "confronto.marchio.altri": "Rare, or paid for",
  "confronto.fattura.voce": "E-invoicing (fattura elettronica) from the table",
  "confronto.fattura.noi": "Included",
  "confronto.fattura.altri": "Almost never",
  "confronto.prenotazioni.voce": "Online bookings included",
  "confronto.prenotazioni.noi": "Yes",
  "confronto.prenotazioni.altri": "Often separate",
  "confronto.fornitore.voce": "You choose the payment provider",
  "confronto.fornitore.noi": "Yes",
  "confronto.fornitore.altri": "Almost never",
  "confronto.moduli.voce": "You buy only the module you need",
  "confronto.moduli.noi": "Yes",
  "confronto.moduli.altri": "Almost never",
  "confronto.promemoria.voce": "Reminders and guest cancellation",
  "confronto.promemoria.noi": "Included",
  "confronto.promemoria.altri": "Only on portals, for a commission",
  "confronto.formula.voce": "Fixed-price formula (all you can eat)",
  "confronto.formula.noi": "Included",
  "confronto.formula.altri": "Rare",
  "confronto.banco.voce": "Counter pickup number",
  "confronto.banco.noi": "Included",
  "confronto.banco.altri": "Usually a separate system",

  "vetrina.pagamenti.titolo": "How you actually get paid",
  "vetrina.pagamenti.forte": "We take nothing out of your takings.",
  "vetrina.pagamenti.uno":
    "Card fees you pay to your own payment provider, not to us, and the money reaches your account without passing through us.",
  "vetrina.pagamenti.due":
    "Anyone offering you a low subscription and a single percentage is taking the money in themselves and passing you the rest. Sometimes that percentage is worth it, especially at low volumes. What you lose is the direct relationship: you cannot negotiate the rate, you cannot change provider without changing back office, and the day you grow the percentage grows with you.",
  "vetrina.pagamenti.tre":
    "With us the payment provider is yours. If you already have a card machine and an acquirer giving you a good rate, keep them: the bill closes by recording the payment on your own terminal and the table turns just the same.",
  "vetrina.prezzo.piede":
    "Prices exclude IVA (Italian VAT). Setup is one-off and covers the menu loaded, the QR codes ready to print, Stripe connected and your branding set up. The right-hand column reports the public price lists of Italian competitors as of September 2026; many do not publish their prices.",

  "vetrina.soloprenotazioni.titolo": "Bookings only, if that is all you need",
  "vetrina.soloprenotazioni.testo":
    "A booking page to put on your website and your social profiles. The guest picks day, time and number of people; you get the request by email and confirm or decline it from the calendar.",
  "vetrina.soloprenotazioni.capienza":
    "— Capacity check: if that time is full, the system says so at once",
  "vetrina.soloprenotazioni.alternative":
    "— When you decline, the guest gets the nearby times where there is room",
  "vetrina.soloprenotazioni.calendario":
    "— Month calendar with covers and requests to confirm",
  "vetrina.soloprenotazioni.automatica":
    "— Automatic confirmation, if you would rather not reply by hand",
  "vetrina.soloprenotazioni.noshow":
    "— Arrivals and no-shows recorded, so you know who to count on",
  "vetrina.soloprenotazioni.sola":
    "— It works on its own: the rest of the back office is not needed",
  "vetrina.soloprenotazioni.prova": "Try the booking page",

  "vetrina.serve.titolo": "What it takes to start",
  "vetrina.serve.stripe":
    "A Stripe account in the venue's name, to take payment. Verification is Stripe's own.",
  "vetrina.serve.dati":
    "The venue details: address, phone, Partita IVA (Italian VAT number).",
  "vetrina.serve.menu":
    "The menu, loaded from a file or written in the back office.",
  "vetrina.serve.qr":
    "A print run of the QR codes, one per table, that you generate yourself.",
  "vetrina.serve.nota":
    "E-invoicing also needs an accredited SDI intermediary; connecting the Tilby till needs you to join their developer programme.",

  "vetrina.chiusura.titolo": "Try it on your menu, not on ours",
  "vetrina.chiusura.testo":
    "{giorni} days to load your dishes, print the QR codes and let a real table try the service.",
  "vetrina.chiusura.prova": "Start the trial",
  "vetrina.chiusura.gia": "Already have an account?",

  "vetrina.piede.claim": "Order and pay at the table, for restaurants and bars.",
  "vetrina.piede.privacy": "Privacy",
  "vetrina.piede.dpa": "Data processing",
  "vetrina.piede.cookie": "Cookies",

  "accesso.titolo": "Staff sign-in",
  "accesso.sottotitolo": "Run your venue's tables, orders and menu.",
  "accesso.email": "Email",
  "accesso.password": "Password",
  "accesso.errore": "Email or password not correct",
  "accesso.in_corso": "Signing in...",
  "accesso.entra": "Sign in",
  "accesso.registra": "Register a new venue",

  "registrazione.fatto.titolo": "Venue created",
  "registrazione.fatto.testo":
    "You can sign in now and find the table QR codes ready to print under Table management.",
  "registrazione.fatto.vai": "Go to sign-in",
  "registrazione.titolo": "Register your venue",
  "registrazione.sottotitolo":
    "All it takes is a minute and the number of tables: we generate the QR codes.",
  "registrazione.nome": "Venue name",
  "registrazione.email": "Email",
  "registrazione.password": "Password (min 8 characters)",
  "registrazione.tavoli": "How many tables",
  "registrazione.tavoli.nota":
    "We create a QR code for each table right away. You can add or remove them later.",
  "registrazione.dpa.prima": "I have read and accept the",
  "registrazione.dpa.nomina": "appointment as data processor",
  "registrazione.dpa.mezzo": "and the ",
  "registrazione.dpa.privacy": "privacy notice",
  "registrazione.dpa.dopo": ". I remain the controller of my customers' data.",
  "registrazione.in_corso": "Creating...",
  "registrazione.crea": "Create venue",
  "registrazione.gia": "I already have an account",

  "guscio.salta": "Skip to content",
  "guscio.senza_nome": "Back office",
  "guscio.esci": "Sign out",
  "guscio.nessun_locale": "No venue linked to this user.",

  "guscio.manca.piva": "the Partita IVA (Italian VAT number)",
  "guscio.manca.indirizzo": "the address",
  "guscio.manca.contatto": "a contact for guests",

  "nav.etichetta": "Back office sections",
  "nav.menu": "Menu",
  "nav.apri": "menu",
  "nav.chiudi": "close",

  "nav.tavoli": "Tables",
  "nav.avvio": "Getting started",
  "nav.ordini": "Orders",
  "nav.banco": "Counter",
  "nav.prenotazioni": "Bookings",
  "nav.menu_locale": "Menu",
  "nav.qr": "QR codes and tables",
  "nav.analisi": "Reports",
  "nav.fatture": "Invoices",
  // Il registro dei corrispettivi è un istituto italiano: tradurlo in
  // "daily takings" e basta lascerebbe il commercialista senza la parola
  // che poi deve cercare sul portale dell'Agenzia.
  "nav.fiscale": "Corrispettivi (takings)",
  "nav.recensioni": "Reviews",
  "nav.staff": "Staff",
  "nav.impostazioni": "Settings",
  "nav.abbonamento": "Subscription",
  "nav.assistenza": "Support",

  "avvisi.tavolo": "Table {tavolo}:",
  "avvisi.contanti.fattura": "paying cash — take the invoice over",
  "avvisi.contanti.scontrino": "paying cash — take the scontrino (receipt) over",
  "avvisi.conto": "asking for the bill",
  "avvisi.cameriere": "calling a waiter",
  "avvisi.sala": "Go to the floor",
  "avvisi.nuova": "New booking:",
  "avvisi.daconfermare.uno": "{n} request to confirm",
  "avvisi.daconfermare.molti": "{n} requests to confirm",
  "avvisi.vedi": "View",

  "conformita.dpa.testo":
    "To handle your guests' data there has to be a written agreement between you, who are the controller, and us, who process it on your behalf.",
  "conformita.dpa.link": "Read the processor appointment",
  "conformita.dpa.registro": "Recording…",
  "conformita.dpa.accetto": "I accept",
  "conformita.dati.uno":
    "The privacy notice shown to your guests is incomplete: {elenco} is missing.",
  "conformita.dati.molti":
    "The privacy notice shown to your guests is incomplete: {elenco} are missing.",
  "conformita.dati.link": "Fill in the venue details",

  "primaccesso.titolo": "Choose your own password",
  "primaccesso.spiegazione":
    "The one you signed in with was told to you out loud so you could get in the first time: from that moment it is no longer only yours. Pick one yourself.",
  "primaccesso.nuova": "New password",
  "primaccesso.ripeti": "Repeat it",
  "primaccesso.regola": "At least 10 characters, not digits only.",
  "primaccesso.salvo": "Saving…",
  "primaccesso.salva": "Save and go in",
  "primaccesso.errore.non_autorizzato": "Not authorised",
  "primaccesso.errore.corta": "At least 10 characters",
  "primaccesso.errore.diverse": "The two passwords don't match",
  "primaccesso.errore.solo_numeri": "Not digits only: add some letters",

  "registrazione.errore.troppi": "Too many attempts, try again later",
  "registrazione.errore.campi": "Venue name and email are required",
  "registrazione.errore.password": "The password has to be at least 8 characters",
  "registrazione.errore.tavoli": "That number of tables isn't valid (1-200)",
  "registrazione.errore.dpa":
    "To carry on you have to accept the processor appointment",
  "registrazione.errore.email_presa": "An account with this email already exists",
  "registrazione.errore.generico": "Sign-up didn't go through, try again",

  "modulo.ordini": "Orders and payments",
  "modulo.prenotazioni": "Bookings",
  "modulo.titolo": "{nome} is not active",
  "modulo.testo.prima": "This part of the back office belongs to the",
  "modulo.testo.dopo":
    " module, which your subscription does not include — or which is no longer active.",
  "modulo.abbonamento": "See the subscription",
};

export const tGuscio = dizionario(IT, EN);
