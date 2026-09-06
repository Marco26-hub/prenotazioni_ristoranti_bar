import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Analisi, primo avvio, vetrina e documenti legali.
 *
 * Quattro cose diverse tenute insieme perché le legge la stessa persona nello
 * stesso momento della sua vita: il titolare, da solo, quando decide se
 * comprare il servizio e quando decide se sta funzionando. La pagina
 * commerciale, la lista di cosa manca per aprire, i numeri di fine mese e i
 * due documenti che deve accettare prima di partire.
 *
 * Sull'inglese dei numeri: "covers" per i coperti, "station" per il reparto,
 * "turnover" per la rotazione dei tavoli. Sono le parole del mestiere, non del
 * vocabolario: chi ha lavorato in una brigata inglese le riconosce, chi legge
 * una traduzione letterale non capisce di cosa si parla.
 *
 * Sull'inglese dei documenti: i termini fiscali e gli organi italiani restano
 * in italiano — "Partita IVA", "Codice Fiscale", "Codice Destinatario", "SDI",
 * "Registratore Telematico", "corrispettivi", "Garante" — e si spiegano fra
 * parentesi la prima volta. Un commercialista che legge "VAT number" e poi
 * deve compilare un campo che dice "Partita IVA" si ferma; e in un accordo
 * art. 28 il nome dell'autorità di controllo è il nome, non una traduzione.
 *
 * Privacy e DPA hanno in cima una riga che dichiara che fa fede l'italiano:
 * la traduzione serve a capire, non a firmare.
 */

