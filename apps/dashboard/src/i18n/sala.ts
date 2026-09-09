import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Le parole della sala: tavoli, pianta, formula, chiusura del conto.
 *
 * Questo è lo schermo che si guarda in piedi, con un piatto in mano e un
 * cliente che aspetta. Le voci sono corte perché si leggono di sfuggita, e
 * gli stati dicono cosa fare — "food ready to run", non "ready".
 *
 * Sull'inglese: è quello del mestiere, non del vocabolario. "Covers" per i
 * coperti, "table turn" per il giro di tavolo, "set menu" per la formula
 * (non "formula", che in inglese è la pappa dei neonati), "à la carte" per
 * la carta, "bill" per il conto. Il cavalierino da tavolo è un "table tent",
 * l'abbondanza di stampa è il "bleed" e i crocini sono i "crop marks": sono
 * le parole che una tipografia inglese si aspetta di leggere.
 *
 * Gli errori della chiusura conto li legge un cameriere con il cliente
 * davanti: dicono cosa fare adesso, non cosa si è rotto dentro.
 */

const IT = {
  // --- La sala ------------------------------------------------------
  "sala.titolo": "Sala",
  "sala.riepilogo.occupati": "{occupati} di {totale} occupati",
  "sala.riepilogo.coperti.uno": "{n} coperto",
  "sala.riepilogo.coperti.molti": "{n} coperti",
  "sala.riepilogo.incasso": "da incassare",
  "sala.schede.titolo": "Situazione tavoli",
  "sala.schede.attivi": "Occupati ({n})",
  "sala.schede.tutti": "Tutti ({n})",
  "sala.schede.nessun_attivo":
    "Nessun tavolo occupato. La pianta sopra resta disponibile per aprire e disporre tutti i tavoli.",

  // --- La scheda del tavolo -----------------------------------------
  "tavolo.posti.uno": "{n} posto",
  "tavolo.posti.molti": "{n} posti",
  "tavolo.libero": "libero",
  "tavolo.vedi": "Vedi la situazione",
  "tavolo.aperto": "Aperto alle {ora} · da {durata}",
  "tavolo.coperti": "Coperti",
  "tavolo.coperti.aria": "Coperti del tavolo {codice}",
  "tavolo.nessuna_comanda": "Nessuna comanda ancora.",
  "tavolo.totale": "Totale conto",
  "tavolo.gia_pagato": "Già pagato",
  "tavolo.da_incassare": "Da incassare",
  "tavolo.incassa_chiudi": "Incassa e chiudi",
  "tavolo.chiudi_conto": "Chiudi conto",
  // Il mezzo va dichiarato sul documento commerciale, quindi si chiede
  // mentre si incassa e non dopo: a fine turno nessuno si ricorda chi ha
  // pagato col bancomat.
  "tavolo.come_ha_pagato": "Come ha pagato?",
  "tavolo.mezzo.cash": "Contanti",
  "tavolo.mezzo.card": "Carta",
  "tavolo.mezzo.satispay": "Satispay",
  // Il testo del bottone è una parola sola perché si legge di corsa: il
  // gesto per intero lo dice l'etichetta accessibile.
  "tavolo.incassa_chiudi.aria": "Incassa e chiudi il tavolo {codice} — {mezzo}",
  "tavolo.annulla": "Annulla",

  // Durata di permanenza, calcolata nel browser
  "durata.minuti": "{n} min",
  "durata.ore": "{ore}h {minuti}",

  // --- Le righe della comanda ---------------------------------------
  "riga.trattenuto": "trattenuto",
  "riga.stato.pending": "da inviare",
  "riga.stato.sent_to_kitchen": "in cucina",
  "riga.stato.preparing": "in preparazione",
  "riga.stato.ready": "pronto",
  "riga.stato.served": "servito",
  // Dove porta il tocco: il gesto, non lo stato di adesso
  "riga.avanza.preparing": "In cottura",
  "riga.avanza.ready": "Pronto",
  "riga.avanza.served": "Portato",

  // --- Stati del tavolo sulla pianta --------------------------------
  "stato.libero": "libero",
  "stato.incorso": "in corso",
  "stato.parziale": "pagato in parte",
  "stato.ritardo": "IN RITARDO — sta aspettando",
  "stato.daliberare": "ha pagato — tavolo da recuperare",
  "stato.pronto": "piatti pronti da portare",
  "stato.saldato": "saldato, da liberare",

  // --- La pianta della sala -----------------------------------------
  "pianta.sala": "Sala:",
  "pianta.sala.tutte": "Tutte",
  "pianta.sala.principale": "Sala principale",
  "pianta.disponi": "Disponi la sala",
  "pianta.disponi.fine": "Fine disposizione",
  "pianta.aggiungi": "+ Aggiungi tavolo",
  "pianta.riordina": "Riordina T1, T2, T3",
  "pianta.riordinata": "{sala} riordinata da T1 in avanti. Salva per confermare.",
  "pianta.non_salvate": "Modifiche non salvate",
  "pianta.salva": "Salva disposizione",
  "pianta.salvando": "Salvo…",
  "pianta.istruzioni":
    "Trascina i tavoli dove stanno davvero in sala. Con la tastiera: seleziona e usa le frecce. Tocca un tavolo per cambiarne posti e forma.",
  "pianta.vuota": "Nessun tavolo. Apri “Disponi la sala” e aggiungine uno.",
  "pianta.sposta.aria": "Sposta {codice}, {posti} posti",
  "pianta.apri.aria": "Apri {codice}, {stato}",
  // Sul rettangolo del tavolo c'è posto per due caratteri: "4p" e basta.
  "pianta.posti_breve": "{n}p",
  "pianta.errore.permessi":
    "Disposizione non salvata: serve il ruolo di titolare o responsabile. I tavoli restano dov'erano.",

  // Il tavolo, in scheda
  "pianta.campo.nome": "Nome",
  "pianta.campo.nome.esempio": "T11, Dehors 3…",
  "pianta.campo.posti": "Posti",
  "pianta.campo.zona": "Sala",
  "pianta.campo.zona.esempio": "Sala 1, Dehors…",
  "pianta.campo.forma": "Forma",
  "pianta.forma.rettangolo": "Rettangolare",
  "pianta.forma.tondo": "Tondo",
  "pianta.forma.bancone": "Bancone",
  "pianta.crea": "Crea",
  "pianta.salva_tavolo": "Salva tavolo",
  "pianta.attesa": "…",

  // --- La piantina caricata dal locale ------------------------------
  "piantina.titolo": "Piantina della sala",
  "piantina.spiegazione":
    "Carica la pianta del locale e disponici sopra i tavoli. PDF, SVG, PNG o JPG. Il PDF viene convertito qui nel browser: si usa la prima pagina.",
  "piantina.scegli": "Scegli file",
  "piantina.sostituisci": "Sostituisci piantina",
  "piantina.elaboro": "Elaboro…",
  "piantina.trasparenza": "Trasparenza",
  "piantina.rimuovi": "Rimuovi",
  "piantina.riconosci": "Riconosci i tavoli",
  "piantina.leggendo": "Leggo la pianta…",
  "piantina.serve_chiave": "Serve la chiave OpenRouter, si imposta in Impostazioni",
  "piantina.proposte.uno": "{n} tavolo riconosciuto",
  "piantina.proposte.molti": "{n} tavoli riconosciuti",
  "piantina.proposte.controlla":
    "Controlla prima di applicare: un tavolo creato per sbaglio finisce sui QR e nei conti. Togli la spunta a quello che non è un tavolo.",
  "piantina.proposte.esistente": "(esiste: verrà spostato)",
  "piantina.proposte.applica": "Applica {n} tavoli",
  "piantina.proposte.applicando": "Applico…",
  "piantina.errore.canvas": "Canvas non disponibile",
  "piantina.errore.file_illeggibile": "File illeggibile",
  "piantina.errore.immagine": "Immagine non valida",
  "piantina.errore.lettura": "Non riesco a leggere il file.",
  "piantina.errore.lettura.dettaglio": "Non riesco a leggere il file: {dettaglio}",
  "piantina.errore.permessi":
    "Il file va bene, ma non è stato salvato: serve il ruolo di titolare o responsabile.",
  "piantina.errore.trasparenza":
    "Trasparenza non salvata: serve il ruolo di titolare o responsabile.",

  // --- Formula a prezzo fisso ---------------------------------------
  "formula.formula": "Formula",
  "formula.carta": "Alla carta",
  "formula.bambini": "Di cui bambini",
  "formula.bambini.aria": "Bambini al tavolo {codice}",
  "formula.supplemento": "Supplemento per l'avanzato ({prezzo})",

  // --- QR e tavoli --------------------------------------------------
  "qr.titolo": "Gestione tavoli",
  "qr.titolo.errore": "QR e tavoli",
  "qr.nessun_locale": "Nessun locale associato.",
  "qr.locale_non_trovato": "Locale non trovato.",
  "qr.manca_indirizzo":
    "Manca l'indirizzo dell'app cliente (GUEST_APP_URL), quindi i QR non si possono generare: stamparli adesso vorrebbe dire mettere sui tavoli codici che non aprono niente. Scrivi a chi gestisce la piattaforma prima di mandare qualcosa in tipografia.",
  "qr.riga": "Tavolo {codice} — {posti}",
  "qr.spiegazione": "Il codice identifica il tavolo; il QR collega ordine e pagamento.",
  "qr.alt": "QR tavolo {codice}",
  "qr.disattiva": "Disattiva",
  "qr.riattiva": "Riattiva",
  "qr.rigenera": "Rigenera QR",
  "qr.nota":
    "Rigenerando il QR gli adesivi già stampati per quel tavolo smettono di funzionare e vanno ristampati. Un tavolo con ordini a storico non viene cancellato ma solo disattivato, per non perdere i dati contabili.",
  "qr.aggiungi.titolo": "Aggiungi tavolo",
  "qr.aggiungi.codice": "Codice tavolo (es. T3)",
  "qr.aggiungi.posti.aria": "Posti a sedere",

  // --- Il cavalierino da tavolo -------------------------------------
  "locandina.tutti.titolo": "Tutti i cavalierini in un PDF",
  "locandina.tutti.spiegazione":
    "Un file solo con i {tavoli} tavoli, una pagina ciascuno, A6 con {mm} mm di abbondanza e crocini di taglio. È il file da mandare allo stampatore.",
  "locandina.tutti.crea": "Crea PDF di tutti i {n} tavoli",
  "locandina.tutti.in_corso": "Creo il PDF…",
  "locandina.tutti.progresso": "Compongo {fatti} di {totale}…",
  "locandina.tutti.pronto.uno": "Pronto: {n} pagina.",
  "locandina.tutti.pronto.molti": "Pronto: {n} pagine.",
  "locandina.scarica_png": "Scarica PNG",
  "locandina.pdf_stampa": "PDF per la tipografia",
  "locandina.preparo": "Preparo…",
  "locandina.nota_stampa":
    "A6 a 300 dpi. Il PDF ha {mm} mm di abbondanza per lato e i crocini di taglio.",
  "locandina.errore.pdf": "Non è stato possibile creare il PDF",
  "locandina.errore.file": "Non è stato possibile creare il file",
  "locandina.errore.png": "Immagine non generata",
  "locandina.errore.immagine": "Immagine non caricata",
  "locandina.errore.canvas": "Canvas non disponibile",
  // Il testo stampato sul cavalierino, quello che legge il cliente al tavolo
  "locandina.invito": "SCAN NOW",
  "locandina.passi": "Menu · Ordina · Paga",
  "locandina.tavolo": "Tavolo {codice}",
  "locandina.istruzione": "Inquadra con la fotocamera del telefono",
  // I nomi dei file scaricati: si leggono nella cartella Download, dove non
  // c'è nessuna interfaccia intorno a spiegarli. Solo minuscole e trattini.
  "locandina.file.tutti": "cavalierini",
  "locandina.file.tavolo": "tavolo",
  "locandina.file.locale": "locale",
  "locandina.file.stampa": "stampa",
  // Sul rettangolo del tavolo il residuo va in euro tondi: il simbolo sta
  // dopo in italiano e prima in inglese, quindi la posizione sta qui.
  "pianta.residuo_breve": "−{n} €",

  // --- Coperti, formula, supplemento --------------------------------
  // Fascia e coperti a prezzo fisso: sono le due cose che, non dichiarate,
  // fanno nascere il conto sbagliato invece che assente.
  "sala.coperti_mancanti.uno":
    "Un tavolo a prezzo fisso aspetta la conferma dei coperti: finché non la dai, quel tavolo non può pagare con carta.",
  "sala.coperti_mancanti.molti":
    "{n} tavoli a prezzo fisso aspettano la conferma dei coperti: finché non la dai, quei tavoli non possono pagare con carta.",
  "formula.fascia": "Fascia",
  "formula.pranzo": "Pranzo",
  "formula.cena": "Cena",
  "formula.fascia.auto": "Dall'orario",
  "formula.fascia.aria": "Fascia di prezzo del tavolo {codice}",
  "formula.coperti_dal_tavolo.uno":
    "Il tavolo dice: 1 coperto.",
  "formula.coperti_dal_tavolo.molti":
    "Il tavolo dice: {n} coperti.",
  "formula.accetta_coperti": "Accetta",
  "azioni.coperti_accettati": "Confermati {n} coperti.",
  "formula.coperti_da_confermare":
    "Quanti sono? A prezzo fisso il conto è coperti × prezzo: finché non lo scrivi qui, il cliente non vede un totale e non può pagare con carta.",
  "azioni.fascia_non_valida": "Fascia non valida",
  "azioni.fascia_ok": "Prezzo del tavolo: {fascia}.",
  "azioni.fascia_auto": "Fascia decisa di nuovo dall'orario.",
  // Il riconoscimento della piantina sta in packages/shared, che non sa in
  // che lingua legge chi ha premuto: torna un codice e la frase la mette qui.
  "piantina.errore.non_json": "La lettura non è riuscita: disponi i tavoli a mano.",
  "piantina.errore.chiave_mancante":
    "Il riconoscimento automatico non è configurato. Disponi i tavoli a mano.",
  "piantina.errore.fornitore":
    "Il servizio di riconoscimento non ha risposto. Riprova, o disponi i tavoli a mano.",
  "piantina.errore.vuoto":
    "Dalla piantina non è stato riconosciuto nessun tavolo. Prova con un\u2019immagine più nitida, o disponili a mano.",
  "piantina.errore.troppo_lenta":
    "La lettura ha impiegato troppo. Disponi i tavoli a mano.",
  "piantina.errore.rete":
    "Non si è riusciti a raggiungere il servizio di riconoscimento. Riprova fra un momento.",
  "azioni.coperti_non_validi": "Numero di coperti non valido",
  "azioni.tavolo_non_valido": "Tavolo non trovato o già chiuso",
  "azioni.coperti_ok": "Coperti aggiornati.",
  "azioni.formula_on": "Tavolo a formula.",
  "azioni.formula_off": "Tavolo alla carta: paga i piatti.",
  "azioni.numero_non_valido": "Numero non valido",
  "azioni.bambini_limitati":
    "Il tavolo ha {coperti} coperti: segnati {bambini} bambini.",
  "azioni.salvato": "Salvato.",
  "azioni.supplemento_on": "Supplemento aggiunto al conto.",
  "azioni.supplemento_off": "Supplemento tolto.",

  // --- Piantina, disposizione e riconoscimento ----------------------
  // Messaggi che tornano dalle Server Action della sala: li legge chi sta
  // disponendo i tavoli, quindi dicono cosa fare, non cosa si è rotto.
  "azioni.piantina.rimossa": "Piantina rimossa.",
  "azioni.piantina.trasparenza": "Trasparenza aggiornata.",
  "azioni.piantina.nessun_file": "Nessun file",
  "azioni.piantina.formato": "Formato non supportato. Usa PDF, SVG, PNG, JPG o WEBP.",
  "azioni.piantina.pesante": "Piantina troppo pesante. Riduci le dimensioni e riprova.",
  "azioni.piantina.svg_illeggibile": "SVG illeggibile",
  "azioni.piantina.non_svg": "Non sembra un SVG",
  "azioni.piantina.svg_attivo":
    "Questo SVG contiene script o contenuti esterni e non viene accettato. Esportalo come PDF o PNG.",
  "azioni.piantina.caricata": "Piantina caricata.",

  "azioni.pianta.troppi": "Troppi tavoli in una volta",
  "azioni.pianta.niente_salvare": "Niente da salvare",
  "azioni.pianta.salvata": "Sala salvata.",
  "azioni.pianta.serve_nome": "Serve un nome, es. T11 o Dehors 3",
  "azioni.pianta.nome_lungo": "Nome troppo lungo",
  "azioni.pianta.posti": "Posti fra 1 e 40",
  "azioni.pianta.forma": "Forma non valida",
  "azioni.pianta.gia_esiste": "Esiste già un tavolo {codice}",
  "azioni.pianta.aggiunto": "Tavolo {codice} aggiunto.",
  "azioni.pianta.non_trovato": "Tavolo non trovato",
  "azioni.pianta.aggiornato": "Tavolo aggiornato.",

  "azioni.riconosci.serve_piantina": "Carica prima la piantina della sala.",
  "azioni.riconosci.serve_chiave":
    "Il riconoscimento usa l'AI: configura la chiave OpenRouter in Impostazioni.",
  "azioni.riconosci.no_svg":
    "Il riconoscimento non legge gli SVG. Ricarica la pianta come PDF, PNG o JPG.",
  "azioni.riconosci.chiave_illeggibile": "Chiave OpenRouter illeggibile: reinseriscila.",
  "azioni.riconosci.nessuno": "Non ho riconosciuto tavoli in questa pianta.",
  "azioni.riconosci.niente_applicare": "Niente da applicare",
  "azioni.riconosci.troppi": "Troppi tavoli in una volta",
  "azioni.riconosci.nessun_valido": "Nessun tavolo valido",
  "azioni.riconosci.creati.uno": "{n} tavolo creato",
  "azioni.riconosci.creati.molti": "{n} tavoli creati",
  "azioni.riconosci.spostati.uno": "{n} aggiornato",
  "azioni.riconosci.spostati.molti": "{n} aggiornati",

  // --- La scheda di dettaglio del tavolo ----------------------------
  // Si apre sopra la sala e mostra la situazione completa: cosa è in
  // cucina, cosa è fermo al passe e cosa è già in tavola.
  "dettaglio.aria": "Tavolo {codice}",
  "dettaglio.tavolo": "Tavolo",
  "dettaglio.chiudi": "Chiudi",
  "dettaglio.aperto": "Aperto da {durata} · {coperti} · {piatti}",
  "dettaglio.piatti.uno": "{n} piatto",
  "dettaglio.piatti.molti": "{n} piatti",
  "dettaglio.fase.cucina": "In cucina",
  "dettaglio.fase.passe": "Pronti al passe",
  "dettaglio.fase.tavolo": "Già in tavola",
  "dettaglio.vuoto": "Il tavolo è aperto ma non ha ancora ordinato nulla.",
  "dettaglio.ordinato": "Ordinato",
  "dettaglio.gia_pagato": "Già pagato dai clienti",
  "dettaglio.per_persona": "Per persona",
  "dettaglio.pagato.uno": "{n} di {coperti} ha già pagato",
  "dettaglio.pagato.molti": "{n} di {coperti} hanno già pagato",
  "dettaglio.mancano.uno": " — manca {n} persona",
  "dettaglio.mancano.molti": " — mancano {n} persone",
  "dettaglio.quote.uno": "Restano {residuo}: è {n} quota da {quota}, se dividono in parti uguali.",
  "dettaglio.quote.molti": "Restano {residuo}: sono {n} quote da {quota}, se dividono in parti uguali.",
  "dettaglio.nessuno.uno": "Nessuno ha ancora pagato: {n} persona da incassare.",
  "dettaglio.nessuno.molti": "Nessuno ha ancora pagato: {n} persone da incassare.",
  "dettaglio.comande": "Vai alle comande",

  // --- Chiusura del conto -------------------------------------------
  "chiusura.non_trovato": "Tavolo non trovato: ricarica la pagina e riprova.",
  "chiusura.gia_chiuso": "Il conto era già chiuso.",
  // Non è un divieto burocratico: chiuso il conto, quel numero diventa lo
  // storico e finisce nel documento commerciale. Fermarsi si può solo prima.
  "chiusura.coperti_da_confermare":
    "Prima scrivi in quanti sono: a prezzo fisso il conto è coperti × prezzo, e adesso ne risulta uno solo.",
  "chiusura.pagamento_in_corso":
    "C'è un pagamento con carta in corso su questo tavolo. Aspetta l'esito prima di incassare al banco: rischi di far pagare due volte.",
  "chiusura.eccedenza":
    "Conto chiuso, ma il tavolo ha pagato {importo} in più: verifica se serve un rimborso.",
  // Capita quando fra il tocco e la scrittura è arrivata un'altra comanda:
  // a schermo non restava niente da incassare, sul conto sì.
  "chiusura.mezzo_mancante":
    "C'è ancora un residuo da incassare: scegli come ha pagato il tavolo — contanti, carta o Satispay.",
  "chiusura.fatto": "Conto chiuso.",
};