const IT = {
  // Comuni all'area
  "errore.nessun_locale": "Nessun locale associato.",

  /* --- Analisi ------------------------------------------------------- */
  "analisi.titolo": "Analisi",
  "analisi.solo_titolare": "Solo il titolare e il responsabile vedono i dati economici.",
  "analisi.periodo.giorni.uno": "{n} giorno",
  "analisi.periodo.giorni.molti": "{n} giorni",
  "analisi.stampa.riga": "{locale} · {periodo} · stampato il {data}",
  "analisi.stampa.pulsante": "Stampa o salva PDF",
  "analisi.vuoto":
    "Nessun tavolo chiuso in questo periodo. I numeri compaiono man mano che si chiudono i conti.",

  "analisi.scheda.incasso": "Incasso",
  "analisi.scheda.incasso.nota.uno": "{n} tavolo servito",
  "analisi.scheda.incasso.nota.molti": "{n} tavoli serviti",
  "analisi.scheda.per_coperto": "Spesa per coperto",
  "analisi.scheda.per_coperto.nota.uno": "{n} coperto in totale",
  "analisi.scheda.per_coperto.nota.molti": "{n} coperti in totale",
  "analisi.scheda.per_tavolo": "Spesa per tavolo",
  "analisi.scheda.per_tavolo.nota": "{persone} persone a tavolo",
  "analisi.scheda.piatti_per_persona": "Piatti per persona",
  "analisi.scheda.piatti_per_persona.nota.uno": "{n} piatto in totale",
  "analisi.scheda.piatti_per_persona.nota.molti": "{n} piatti in totale",

  "analisi.scheda.permanenza": "Permanenza media",
  "analisi.scheda.permanenza.nota": "Dall'apertura alla chiusura del conto",
  "analisi.durata.ore": "{ore}h {minuti}",
  "analisi.durata.minuti": "{n} min",
  "analisi.scheda.rotazione": "Rotazione tavoli",
  "analisi.scheda.rotazione.nota": "Tavoli serviti al giorno",
  "analisi.scheda.coperti_giorno": "Coperti al giorno",
  "analisi.scheda.prezzo_medio": "Prezzo medio del piatto",

  "analisi.giorni.titolo": "Giorno per giorno",
  "analisi.giorni.tavoli.uno": "{n} tavolo",
  "analisi.giorni.tavoli.molti": "{n} tavoli",
  "analisi.giorni.coperti.uno": "{n} coperto",
  "analisi.giorni.coperti.molti": "{n} coperti",

  "analisi.piatti.titolo": "Cosa vende",
  "analisi.piatti.sottotitolo":
    "I dodici più ordinati. Quello che non compare qui, e che è a menu da mesi, probabilmente non serve.",
  "analisi.piatti.pezzi": "{n} pz",

  "analisi.metodi.titolo": "Come pagano",
  "analisi.metodi.pagamenti.uno": "{n} pagamento",
  "analisi.metodi.pagamenti.molti": "{n} pagamenti",
  "analisi.metodo.card": "Carta",
  "analisi.metodo.apple_pay": "Apple Pay",
  "analisi.metodo.google_pay": "Google Pay",
  "analisi.metodo.satispay": "Satispay",
  "analisi.metodo.cash": "Contanti / al banco",

  "analisi.orari.titolo": "A che ora si riempie",
  "analisi.orari.pochi_dati":
    "Servono almeno {minimo} tavoli chiusi perché questo dato voglia dire qualcosa: al momento sono {n}. Con pochi servizi il grafico mostrerebbe il caso, non l'andamento del locale.",
  "analisi.orari.sottotitolo":
    "Ora di apertura del tavolo, sull'intero arco della giornata: le ore vuote restano vuote, così la forma si legge.",
  "analisi.orari.barra": "{ora}:00 — {tavoli}",

  "analisi.nota.coperti":
    "I coperti sono quelli indicati dallo staff sulla scheda del tavolo. Dove non sono stati indicati vale 1, e la spesa per coperto risulta più alta del vero.",

  /* --- Primi passi ---------------------------------------------------- */
  "avvio.titolo": "Primi passi",
  "avvio.pronto_con_ordini": "Tutto pronto, e il primo ordine è già arrivato.",
  "avvio.pronto": "Tutto pronto. Inquadra un QR da un telefono e prova a ordinare.",
  "avvio.avanzamento": "{fatti} su {totale}. Quello che manca è qui sotto, in ordine.",

  "avvio.sezione.per_aprire": "Senza queste non si apre",
  "avvio.sezione.poi": "Poi, appena puoi",
  "avvio.sezione.facoltative": "Solo se ti servono",
  "avvio.sezione.facoltative.nota":
    "Non dipendono dal tipo di locale: una piadineria può fare la formula del venerdì e un ristorante può consegnare al banco. Accendi quello che usi.",

  "avvio.voce.fatto": "fatto",
  "avvio.voce.vai": "Vai a {dove}",

  "avvio.dove.impostazioni": "Impostazioni",
  "avvio.dove.menu": "Menu",
  "avvio.dove.tavoli": "QR e tavoli",
  "avvio.dove.personale": "Personale",
  "avvio.dove.corrispettivi": "Corrispettivi",

  "avvio.passo.dati.titolo": "I dati del locale",
  "avvio.passo.dati.perche":
    "Partita IVA e indirizzo finiscono sulle pagine che vede il cliente e sulle fatture. Senza, il gestionale non può emettere niente.",
  "avvio.passo.menu.titolo": "Il menu",
  "avvio.passo.menu.perche":
    "Caricalo a mano o importalo da un file o dalla cassa. Puoi partire da un modello: crea le categorie del tuo tipo di locale senza toccare quello che hai già.",
  "avvio.passo.allergeni.titolo": "Gli allergeni su ogni piatto",
  "avvio.passo.allergeni.scoperti.uno":
    "{n} piatto è ancora scoperto. Il Reg. UE 1169/2011 li vuole tutti, e la sanzione va da 3.000 a 24.000 euro.",
  "avvio.passo.allergeni.scoperti.molti":
    "{n} piatti sono ancora scoperti. Il Reg. UE 1169/2011 li vuole tutti, e la sanzione va da 3.000 a 24.000 euro.",
  "avvio.passo.allergeni.coperti":
    "Tutti coperti. È l'obbligo che fa prendere le multe più salate.",
  "avvio.passo.tavoli.titolo": "I tavoli e i loro QR",
  "avvio.passo.tavoli.perche":
    "Un QR per tavolo, da mandare in tipografia con il PDF già impaginato. La sala si dispone trascinando i tavoli come pedine.",
  "avvio.passo.incassi.titolo": "Come incassi",
  "avvio.passo.incassi.perche":
    "Collega Stripe o Satispay. Senza, il cliente ordina ma non può pagare dal telefono: si paga al banco come sempre.",

  "avvio.passo.personale.titolo": "Il personale",
  "avvio.passo.personale.perche":
    "Ognuno con il suo accesso: sala, cucina, bar. Chi è in sala non vede gli incassi, e il codice operatore fa entrare in fretta dal tablet condiviso.",
  "avvio.passo.logo.titolo": "Logo e colori",
  "avvio.passo.logo.perche":
    "Le pagine che vede il cliente portano il tuo marchio, non il nostro. Il nostro nome non compare mai.",
  "avvio.passo.email.titolo": "Le email ai clienti",
  "avvio.passo.email.perche":
    "Conferme di prenotazione, promemoria del giorno prima, fatture. Senza, non parte niente.",
  "avvio.passo.rt.titolo": "Il registratore telematico",
  "avvio.passo.rt.perche":
    "Il gestionale incassa, il registratore certifica. Se non lo colleghi, in Corrispettivi trovi il riepilogo di giornata per metodo di pagamento, da battere in cassa.",

  "avvio.opzione.prenotazioni.titolo": "Prenotazioni online",
  "avvio.opzione.prenotazioni.perche":
    "Una pagina da mettere sul tuo sito, con promemoria e disdetta automatici.",
  "avvio.opzione.formula.titolo": "Formula a prezzo fisso",
  "avvio.opzione.formula.perche":
    "All you can eat: si paga a persona e i piatti compresi non si sommano. Con l'attesa fra un'ordinazione e l'altra, se ti serve.",
  "avvio.opzione.ritiro.titolo": "Numeri di ritiro al banco",
  "avvio.opzione.ritiro.perche":
    "Per chi consegna al bancone invece che al tavolo. Segnaposto, cercapersone o avviso sul telefono.",
  "avvio.opzione.coperto.titolo": "Coperto e servizio",
  "avvio.opzione.coperto.perche":
    "Se li applichi vanno dichiarati al cliente insieme ai prezzi: la legge li tratta come una voce di menu.",

  "avvio.stato.impostata": "impostata",
  "avvio.stato.da_impostare": "da impostare",
  "avvio.stato.attiva": "attiva",
  "avvio.stato.spenta": "spenta",
  "avvio.stato.attivi": "attivi",
  "avvio.stato.spenti": "spenti",
  "avvio.stato.impostato": "impostato",
  "avvio.stato.nessuno": "nessuno",

  /* --- Anteprima del telefono in vetrina ------------------------------ */
  "mockup.posto": "Tavolo 7 · Sala",
  "mockup.locale": "Trattoria da Luca",
  "mockup.categoria.antipasti": "Antipasti",
  "mockup.categoria.primi": "Primi",
  "mockup.categoria.secondi": "Secondi",
  // I nomi dei piatti restano in italiano anche in inglese: sono nomi propri
  // di piatti italiani, e su una carta inglese si scrivono così.
  "mockup.piatto.tagliatelle": "Tagliatelle al ragù",
  "mockup.piatto.tortelli": "Tortelli di zucca",
  "mockup.piatto.tagliata": "Tagliata di manzo",
  "mockup.tag.piu_ordinato": "Il più ordinato",
  "mockup.vai_al_conto": "Vai al conto",
  "mockup.pagamenti": "Dividi per piatto · Carta, Apple Pay, Satispay",

  /* --- Informativa privacy verso il ristoratore ----------------------- */
  "privacy.meta.titolo": "Informativa privacy — account del locale",
  "privacy.nota_lingua":
    "Testo originale. In caso di divergenza fa fede la versione italiana.",
  "privacy.titolo": "Informativa privacy — il tuo account",
  "privacy.premessa.a": "Riguarda i dati del ",
  "privacy.premessa.forte": "tuo account e della tua attività",
  "privacy.premessa.b": ". Per i dati dei ",
  "privacy.premessa.em": "tuoi clienti",
  "privacy.premessa.c": " il titolare sei tu: quel rapporto è regolato dalla ",
  "privacy.premessa.link": "nomina a responsabile del trattamento",
  "privacy.premessa.d": ".",

  "privacy.titolare.titolo": "Titolare",
  "privacy.titolare.testo":
    "Il fornitore della piattaforma, i cui estremi completi — ragione sociale, sede, partita IVA e indirizzo per l'esercizio dei diritti — vanno indicati qui prima della commercializzazione.",

  "privacy.dati.titolo": "Dati trattati e finalità",
  "privacy.dati.col.dati": "Dati",
  "privacy.dati.col.finalita": "Finalità",
  "privacy.dati.col.base": "Base giuridica",
  "privacy.dati.col.conservazione": "Conservazione",
  "privacy.dati.accesso.dati": "Email, nome, impronta della password del personale",
  "privacy.dati.accesso.finalita": "Accesso al gestionale",
  "privacy.dati.accesso.base": "Contratto — art. 6.1.b",
  "privacy.dati.accesso.conservazione": "Fino a 60 giorni dalla chiusura account",
  "privacy.dati.fatturazione.dati":
    "Ragione sociale, sede, partita IVA, dati dell'abbonamento",
  "privacy.dati.fatturazione.finalita": "Fatturare il canone e gestire il rapporto",
  "privacy.dati.fatturazione.base": "Contratto e obbligo legale — artt. 6.1.b e 6.1.c",
  "privacy.dati.fatturazione.conservazione": "10 anni",
  "privacy.dati.ip.dati": "Indirizzo IP pseudonimizzato al momento della registrazione",
  "privacy.dati.ip.finalita": "Impedire registrazioni automatiche",
  "privacy.dati.ip.base": "Legittimo interesse alla sicurezza — art. 6.1.f",
  "privacy.dati.ip.conservazione": "Massimo 2 ore",
  "privacy.dati.carta":
    "I dati della tua carta per il pagamento del canone sono raccolti direttamente da Stripe e non transitano dai nostri sistemi: conserviamo solo l'identificativo del cliente, l'esito e la scadenza dell'abbonamento.",

  "privacy.fornitori.titolo": "Fornitori",
  "privacy.fornitori.stripe.nome": "Stripe",
  "privacy.fornitori.stripe.testo":
    " — incasso del canone, come titolare autonomo per i dati di pagamento.",
  "privacy.fornitori.nota":
    "Non vendiamo i tuoi dati, non li cediamo a fini pubblicitari e non li usiamo per profilazione o decisioni automatizzate.",

  "privacy.diritti.titolo": "I tuoi diritti",
  "privacy.diritti.a":
    "Accesso, rettifica, cancellazione, limitazione, portabilità e opposizione ai sensi degli artt. 15-22 GDPR, e reclamo al ",
  "privacy.diritti.garante": "Garante per la protezione dei dati personali",
  "privacy.diritti.b": " (Piazza Venezia 11, 00187 Roma — garante@gpdp.it).",
  "privacy.diritti.fiscali":
    "La cancellazione dell'account non elimina i documenti fiscali, che una norma impone di conservare.",

  "privacy.cookie.titolo": "Cookie",
  "privacy.cookie.testo":
    "Il gestionale usa un solo cookie, quello di sessione, necessario a tenerti collegato dopo l'accesso. Nessuna analitica, nessun tracciamento, nessun banner.",

  "privacy.aggiornamento": "Ultimo aggiornamento: settembre 2026.",

  /* --- Nomina a responsabile del trattamento (art. 28 GDPR) ----------- */
  "dpa.meta.titolo": "Nomina a responsabile del trattamento",
  "dpa.nota_lingua":
    "Testo originale. In caso di divergenza fa fede la versione italiana.",
  "dpa.titolo": "Nomina a responsabile del trattamento",
  "dpa.versione": "Accordo ai sensi dell'art. 28 del Regolamento (UE) 2016/679 — versione {versione}.",
  "dpa.premessa.a":
    "Quando usi questo servizio, i dati dei tuoi clienti — ordini, pagamenti, prenotazioni, dati di fatturazione — restano ",
  "dpa.premessa.forte": "tuoi",
  "dpa.premessa.b":
    ". Tu sei il titolare del trattamento. Noi li trattiamo soltanto per farti funzionare il servizio, e questo accordo stabilisce entro quali limiti.",

  "dpa.art1.titolo": "Chi è chi",
  "dpa.art1.titolare.etichetta": "Titolare del trattamento:",
  "dpa.art1.titolare.testo":
    " il locale intestatario dell'account, con i dati fiscali indicati in Impostazioni.",
  "dpa.art1.responsabile.etichetta": "Responsabile del trattamento:",
  "dpa.art1.responsabile.testo":
    " il fornitore della piattaforma, che tratta i dati esclusivamente su istruzione documentata del titolare.",

  "dpa.art2.titolo": "Oggetto, durata, natura del trattamento",
  "dpa.art2.testo":
    "Il trattamento consiste nella raccolta, registrazione, conservazione, consultazione e cancellazione dei dati necessari a: mostrare il menu, ricevere ordini al tavolo, incassare pagamenti, gestire prenotazioni, emettere fatture elettroniche e, se collegata, leggere il listino dalla cassa. Dura quanto il contratto di servizio.",

  "dpa.art3.titolo": "Categorie di interessati e di dati",
  "dpa.art3.interessati.etichetta": "Interessati:",
  "dpa.art3.interessati.testo":
    " i clienti del locale e il personale a cui il titolare dà accesso al gestionale.",
  "dpa.art3.dati.etichetta": "Dati:",
  "dpa.art3.dati.testo":
    " nome, telefono, email, dati di fatturazione (codice fiscale, partita IVA, codice destinatario, PEC), contenuto degli ordini e delle note, importi e esiti dei pagamenti, indirizzo IP pseudonimizzato per il contrasto agli abusi.",
  "dpa.art3.particolari.a": "Il servizio ",
  "dpa.art3.particolari.forte": "non è progettato per trattare categorie particolari di dati",
  "dpa.art3.particolari.b":
    " (art. 9): il titolare si impegna a non usarlo per raccogliere dati sulla salute. Le note dei clienti sono campi liberi in cui un cliente potrebbe scrivere un'allergia di propria iniziativa; il titolare ne è consapevole e non ne sollecita l'inserimento.",

  "dpa.art4.titolo": "Istruzioni del titolare",
  "dpa.art4.testo":
    "Il responsabile tratta i dati solo su istruzione documentata del titolare, che comprende le operazioni rese possibili dalle funzioni del servizio così come configurate dal titolare stesso. Il responsabile informa immediatamente il titolare se un'istruzione gli appare in contrasto con la normativa.",
  "dpa.art4.propri.a": "Il responsabile ",
  "dpa.art4.propri.forte": "non usa i dati dei clienti del locale per finalità proprie",
  "dpa.art4.propri.b":
    ": non li rivende, non li aggrega per rivenderli, non li impiega per pubblicità, profilazione o addestramento di modelli.",

  "dpa.art5.titolo": "Riservatezza",
  "dpa.art5.testo":
    "Chiunque acceda ai dati per conto del responsabile è vincolato alla riservatezza e autorizzato al trattamento nei limiti delle proprie mansioni.",

  "dpa.art6.titolo": "Misure di sicurezza (art. 32)",
  "dpa.art6.https": "Cifratura del traffico in transito (HTTPS obbligatorio).",
  "dpa.art6.password":
    "Credenziali del personale conservate solo come impronta (bcrypt), mai in chiaro.",
  "dpa.art6.segreti":
    "Segreti dei fornitori del locale (chiavi di pagamento e fatturazione) cifrati a riposo con AES-256-GCM.",
  "dpa.art6.ruoli":
    "Separazione degli accessi per ruolo: sala e cucina non vedono incassi né dati fiscali.",
  "dpa.art6.isolamento":
    "Isolamento dei dati fra locali verificato a ogni operazione, non solo nell'interfaccia.",
  "dpa.art6.ip": "Indirizzi IP pseudonimizzati con HMAC e conservati al massimo due ore.",
  "dpa.art6.carte":
    "I dati delle carte non transitano mai dai sistemi del responsabile: sono raccolti direttamente dal fornitore di pagamento.",
  "dpa.art6.backup": "Copie di sicurezza gestite dal fornitore della banca dati.",

  "dpa.art7.titolo": "Sotto-responsabili",
  "dpa.art7.a":
    "Il titolare autorizza in via generale il ricorso ai sotto-responsabili elencati qui sotto. Il responsabile comunica ogni aggiunta o sostituzione ",
  "dpa.art7.forte": "senza ritardo e comunque entro 5 giorni",
  "dpa.art7.b":
    " da quando ne viene a conoscenza. Il titolare può opporsi e, se l'opposizione non è superabile, recedere dal servizio senza penali.",
  "dpa.art7.nota":
    "Il termine è di 5 giorni e non di 30 perché è quello che i fornitori a monte concedono a noi: promettere un preavviso più lungo di quello che riceviamo sarebbe un impegno che non potremmo mantenere.",
  "dpa.art7.col.fornitore": "Fornitore",
  "dpa.art7.col.attivita": "Attività",
  "dpa.art7.col.dove": "Dove",
  // Le righe della tabella dei sotto-responsabili. Il nome del fornitore
  // resta com'è — è una ragione sociale — ma cosa fa e dove sta lo deve
  // capire anche chi legge in inglese.
  "dpa.art7.neon.attivita": "Conservazione di tutti i dati del servizio",
  "dpa.art7.neon.dove": "Dati a Francoforte; capogruppo negli Stati Uniti",
  "dpa.art7.vercel.attivita": "Esecuzione dell'applicazione e consegna delle pagine",
  "dpa.art7.vercel.dove": "Rete globale; capogruppo negli Stati Uniti",
  "dpa.art7.sdi.attivita":
    "Trasmissione delle fatture elettroniche al Sistema di Interscambio, solo se attivato dal locale",
  "dpa.art7.sdi.dove": "Unione Europea",
  "dpa.art7.tilby.attivita":
    "Lettura del listino dalla cassa per importare il menu, solo se il collegamento è attivato dal locale. Nessun dato dei clienti gli viene inviato",
  "dpa.art7.tilby.dove": "Unione Europea",
  "dpa.art7.pagamenti.a": "I fornitori di pagamento agiscono come ",
  "dpa.art7.pagamenti.em": "titolari autonomi",
  "dpa.art7.pagamenti.b":
    " per i dati delle carte e per i propri obblighi antiriciclaggio, non come sotto-responsabili.",

  "dpa.art8.titolo": "Trasferimenti extra UE",
  "dpa.art8.testo":
    "La banca dati risiede fisicamente nell'Unione Europea. I fornitori che la gestiscono e quelli di hosting hanno capogruppo negli Stati Uniti: la sede dei server non sottrae quindi i dati alla giurisdizione statunitense. I trasferimenti avvengono sulla base delle clausole contrattuali tipo della Commissione europea e, ove applicabile, dell'adeguatezza riconosciuta al quadro UE-USA.",

  "dpa.art9.titolo": "Assistenza al titolare",
  "dpa.art9.testo":
    "Il responsabile assiste il titolare, tenuto conto della natura del trattamento, nel dare seguito alle richieste degli interessati (artt. 15-22) e nell'adempimento degli obblighi di sicurezza, notificazione delle violazioni e valutazione d'impatto (artt. 32-36). Le funzioni di esportazione e cancellazione disponibili nel gestionale sono parte di questa assistenza.",

  "dpa.art10.titolo": "Violazioni dei dati",
  "dpa.art10.a": "Il responsabile informa il titolare ",
  "dpa.art10.forte": "senza ingiustificato ritardo e comunque entro 48 ore",
  "dpa.art10.b":
    " da quando viene a conoscenza di una violazione, fornendo le informazioni necessarie alla notificazione al Garante entro le 72 ore previste dall'art. 33. Resta in capo al titolare la decisione di notificare.",

  "dpa.art11.titolo": "Cancellazione a fine rapporto",
  "dpa.art11.a":
    "Alla cessazione del servizio il titolare può esportare i propri dati. Trascorsi ",
  "dpa.art11.forte": "60 giorni",
  "dpa.art11.b":
    " dalla cessazione, il responsabile cancella i dati dai sistemi attivi; le copie di sicurezza si sovrascrivono secondo il ciclo del fornitore della banca dati, entro ulteriori 35 giorni. Fanno eccezione i dati che una norma impone di conservare.",

  "dpa.art12.titolo": "Verifiche",
  "dpa.art12.testo":
    "Il responsabile mette a disposizione del titolare le informazioni necessarie a dimostrare il rispetto dell'art. 28 e consente verifiche, anche tramite un incaricato del titolare, con preavviso ragionevole e senza pregiudizio per la riservatezza degli altri locali che usano lo stesso servizio.",

  "dpa.art13.titolo": "Responsabilità del titolare",
  "dpa.art13.testo":
    "Restano a carico del titolare: rendere l'informativa ai propri clienti con i propri estremi, tenere il registro dei trattamenti, valutare la liceità delle finalità perseguite, gestire i rapporti con i propri dipendenti autorizzati e rispondere alle richieste degli interessati.",

  "dpa.chiusura":
    "Questo testo è predisposto per l'uso del servizio così com'è realizzato. Non sostituisce il parere di un legale sulla situazione specifica del tuo locale, e in particolare sulle finalità per cui deciderai di usarlo.",
  "dpa.torna": "Torna al gestionale",
};