const EN: Speculare<typeof IT> = {
  "sala.titolo": "Floor",
  "sala.riepilogo.occupati": "{occupati} of {totale} occupied",
  "sala.riepilogo.coperti.uno": "{n} cover",
  "sala.riepilogo.coperti.molti": "{n} covers",
  "sala.riepilogo.incasso": "left to collect",
  "sala.schede.titolo": "Table status",
  "sala.schede.attivi": "Occupied ({n})",
  "sala.schede.tutti": "All ({n})",
  "sala.schede.nessun_attivo":
    "No occupied tables. The floor plan above remains available to open and arrange every table.",

  "tavolo.posti.uno": "{n} seat",
  "tavolo.posti.molti": "{n} seats",
  "tavolo.libero": "free",
  "tavolo.vedi": "See what's going on",
  "tavolo.aperto": "Opened at {ora} · open for {durata}",
  "tavolo.coperti": "Covers",
  "tavolo.coperti.aria": "Covers on table {codice}",
  "tavolo.nessuna_comanda": "No orders yet.",
  "tavolo.totale": "Bill total",
  "tavolo.gia_pagato": "Already paid",
  "tavolo.da_incassare": "Left to collect",
  "tavolo.incassa_chiudi": "Take payment and close",
  "tavolo.chiudi_conto": "Close the bill",
  "tavolo.come_ha_pagato": "How did they pay?",
  "tavolo.mezzo.cash": "Cash",
  "tavolo.mezzo.card": "Card",
  "tavolo.mezzo.satispay": "Satispay",
  "tavolo.incassa_chiudi.aria": "Take payment and close table {codice} — {mezzo}",
  "tavolo.annulla": "Cancel",

  "durata.minuti": "{n} min",
  "durata.ore": "{ore}h {minuti}",

  "riga.trattenuto": "held",
  "riga.stato.pending": "to send",
  "riga.stato.sent_to_kitchen": "with the kitchen",
  "riga.stato.preparing": "being prepared",
  "riga.stato.ready": "ready",
  "riga.stato.served": "served",
  "riga.avanza.preparing": "Cooking",
  "riga.avanza.ready": "Ready",
  "riga.avanza.served": "Served",

  "stato.libero": "free",
  "stato.incorso": "in service",
  "stato.parziale": "part paid",
  "stato.ritardo": "RUNNING LATE — still waiting",
  "stato.daliberare": "paid — table to turn",
  "stato.pronto": "food ready to run",
  "stato.saldato": "settled, ready to clear",

  "pianta.sala": "Room:",
  "pianta.sala.tutte": "All",
  "pianta.sala.principale": "Main room",
  "pianta.disponi": "Arrange the floor",
  "pianta.disponi.fine": "Done arranging",
  "pianta.aggiungi": "+ Add table",
  "pianta.riordina": "Sort T1, T2, T3",
  "pianta.riordinata": "{sala} sorted from T1 onwards. Save to confirm.",
  "pianta.non_salvate": "Unsaved changes",
  "pianta.salva": "Save layout",
  "pianta.salvando": "Saving…",
  "pianta.istruzioni":
    "Drag the tables where they really stand on the floor. With the keyboard: select one and use the arrow keys. Tap a table to change its seats and shape.",
  "pianta.vuota": "No tables. Open “Arrange the floor” and add one.",
  "pianta.sposta.aria": "Move {codice}, {posti} seats",
  "pianta.apri.aria": "Open {codice}, {stato}",
  "pianta.posti_breve": "{n}p",
  "pianta.errore.permessi":
    "Layout not saved: you need the owner or manager role. The tables stay where they were.",

  "pianta.campo.nome": "Name",
  "pianta.campo.nome.esempio": "T11, Terrace 3…",
  "pianta.campo.posti": "Seats",
  "pianta.campo.zona": "Room",
  "pianta.campo.zona.esempio": "Room 1, Terrace…",
  "pianta.campo.forma": "Shape",
  "pianta.forma.rettangolo": "Rectangular",
  "pianta.forma.tondo": "Round",
  "pianta.forma.bancone": "Counter",
  "pianta.crea": "Create",
  "pianta.salva_tavolo": "Save table",
  "pianta.attesa": "…",

  "piantina.titolo": "Floor plan",
  "piantina.spiegazione":
    "Upload the floor plan and place the tables on it. PDF, SVG, PNG or JPG. A PDF is converted here in the browser: the first page is used.",
  "piantina.scegli": "Choose a file",
  "piantina.sostituisci": "Replace floor plan",
  "piantina.elaboro": "Working…",
  "piantina.trasparenza": "Transparency",
  "piantina.rimuovi": "Remove",
  "piantina.riconosci": "Find the tables",
  "piantina.leggendo": "Reading the plan…",
  "piantina.serve_chiave": "Needs the OpenRouter key, set it in Settings",
  "piantina.proposte.uno": "{n} table found",
  "piantina.proposte.molti": "{n} tables found",
  "piantina.proposte.controlla":
    "Check before applying: a table created by mistake ends up on the QR codes and on the bills. Untick anything that isn't a table.",
  "piantina.proposte.esistente": "(exists: it will be moved)",
  "piantina.proposte.applica": "Apply {n} tables",
  "piantina.proposte.applicando": "Applying…",
  "piantina.errore.canvas": "Canvas not available",
  "piantina.errore.file_illeggibile": "File cannot be read",
  "piantina.errore.immagine": "Invalid image",
  "piantina.errore.lettura": "I can't read this file.",
  "piantina.errore.lettura.dettaglio": "I can't read this file: {dettaglio}",
  "piantina.errore.permessi":
    "The file is fine, but it wasn't saved: you need the owner or manager role.",
  "piantina.errore.trasparenza":
    "Transparency not saved: you need the owner or manager role.",

  "formula.formula": "Set menu",
  "formula.carta": "À la carte",
  "formula.bambini": "Of which children",
  "formula.bambini.aria": "Children on table {codice}",
  "formula.supplemento": "Food waste surcharge ({prezzo})",

  "qr.titolo": "Manage tables",
  "qr.titolo.errore": "QR codes and tables",
  "qr.nessun_locale": "No venue linked to this account.",
  "qr.locale_non_trovato": "Venue not found.",
  "qr.manca_indirizzo":
    "The guest app address (GUEST_APP_URL) is missing, so the QR codes can't be generated: printing them now would mean putting codes on the tables that open nothing. Write to whoever runs the platform before sending anything to the print shop.",
  "qr.riga": "Table {codice} — {posti}",
  "qr.spiegazione": "The code identifies the table; the QR links order and payment.",
  "qr.alt": "QR code for table {codice}",
  "qr.disattiva": "Deactivate",
  "qr.riattiva": "Reactivate",
  "qr.rigenera": "New QR code",
  "qr.nota":
    "Regenerating the QR code stops the stickers already printed for that table from working, and they have to be reprinted. A table with past orders isn't deleted but only deactivated, so the accounting data isn't lost.",
  "qr.aggiungi.titolo": "Add a table",
  "qr.aggiungi.codice": "Table code (e.g. T3)",
  "qr.aggiungi.posti.aria": "Seats",

  "locandina.tutti.titolo": "Every table tent in one PDF",
  "locandina.tutti.spiegazione":
    "A single file with all {tavoli} tables, one page each, A6 with {mm} mm bleed and crop marks. This is the file to send to the print shop.",
  "locandina.tutti.crea": "Create the PDF for all {n} tables",
  "locandina.tutti.in_corso": "Creating the PDF…",
  "locandina.tutti.progresso": "Composing {fatti} of {totale}…",
  "locandina.tutti.pronto.uno": "Ready: {n} page.",
  "locandina.tutti.pronto.molti": "Ready: {n} pages.",
  "locandina.scarica_png": "Download PNG",
  "locandina.pdf_stampa": "PDF for the print shop",
  "locandina.preparo": "Preparing…",
  "locandina.nota_stampa":
    "A6 at 300 dpi. The PDF has {mm} mm of bleed on each side and crop marks.",
  "locandina.errore.pdf": "The PDF could not be created",
  "locandina.errore.file": "The file could not be created",
  "locandina.errore.png": "Image not generated",
  "locandina.errore.immagine": "Image not loaded",
  "locandina.errore.canvas": "Canvas not available",
  "locandina.invito": "SCAN NOW",
  "locandina.passi": "Menu · Order · Pay",
  "locandina.tavolo": "Table {codice}",
  "locandina.istruzione": "Point your phone camera at the code",
  "locandina.file.tutti": "table-tents",
  "locandina.file.tavolo": "table",
  "locandina.file.locale": "venue",
  "locandina.file.stampa": "print",
  "pianta.residuo_breve": "−€{n}",

  "sala.coperti_mancanti.uno":
    "One set-menu table is waiting for its cover count to be confirmed: until you do, that table cannot pay by card.",
  "sala.coperti_mancanti.molti":
    "{n} set-menu tables are waiting for their cover count to be confirmed: until you do, those tables cannot pay by card.",
  "formula.fascia": "Sitting",
  "formula.pranzo": "Lunch",
  "formula.cena": "Dinner",
  "formula.fascia.auto": "By time of day",
  "formula.fascia.aria": "Price sitting for table {codice}",
  "formula.coperti_dal_tavolo.uno": "The table says: 1 cover.",
  "formula.coperti_dal_tavolo.molti": "The table says: {n} covers.",
  "formula.accetta_coperti": "Accept",
  "azioni.coperti_accettati": "{n} covers confirmed.",
  "formula.coperti_da_confermare":
    "How many are they? The set menu is priced per person: until you enter it here, the guest sees no total and cannot pay by card.",
  "azioni.fascia_non_valida": "That sitting isn't valid",
  "azioni.fascia_ok": "Table priced as {fascia}.",
  "azioni.fascia_auto": "Sitting decided by time of day again.",
  "piantina.errore.non_json": "The scan failed: lay the tables out by hand.",
  "piantina.errore.chiave_mancante":
    "Automatic recognition is not set up. Lay the tables out by hand.",
  "piantina.errore.fornitore":
    "The recognition service did not answer. Try again, or lay the tables out by hand.",
  "piantina.errore.vuoto":
    "No tables were recognised in the floor plan. Try a sharper image, or lay them out by hand.",
  "piantina.errore.troppo_lenta":
    "The scan took too long. Lay the tables out by hand.",
  "piantina.errore.rete":
    "The recognition service could not be reached. Try again in a moment.",
  "azioni.coperti_non_validi": "That number of covers isn't valid",
  "azioni.tavolo_non_valido": "Table not found, or the bill is already closed",
  "azioni.coperti_ok": "Covers updated.",
  "azioni.formula_on": "Table on the set menu.",
  "azioni.formula_off": "Table à la carte: it pays per dish.",
  "azioni.numero_non_valido": "That number isn't valid",
  "azioni.bambini_limitati":
    "The table has {coperti} covers: {bambini} marked as children.",
  "azioni.salvato": "Saved.",
  "azioni.supplemento_on": "Surcharge added to the bill.",
  "azioni.supplemento_off": "Surcharge removed.",

  "azioni.piantina.rimossa": "Floor plan removed.",
  "azioni.piantina.trasparenza": "Opacity updated.",
  "azioni.piantina.nessun_file": "No file",
  "azioni.piantina.formato": "That format isn't supported. Use PDF, SVG, PNG, JPG or WEBP.",
  "azioni.piantina.pesante": "That floor plan is too heavy. Shrink it and try again.",
  "azioni.piantina.svg_illeggibile": "The SVG can't be read",
  "azioni.piantina.non_svg": "That doesn't look like an SVG",
  "azioni.piantina.svg_attivo":
    "This SVG holds scripts or external content and isn't accepted. Export it as a PDF or PNG.",
  "azioni.piantina.caricata": "Floor plan uploaded.",

  "azioni.pianta.troppi": "Too many tables at once",
  "azioni.pianta.niente_salvare": "Nothing to save",
  "azioni.pianta.salvata": "Floor saved.",
  "azioni.pianta.serve_nome": "It needs a name, e.g. T11 or Terrace 3",
  "azioni.pianta.nome_lungo": "That name is too long",
  "azioni.pianta.posti": "Seats between 1 and 40",
  "azioni.pianta.forma": "That shape isn't valid",
  "azioni.pianta.gia_esiste": "Table {codice} already exists",
  "azioni.pianta.aggiunto": "Table {codice} added.",
  "azioni.pianta.non_trovato": "Table not found",
  "azioni.pianta.aggiornato": "Table updated.",

  "azioni.riconosci.serve_piantina": "Upload the floor plan first.",
  "azioni.riconosci.serve_chiave":
    "Recognition uses AI: set the OpenRouter key in Settings.",
  "azioni.riconosci.no_svg":
    "Recognition can't read SVGs. Upload the plan again as a PDF, PNG or JPG.",
  "azioni.riconosci.chiave_illeggibile": "The OpenRouter key can't be read: enter it again.",
  "azioni.riconosci.nessuno": "No tables recognised on this plan.",
  "azioni.riconosci.niente_applicare": "Nothing to apply",
  "azioni.riconosci.troppi": "Too many tables at once",
  "azioni.riconosci.nessun_valido": "No valid table",
  "azioni.riconosci.creati.uno": "{n} table created",
  "azioni.riconosci.creati.molti": "{n} tables created",
  "azioni.riconosci.spostati.uno": "{n} updated",
  "azioni.riconosci.spostati.molti": "{n} updated",

  "dettaglio.aria": "Table {codice}",
  "dettaglio.tavolo": "Table",
  "dettaglio.chiudi": "Close",
  "dettaglio.aperto": "Open for {durata} · {coperti} · {piatti}",
  "dettaglio.piatti.uno": "{n} dish",
  "dettaglio.piatti.molti": "{n} dishes",
  "dettaglio.fase.cucina": "With the kitchen",
  "dettaglio.fase.passe": "Ready on the pass",
  "dettaglio.fase.tavolo": "Already on the table",
  "dettaglio.vuoto": "The table is open but hasn't ordered anything yet.",
  "dettaglio.ordinato": "Ordered",
  "dettaglio.gia_pagato": "Already paid by the guests",
  "dettaglio.per_persona": "Per person",
  "dettaglio.pagato.uno": "{n} of {coperti} has already paid",
  "dettaglio.pagato.molti": "{n} of {coperti} have already paid",
  "dettaglio.mancano.uno": " — {n} person to go",
  "dettaglio.mancano.molti": " — {n} people to go",
  "dettaglio.quote.uno": "{residuo} left: that is {n} share of {quota}, if they split evenly.",
  "dettaglio.quote.molti": "{residuo} left: that is {n} shares of {quota}, if they split evenly.",
  "dettaglio.nessuno.uno": "Nobody has paid yet: {n} person to collect from.",
  "dettaglio.nessuno.molti": "Nobody has paid yet: {n} people to collect from.",
  "dettaglio.comande": "Go to the orders",

  "chiusura.non_trovato": "Table not found: reload the page and try again.",
  "chiusura.gia_chiuso": "The bill was already closed.",
  "chiusura.coperti_da_confermare":
    "Enter how many they are first: the set menu is priced per person, and right now the table shows just one.",
  "chiusura.pagamento_in_corso":
    "A card payment is going through on this table. Wait for the outcome before taking payment at the till: you risk charging twice.",
  "chiusura.eccedenza":
    "Bill closed, but the table paid {importo} too much: check whether a refund is due.",
  "chiusura.mezzo_mancante":
    "There is still a balance to collect: pick how the table paid — cash, card or Satispay.",
  "chiusura.fatto": "Bill closed.",
};

export const tSala = dizionario(IT, EN);

/** Il traduttore già legato a una lingua, per chi lo riceve come parametro. */
export type TSala = ReturnType<typeof tSala>;