const EN: Speculare<typeof IT> = {
  "errore.nessun_locale": "No venue linked to this account.",

  /* --- Analisi ------------------------------------------------------- */
  "analisi.titolo": "Reports",
  "analisi.solo_titolare": "Only the owner and the manager can see financial data.",
  "analisi.periodo.giorni.uno": "{n} day",
  "analisi.periodo.giorni.molti": "{n} days",
  "analisi.stampa.riga": "{locale} · {periodo} · printed on {data}",
  "analisi.stampa.pulsante": "Print or save as PDF",
  "analisi.vuoto":
    "No tables closed in this period. The numbers appear as bills are closed.",

  "analisi.scheda.incasso": "Takings",
  "analisi.scheda.incasso.nota.uno": "{n} table served",
  "analisi.scheda.incasso.nota.molti": "{n} tables served",
  "analisi.scheda.per_coperto": "Spend per cover",
  "analisi.scheda.per_coperto.nota.uno": "{n} cover in total",
  "analisi.scheda.per_coperto.nota.molti": "{n} covers in total",
  "analisi.scheda.per_tavolo": "Spend per table",
  "analisi.scheda.per_tavolo.nota": "{persone} people per table",
  "analisi.scheda.piatti_per_persona": "Dishes per person",
  "analisi.scheda.piatti_per_persona.nota.uno": "{n} dish in total",
  "analisi.scheda.piatti_per_persona.nota.molti": "{n} dishes in total",

  "analisi.scheda.permanenza": "Average stay",
  "analisi.scheda.permanenza.nota": "From opening the table to closing the bill",
  "analisi.durata.ore": "{ore}h {minuti}",
  "analisi.durata.minuti": "{n} min",
  "analisi.scheda.rotazione": "Table turnover",
  "analisi.scheda.rotazione.nota": "Tables served per day",
  "analisi.scheda.coperti_giorno": "Covers per day",
  "analisi.scheda.prezzo_medio": "Average dish price",

  "analisi.giorni.titolo": "Day by day",
  "analisi.giorni.tavoli.uno": "{n} table",
  "analisi.giorni.tavoli.molti": "{n} tables",
  "analisi.giorni.coperti.uno": "{n} cover",
  "analisi.giorni.coperti.molti": "{n} covers",

  "analisi.piatti.titolo": "What sells",
  "analisi.piatti.sottotitolo":
    "The twelve most ordered. Anything that isn't here, and has been on the menu for months, probably isn't earning its place.",
  "analisi.piatti.pezzi": "{n} pcs",

  "analisi.metodi.titolo": "How they pay",
  "analisi.metodi.pagamenti.uno": "{n} payment",
  "analisi.metodi.pagamenti.molti": "{n} payments",
  "analisi.metodo.card": "Card",
  "analisi.metodo.apple_pay": "Apple Pay",
  "analisi.metodo.google_pay": "Google Pay",
  "analisi.metodo.satispay": "Satispay",
  "analisi.metodo.cash": "Cash / at the counter",

  "analisi.orari.titolo": "When it fills up",
  "analisi.orari.pochi_dati":
    "This figure needs at least {minimo} closed tables to mean anything: right now there are {n}. With few services the chart would show chance, not how the place actually runs.",
  "analisi.orari.sottotitolo":
    "The hour each table opened, across the whole day: empty hours stay empty, so the shape can be read.",
  "analisi.orari.barra": "{ora}:00 — {tavoli}",

  "analisi.nota.coperti":
    "Covers are the ones your staff entered on the table card. Where none were entered it counts as 1, and spend per cover comes out higher than it really is.",

  /* --- Primi passi ---------------------------------------------------- */
  "avvio.titolo": "First steps",
  "avvio.pronto_con_ordini": "Everything is ready, and the first order has already come in.",
  "avvio.pronto":
    "Everything is ready. Scan a QR code with a phone and try placing an order.",
  "avvio.avanzamento":
    "{fatti} out of {totale} done. What is still missing is below, in the order to do it.",

  "avvio.sezione.per_aprire": "You cannot open without these",
  "avvio.sezione.poi": "Then, as soon as you can",
  "avvio.sezione.facoltative": "Only if you need them",
  "avvio.sezione.facoltative.nota":
    "These do not depend on the kind of place you run: a sandwich bar can run a Friday set menu, and a restaurant can hand food over at the counter. Turn on the ones you actually use.",

  "avvio.voce.fatto": "done",
  "avvio.voce.vai": "Go to {dove}",

  "avvio.dove.impostazioni": "Settings",
  "avvio.dove.menu": "Menu",
  "avvio.dove.tavoli": "QR codes and tables",
  "avvio.dove.personale": "Staff",
  "avvio.dove.corrispettivi": "Corrispettivi",

  "avvio.passo.dati.titolo": "Your venue's details",
  "avvio.passo.dati.perche":
    "Your Partita IVA (Italian VAT registration number) and address appear on the pages your guests see and on every invoice. Without them the system cannot issue anything.",
  "avvio.passo.menu.titolo": "The menu",
  "avvio.passo.menu.perche":
    "Type it in yourself, or import it from a file or from your till. You can start from a template: it creates the categories for your kind of venue without touching what you already have.",
  "avvio.passo.allergeni.titolo": "Allergens on every dish",
  "avvio.passo.allergeni.scoperti.uno":
    "{n} dish is still uncovered. EU Reg. 1169/2011 requires them on all of them, and the fine runs from 3,000 to 24,000 euro.",
  "avvio.passo.allergeni.scoperti.molti":
    "{n} dishes are still uncovered. EU Reg. 1169/2011 requires them on all of them, and the fine runs from 3,000 to 24,000 euro.",
  "avvio.passo.allergeni.coperti":
    "All covered. This is the obligation that brings the heaviest fines.",
  "avvio.passo.tavoli.titolo": "Tables and their QR codes",
  "avvio.passo.tavoli.perche":
    "One QR code per table, ready to send to the printer as a laid-out PDF. You arrange the dining room by dragging the tables around like counters.",
  "avvio.passo.incassi.titolo": "How you take payment",
  "avvio.passo.incassi.perche":
    "Connect Stripe or Satispay. Without one, guests can order but cannot pay from their phone: they pay at the counter as always.",

  "avvio.passo.personale.titolo": "Your staff",
  "avvio.passo.personale.perche":
    "Each person with their own login: front of house, kitchen, bar. Front of house does not see the takings, and the staff PIN gets people in quickly from a shared tablet.",
  "avvio.passo.logo.titolo": "Logo and colours",
  "avvio.passo.logo.perche":
    "The pages your guests see carry your brand, not ours. Our name never appears.",
  "avvio.passo.email.titolo": "Emails to your guests",
  "avvio.passo.email.perche":
    "Booking confirmations, reminders the day before, invoices. Without this, none of them go out.",
  "avvio.passo.rt.titolo": "The Registratore Telematico",
  "avvio.passo.rt.perche":
    "The system takes the money, the Registratore Telematico (the certified fiscal recorder Italian law requires) reports it. If you do not connect one, Corrispettivi (the daily takings report) gives you the day's totals by payment method, ready to key into the till.",

  "avvio.opzione.prenotazioni.titolo": "Online bookings",
  "avvio.opzione.prenotazioni.perche":
    "A page to put on your own website, with automatic reminders and cancellations.",
  "avvio.opzione.formula.titolo": "Fixed-price set menu",
  "avvio.opzione.formula.perche":
    "All you can eat: guests pay per person and the included dishes do not add up. With a wait between one round of orders and the next, if you need it.",
  "avvio.opzione.ritiro.titolo": "Collection numbers at the counter",
  "avvio.opzione.ritiro.perche":
    "For places that hand food over at the counter instead of at the table. Table markers, pagers, or a notification on the guest's phone.",
  "avvio.opzione.coperto.titolo": "Cover charge and service",
  "avvio.opzione.coperto.perche":
    "If you charge them they must be declared to the guest alongside the prices: the law treats them as a menu line.",

  "avvio.stato.impostata": "set up",
  "avvio.stato.da_impostare": "to set up",
  "avvio.stato.attiva": "on",
  "avvio.stato.spenta": "off",
  "avvio.stato.attivi": "on",
  "avvio.stato.spenti": "off",
  "avvio.stato.impostato": "set",
  "avvio.stato.nessuno": "none",

  /* --- Anteprima del telefono in vetrina ------------------------------ */
  "mockup.posto": "Table 7 · Dining room",
  "mockup.locale": "Trattoria da Luca",
  "mockup.categoria.antipasti": "Starters",
  "mockup.categoria.primi": "First courses",
  "mockup.categoria.secondi": "Mains",
  "mockup.piatto.tagliatelle": "Tagliatelle al ragù",
  "mockup.piatto.tortelli": "Tortelli di zucca",
  "mockup.piatto.tagliata": "Tagliata di manzo",
  "mockup.tag.piu_ordinato": "Most ordered",
  "mockup.vai_al_conto": "Go to the bill",
  "mockup.pagamenti": "Split by dish · Card, Apple Pay, Satispay",

  /* --- Informativa privacy verso il ristoratore ----------------------- */
  "privacy.meta.titolo": "Privacy notice — your venue account",
  "privacy.nota_lingua":
    "English translation, provided so you can understand the text. The Italian version is the one that governs; if the two differ, the Italian text prevails.",
  "privacy.titolo": "Privacy notice — your account",
  "privacy.premessa.a": "This covers the data of ",
  "privacy.premessa.forte": "your account and your business",
  "privacy.premessa.b": ". For the data of ",
  "privacy.premessa.em": "your own guests",
  "privacy.premessa.c":
    " you are the controller: that relationship is governed by the ",
  "privacy.premessa.link": "data processing agreement",
  "privacy.premessa.d": ".",

  "privacy.titolare.titolo": "Controller",
  "privacy.titolare.testo":
    "The platform provider, whose full details — company name, registered office, Partita IVA (Italian VAT registration number) and the address for exercising your rights — must be filled in here before the service goes on sale.",

  "privacy.dati.titolo": "Data processed and purposes",
  "privacy.dati.col.dati": "Data",
  "privacy.dati.col.finalita": "Purpose",
  "privacy.dati.col.base": "Legal basis",
  "privacy.dati.col.conservazione": "Retention",
  "privacy.dati.accesso.dati": "Email, name, hash of each staff member's password",
  "privacy.dati.accesso.finalita": "Access to the management system",
  "privacy.dati.accesso.base": "Contract — art. 6.1.b",
  "privacy.dati.accesso.conservazione": "Up to 60 days after the account is closed",
  "privacy.dati.fatturazione.dati":
    "Company name, registered office, Partita IVA, subscription details",
  "privacy.dati.fatturazione.finalita":
    "Invoicing the subscription and managing the relationship",
  "privacy.dati.fatturazione.base":
    "Contract and legal obligation — arts. 6.1.b and 6.1.c",
  "privacy.dati.fatturazione.conservazione": "10 years",
  "privacy.dati.ip.dati": "Pseudonymised IP address at the moment of sign-up",
  "privacy.dati.ip.finalita": "Preventing automated sign-ups",
  "privacy.dati.ip.base": "Legitimate interest in security — art. 6.1.f",
  "privacy.dati.ip.conservazione": "2 hours at most",
  "privacy.dati.carta":
    "Your card details for paying the subscription are collected directly by Stripe and never pass through our systems: we keep only the customer identifier, the outcome, and the subscription's expiry date.",

  "privacy.fornitori.titolo": "Suppliers",
  "privacy.fornitori.stripe.nome": "Stripe",
  "privacy.fornitori.stripe.testo":
    " — collecting the subscription fee, acting as an independent controller for payment data.",
  "privacy.fornitori.nota":
    "We do not sell your data, we do not pass it on for advertising, and we do not use it for profiling or automated decision-making.",

  "privacy.diritti.titolo": "Your rights",
  "privacy.diritti.a":
    "Access, rectification, erasure, restriction, portability and objection under arts. 15-22 GDPR, and the right to complain to the ",
  "privacy.diritti.garante":
    "Garante per la protezione dei dati personali (the Italian data protection authority)",
  "privacy.diritti.b": " (Piazza Venezia 11, 00187 Roma — garante@gpdp.it).",
  "privacy.diritti.fiscali":
    "Closing your account does not delete tax documents, which the law requires us to keep.",

  "privacy.cookie.titolo": "Cookies",
  "privacy.cookie.testo":
    "The management system uses a single cookie, the session one, needed to keep you signed in. No analytics, no tracking, no banner.",

  "privacy.aggiornamento": "Last updated: September 2026.",

  /* --- Nomina a responsabile del trattamento (art. 28 GDPR) ----------- */
  "dpa.meta.titolo": "Data processing agreement",
  "dpa.nota_lingua":
    "English translation, provided so you can understand the text. The Italian version is the one you accept and the one that governs; if the two differ, the Italian text prevails.",
  "dpa.titolo": "Data processing agreement",
  "dpa.versione":
    "Agreement under art. 28 of Regulation (EU) 2016/679 — version {versione}.",
  "dpa.premessa.a":
    "When you use this service, your guests' data — orders, payments, bookings, billing details — stays ",
  "dpa.premessa.forte": "yours",
  "dpa.premessa.b":
    ". You are the data controller. We process it only to make the service work for you, and this agreement sets the limits within which we do so.",

  "dpa.art1.titolo": "Who is who",
  "dpa.art1.titolare.etichetta": "Controller:",
  "dpa.art1.titolare.testo":
    " the venue that holds the account, with the tax details entered in Settings.",
  "dpa.art1.responsabile.etichetta": "Processor:",
  "dpa.art1.responsabile.testo":
    " the platform provider, which processes the data solely on the controller's documented instructions.",

  "dpa.art2.titolo": "Subject matter, duration and nature of the processing",
  "dpa.art2.testo":
    "The processing consists of collecting, recording, storing, consulting and erasing the data needed to: display the menu, take orders at the table, collect payments, manage bookings, issue electronic invoices and, where connected, read the price list from the till. It lasts as long as the service contract.",

  "dpa.art3.titolo": "Categories of data subjects and of data",
  "dpa.art3.interessati.etichetta": "Data subjects:",
  "dpa.art3.interessati.testo":
    " the venue's guests and the staff to whom the controller gives access to the management system.",
  "dpa.art3.dati.etichetta": "Data:",
  "dpa.art3.dati.testo":
    " name, phone number, email, billing details (Codice Fiscale, the Italian tax code; Partita IVA, the VAT registration number; Codice Destinatario, the e-invoicing recipient code; PEC, the Italian certified email address), the content of orders and their notes, payment amounts and outcomes, and a pseudonymised IP address used to counter abuse.",
  "dpa.art3.particolari.a": "The service ",
  "dpa.art3.particolari.forte":
    "is not designed to process special categories of data",
  "dpa.art3.particolari.b":
    " (art. 9): the controller undertakes not to use it to collect health data. Guest notes are free-text fields in which a guest might write down an allergy of their own accord; the controller is aware of this and does not invite it.",

  "dpa.art4.titolo": "The controller's instructions",
  "dpa.art4.testo":
    "The processor processes the data only on the controller's documented instructions, which include the operations made possible by the service's features as configured by the controller. The processor immediately informs the controller if an instruction appears to it to breach the law.",
  "dpa.art4.propri.a": "The processor ",
  "dpa.art4.propri.forte":
    "does not use the venue's guest data for its own purposes",
  "dpa.art4.propri.b":
    ": it does not resell it, does not aggregate it in order to resell it, and does not use it for advertising, profiling or training models.",

  "dpa.art5.titolo": "Confidentiality",
  "dpa.art5.testo":
    "Everyone who accesses the data on the processor's behalf is bound by confidentiality and authorised to process it only within the limits of their duties.",

  "dpa.art6.titolo": "Security measures (art. 32)",
  "dpa.art6.https": "Encryption of traffic in transit (HTTPS enforced).",
  "dpa.art6.password":
    "Staff credentials stored only as a hash (bcrypt), never in the clear.",
  "dpa.art6.segreti":
    "The venue's supplier secrets (payment and invoicing keys) encrypted at rest with AES-256-GCM.",
  "dpa.art6.ruoli":
    "Access separated by role: front of house and kitchen see neither takings nor tax data.",
  "dpa.art6.isolamento":
    "Isolation of data between venues checked on every operation, not only in the interface.",
  "dpa.art6.ip": "IP addresses pseudonymised with HMAC and kept for two hours at most.",
  "dpa.art6.carte":
    "Card data never passes through the processor's systems: it is collected directly by the payment provider.",
  "dpa.art6.backup": "Backups managed by the database provider.",

  "dpa.art7.titolo": "Sub-processors",
  "dpa.art7.a":
    "The controller gives general authorisation for the sub-processors listed below. The processor notifies every addition or replacement ",
  "dpa.art7.forte": "without delay and in any case within 5 days",
  "dpa.art7.b":
    " of becoming aware of it. The controller may object and, if the objection cannot be resolved, terminate the service without penalty.",
  "dpa.art7.nota":
    "The period is 5 days and not 30 because that is what our own upstream suppliers give us: promising longer notice than we ourselves receive would be a commitment we could not keep.",
  "dpa.art7.col.fornitore": "Supplier",
  "dpa.art7.col.attivita": "Activity",
  "dpa.art7.col.dove": "Where",
  "dpa.art7.neon.attivita": "Storage of all the service's data",
  "dpa.art7.neon.dove": "Data in Frankfurt; parent company in the United States",
  "dpa.art7.vercel.attivita": "Running the application and serving the pages",
  "dpa.art7.vercel.dove": "Global network; parent company in the United States",
  "dpa.art7.sdi.attivita":
    "Sending electronic invoices to the Sistema di Interscambio (the Italian tax authority's exchange system), only if the venue has switched it on",
  "dpa.art7.sdi.dove": "European Union",
  "dpa.art7.tilby.attivita":
    "Reading the price list from the till to import the menu, only if the venue has switched the link on. No guest data is sent to it",
  "dpa.art7.tilby.dove": "European Union",
  "dpa.art7.pagamenti.a": "Payment providers act as ",
  "dpa.art7.pagamenti.em": "independent controllers",
  "dpa.art7.pagamenti.b":
    " for card data and for their own anti-money-laundering obligations, not as sub-processors.",

  "dpa.art8.titolo": "Transfers outside the EU",
  "dpa.art8.testo":
    "The database physically resides in the European Union. The suppliers that run it and those that host the application have parent companies in the United States: the location of the servers therefore does not place the data beyond US jurisdiction. Transfers take place on the basis of the European Commission's standard contractual clauses and, where applicable, the adequacy recognised for the EU-US framework.",

  "dpa.art9.titolo": "Assistance to the controller",
  "dpa.art9.testo":
    "The processor assists the controller, taking into account the nature of the processing, in responding to data subject requests (arts. 15-22) and in meeting the obligations of security, breach notification and impact assessment (arts. 32-36). The export and erasure features available in the management system are part of that assistance.",

  "dpa.art10.titolo": "Data breaches",
  "dpa.art10.a": "The processor informs the controller ",
  "dpa.art10.forte": "without undue delay and in any case within 48 hours",
  "dpa.art10.b":
    " of becoming aware of a breach, providing the information needed to notify the Garante (the Italian data protection authority) within the 72 hours set by art. 33. The decision whether to notify remains with the controller.",

  "dpa.art11.titolo": "Erasure at the end of the relationship",
  "dpa.art11.a":
    "When the service ends the controller may export its own data. After ",
  "dpa.art11.forte": "60 days",
  "dpa.art11.b":
    " from termination, the processor erases the data from active systems; backups are overwritten according to the database provider's cycle, within a further 35 days. Data that the law requires to be kept is the exception.",

  "dpa.art12.titolo": "Audits",
  "dpa.art12.testo":
    "The processor makes available to the controller the information needed to demonstrate compliance with art. 28 and allows audits, including by an auditor appointed by the controller, on reasonable notice and without prejudice to the confidentiality of the other venues using the same service.",

  "dpa.art13.titolo": "The controller's own responsibilities",
  "dpa.art13.testo":
    "The following remain with the controller: giving its own guests a privacy notice with its own details, keeping the record of processing activities, assessing the lawfulness of the purposes it pursues, managing the relationship with its own authorised employees, and responding to data subject requests.",

  "dpa.chiusura":
    "This text is drafted for the service as it is actually built. It does not replace a lawyer's advice on your venue's specific situation, and in particular on the purposes for which you decide to use it.",
  "dpa.torna": "Back to the management system",
};

export const tAnalisi = dizionario(IT, EN);
export type VociAnalisi = typeof IT;
