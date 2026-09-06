import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * I soldi: fatture elettroniche, abbonamento, corrispettivi.
 *
 * Qui l'inglese va tenuto corto e i nomi degli istituti italiani vanno
 * tenuti tali e quali. "Partita IVA", "Codice Destinatario", "SDI",
 * "documento commerciale", "corrispettivi", "Registratore Telematico" sono
 * nomi di cose reali: sul sito dell'Agenzia si chiamano così, e chi cerca
 * "VAT number" su un portale che dice "Partita IVA" si ferma lì.
 *
 * La formula è sempre la stessa: nome italiano, spiegazione inglese fra
 * parentesi la prima volta che compare in una schermata, poi solo il nome.
 * Per questo alcune spiegazioni stanno nel sottotitolo di una pagina e non
 * nell'etichetta che si ripete venti volte in una tabella.
 */

const IT = {
  // --- Comuni all'area ------------------------------------------------
  "errore.nessun_locale": "Nessun locale associato.",
  "errore.non_autorizzato": "Non autorizzato",

  // --- Fatture: elenco -------------------------------------------------
  "fattura.vietato.titolo": "Non è roba tua",
  "fattura.vietato.testo":
    "Le fatture le vede il titolare o il responsabile. Chiedi al titolare se ti serve.",
  "fattura.occhiello": "Amministrazione",
  "fattura.titolo": "Fatture elettroniche",
  "fattura.sottotitolo": "Stato delle fatture inviate tramite Invoicetronic e SDI.",
  "fattura.vuoto": "Nessuna fattura generata.",
  "fattura.colonna.numero": "Numero",
  "fattura.colonna.data": "Data",
  "fattura.colonna.importo": "Importo",
  "fattura.colonna.stato": "Stato",
  "fattura.colonna.identificativo": "Identificativo",
  "fattura.colonna.documento": "Documento",

  "fattura.stato.pending": "In lavorazione",
  "fattura.stato.sent": "Inviata a SDI",
  "fattura.stato.delivered": "Consegnata",
  "fattura.stato.rejected": "Rifiutata",

  "fattura.ferma": "Ferma da oltre due giorni: controlla lo stato, o chiedi assistenza.",
  "fattura.in_attesa": "In attesa",
  "fattura.dettagli": "Dettagli",
  "fattura.apri_xml": "Apri XML",
  "fattura.scarica_xml": "Scarica XML",
  "fattura.xml_invoicetronic": "XML su Invoicetronic",

  // --- Fatture: dettaglio ----------------------------------------------
  "fattura.torna": "← Fatture",
  "fattura.dettaglio.titolo": "Fattura {numero}",
  "fattura.campo.stato": "Stato",
  "fattura.campo.data": "Data",
  "fattura.campo.totale": "Totale",
  "fattura.campo.provider": "Provider pagamento",
  "fattura.campo.id_invoicetronic": "ID Invoicetronic",
  "fattura.campo.id_sdi": "ID SDI",
  "fattura.campo.cliente": "Cliente",
  "fattura.campo.paese": "Paese",
  "fattura.campo.id_fiscale_estero": "ID fiscale estero",
  "fattura.campo.sede": "Sede",
  "fattura.campo.recapito": "Recapito fiscale",
  "fattura.campo.copia_email": "Copia email",
  "fattura.email.inviata": "Inviata",
  "fattura.email.non_inviata": "Non inviata",
  "fattura.conservazione":
    "Il documento fiscale originale viene conservato e gestito da Invoicetronic.",

  // --- Fatture: aggiornamento stato ------------------------------------
  "fattura.aggiorna": "Aggiorna stato",
  "fattura.aggiorna.corso": "Aggiorno…",
  "fattura.aggiorna.errore": "Controllo non riuscito: riprova fra poco.",
  "fattura.errore.non_disponibile": "Fattura o API key non disponibile",
  "fattura.errore.sync": "Sincronizzazione non riuscita",
  "fattura.errore.documento_non_disponibile": "Documento non disponibile",
  "fattura.errore.documento_non_recuperabile":
    "Documento non recuperabile da Invoicetronic",

  // --- Abbonamento ------------------------------------------------------
  "abbonamento.titolo": "Abbonamento",
  "abbonamento.solo_titolare": "Solo il titolare può gestire l'abbonamento.",
  "abbonamento.piano": "Piano {piano}",

  "abbonamento.stato.none": "Nessun abbonamento",
  "abbonamento.stato.trialing": "Prova gratuita",
  "abbonamento.stato.active": "Attivo",
  "abbonamento.stato.past_due": "Pagamento non riuscito",
  "abbonamento.stato.canceled": "Disdetto",
  "abbonamento.stato.incomplete": "In attesa di pagamento",
  "abbonamento.stato.unpaid": "Non pagato",

  "abbonamento.fino_al": "Il servizio resta attivo fino al {data}.",
  "abbonamento.prova_finisce": "La prova gratuita finisce il {data}.",
  "abbonamento.rinnovo": "Prossimo rinnovo il {data}.",
  "abbonamento.past_due":
    "L'ultimo addebito non è andato a buon fine. Il servizio resta attivo ancora per qualche giorno: aggiorna il metodo di pagamento per non interrompere il lavoro in sala.",
  "abbonamento.non_attivo":
    "Senza abbonamento attivo i tuoi clienti non possono ordinare né pagare dal tavolo.",

  "abbonamento.incluso.titolo": "Cosa è incluso",
  "abbonamento.incluso.menu": "Menu digitale con QR per ogni tavolo",
  "abbonamento.incluso.ordine": "Ordine e pagamento al tavolo, anche alla romana",
  "abbonamento.incluso.prenotazioni": "Prenotazioni e gestione sala",
  "abbonamento.incluso.marchio": "Il tuo logo e i tuoi colori sulle pagine cliente",
  "abbonamento.incluso.fattura": "Fattura elettronica richiedibile dal tavolo",
  "abbonamento.incluso.accessi": "Accessi separati per titolare, sala e cucina",
  "abbonamento.incluso.percentuale":
    "Nessuna percentuale trattenuta da noi sui tuoi incassi",
  "abbonamento.iva":
    "Prezzi IVA esclusa. Le commissioni sulle carte sono quelle del tuo fornitore di pagamento e le paghi a lui: noi non tratteniamo nulla sul tuo incassato.",
  // Quando invece tratteniamo, va scritto qui e non lasciato scoprire
  // sull'estratto conto Stripe, dove compare come «application fee».
  "abbonamento.incluso.percentuale.si":
    "{percent}% trattenuto da noi sui pagamenti con carta dal tavolo",
  "abbonamento.iva.commissione":
    "Prezzi IVA esclusa. Sulle carte paghi le commissioni del tuo fornitore di pagamento, e in più tratteniamo il {percent}% sui pagamenti fatti dal telefono del cliente: sul tuo estratto conto Stripe lo trovi come «application fee». Non lo tratteniamo su Satispay né su quello che incassi al banco col tuo POS.",

  "abbonamento.gestisci": "Gestisci abbonamento e fatture",
  "abbonamento.apertura": "Apertura…",
  "abbonamento.mensile": "Mensile",
  "abbonamento.annuale": "Annuale — due mesi in omaggio",
  "abbonamento.attivazione": "+ {prezzo} di attivazione, una sola volta",
  "abbonamento.prova":
    "Primi {giorni} giorni gratuiti. Non viene addebitato nulla se disdici prima della scadenza.",

  "abbonamento.errore.piano": "Piano non valido",
  "abbonamento.errore.listino":
    "Listino non ancora configurato per questo piano. Controlla la variabile STRIPE_PRICES.",
  "abbonamento.errore.link": "Stripe non ha restituito un link di pagamento",
  "abbonamento.errore.stripe": "Errore imprevisto su Stripe",
  "abbonamento.errore.nessuno": "Nessun abbonamento da gestire",

  // --- Listino ----------------------------------------------------------
  "piano.ordini.nome": "Ordini e pagamenti",
  "piano.prenotazioni.nome": "Solo prenotazioni",
  "piano.completo.nome": "Tutto",
  "piano.cadenza.mese": "al mese",
  "piano.cadenza.anno": "all'anno",
  "piano.ordini.descrizione":
    "Menu QR, ordine al tavolo, conto alla romana, fattura elettronica.",
  "piano.prenotazioni.descrizione":
    "Pagina di prenotazione per il tuo sito, calendario e conferme.",
  "piano.completo.descrizione": "Ordini, pagamenti e prenotazioni insieme.",
  "piano.nota.disdetta": "Disdetta in qualsiasi momento",
  "piano.nota.senza_sala": "Senza gestionale di sala",
  "piano.nota.risparmio": "59 € in meno dei due separati",
  "piano.nota.due_mesi": "Due mesi in omaggio",

  // --- Corrispettivi ----------------------------------------------------
  "fiscale.titolo": "Corrispettivi",
  "fiscale.sottotitolo":
    "Il gestionale incassa, il registratore certifica. Qui si controlla che i due numeri coincidano.",

  "fiscale.oggi.titolo": "Oggi, per metodo di pagamento",
  "fiscale.oggi.nota":
    "Dal 1° gennaio 2026 il documento commerciale deve riportare come è stato pagato, e l'Agenzia incrocia questi importi con i dati degli acquirer. Se batti a mano, questi sono i numeri da battere.",
  "fiscale.oggi.vuoto": "Nessun conto chiuso oggi.",
  "fiscale.totale": "Totale",

  "fiscale.oggi.aliquote": "Oggi, per aliquota IVA",
  "fiscale.oggi.aliquote.nota":
    "Sul registratore si batte per reparto IVA e poi si sceglie il pagamento: questi sono gli imponibili lordi per aliquota, sommati sulle righe dei documenti di oggi.",
  "fiscale.aliquota": "IVA {aliquota}%",

  "fiscale.arretrati.uno": "{n} documento di una giornata già chiusa",
  "fiscale.arretrati.molti": "{n} documenti di giornate già chiuse",
  "fiscale.arretrati.testo":
    "Non vengono più mandati al registratore: uscirebbero dentro la giornata di oggi, gonfiandola, dopo che la loro giornata è già stata chiusa. Vanno regolarizzati con il commercialista e poi segnati qui sotto come battuti in cassa.",
  "fiscale.arretrati.doc.uno": "{n} documento",
  "fiscale.arretrati.doc.molti": "{n} documenti",

  "fiscale.metodo.card": "Carta",
  "fiscale.metodo.cash": "Contanti",
  "fiscale.metodo.satispay": "Satispay",
  "fiscale.metodo.manual": "Incassato al banco",

  "fiscale.scoperti.uno": "{n} conto chiuso senza documento",
  "fiscale.scoperti.molti": "{n} conti chiusi senza documento",
  "fiscale.scoperti.testo":
    "Sono incassi che non risultano certificati. Succede se qualcosa è andato storto mentre il conto si chiudeva: il tavolo si chiude comunque, perché fermare la sala sarebbe peggio, ma il documento va emesso a mano.",
  "fiscale.scoperti.altri": "e altri {n}.",

  "fiscale.rt.titolo": "Il tuo registratore",

  "fiscale.documenti.titolo": "Documenti",
  "fiscale.documenti.da_certificare": "{n} da certificare",
  "fiscale.documenti.vuoto.attivo":
    "Ancora niente: i documenti compaiono qui quando si chiude un conto.",
  "fiscale.documenti.vuoto.spento":
    "Il collegamento è spento, quindi non viene messo in coda niente. Finché resta così i documenti li batti in cassa come hai sempre fatto.",

  "fiscale.avvertenza.prima": "Questo gestionale",
  "fiscale.avvertenza.forte": "non sostituisce il registratore telematico",
  "fiscale.avvertenza.dopo":
    ": prepara i documenti e, se colleghi il programma sulla cassa, glieli fa emettere. Come vada dichiarato quello che incassi tramite la piattaforma lo stabilisce il tuo commercialista — qui trovi i numeri per farlo, non il parere.",

  // --- Collegamento al registratore -------------------------------------
  "rt.coda": "Metti in coda un documento commerciale a ogni conto chiuso",
  "rt.matricola.etichetta": "Matricola del registratore",
  "rt.matricola.segnaposto": "es. 99XXX1234567",
  "rt.matricola.aiuto":
    "È quella che hai comunicato all'Agenzia collegando il POS al registratore.",
  "rt.stacco.etichetta": "A che ora finisce la giornata di servizio",
  "rt.stacco.aiuto":
    "I corrispettivi si chiudono per giornata di servizio, non a mezzanotte: chi chiude alle due mette le 5:00. Un bar che apre alle sei mette un'ora prima, o i primi caffè finiscono nella giornata di ieri.",

  "rt.come.legenda": "Come si emette",
  "rt.modo.agente.titolo": "Un programma sulla cassa",
  "rt.modo.agente.testo":
    "Gira sul computer del locale, prende i documenti dalla coda e li fa stampare al registratore. La stampante sta sulla tua rete e da qui non la raggiungiamo: serve qualcosa lì.",
  "rt.modo.manuale.titolo": "Li batto io in cassa",
  "rt.modo.manuale.testo":
    "Il gestionale non emette niente: ti prepara il riepilogo di giornata per metodo di pagamento, e tu lo batti come hai sempre fatto.",
  "rt.salva.corso": "Salvo…",

  "rt.marca.etichetta": "Marca della stampante fiscale",
  "rt.marca.aiuto":
    "Parlano dialetti diversi. Se non sai quale hai, c'è scritto sulla stampante.",
  "rt.operatore.etichetta": "Numero operatore",
  "rt.percorso.etichetta": "Percorso, se il modello lo cambia",
  "rt.percorso.segnaposto": "lascia vuoto",

  "rt.reparti.titolo": "Reparti IVA",
  "rt.reparti.aiuto":
    "Sulla stampante ogni aliquota sta su un reparto numerato, e la numerazione l'ha decisa chi l'ha configurata. Mandare tutto sul reparto 1 vuol dire dichiarare tutto con l'aliquota di quel reparto: nessun errore a schermo, un errore fiscale in silenzio.",
  "rt.reparti.aliquota": "IVA {aliquota}%",
  "rt.reparti.segnaposto": "reparto",
  "rt.reparti.dal_menu": "Queste sono le aliquote che compaiono davvero nel tuo menu.",

  "rt.codice.titolo": "Codice per il programma sulla cassa",
  "rt.cassa.ferma.da":
    "La cassa non si fa sentire dalle {quando}: i documenti restano in coda. Controlla che il programma sia acceso.",
  "rt.cassa.ferma.mai":
    "La cassa non si fa sentire da quando hai generato il codice: i documenti restano in coda. Controlla che il programma sia acceso.",
  "rt.cassa.collegata": "Cassa collegata, ultimo contatto {quando}.",
  "rt.codice.genera": "Genera il codice",
  "rt.codice.rigenera": "Genera un codice nuovo",
  "rt.codice.corso": "Genero…",
  "rt.codice.rigenera.aiuto":
    "Generarne uno nuovo spegne il precedente: è il modo di togliere l'accesso a un computer che non c'è più.",
  "rt.codice.copia": "Copialo adesso: non si può rivedere.",

  // --- Esiti delle azioni fiscali ---------------------------------------
  "fiscale.ok.spento": "Spento: i conti chiusi non vengono messi in coda.",
  "fiscale.ok.manuale":
    "Salvato. I documenti restano da battere a mano e trovi il riepilogo qui.",
  "fiscale.ok.agente":
    "Salvato. Genera il codice per il programma sulla cassa, qui sotto.",
  "fiscale.ok.codice": "Copialo adesso: non si può rivedere. Il precedente non vale più.",
  "fiscale.ok.battuto": "Segnato come battuto in cassa.",
  "fiscale.ok.rimesso": "Rimesso in coda: la cassa lo riprende al prossimo giro.",
  "fiscale.errore.matricola":
    "Serve la matricola del registratore: è quella che hai comunicato all'Agenzia.",
  "fiscale.errore.stacco": "Ora di chiusura giornata non valida (0-12)",
  "fiscale.errore.marca": "Marca non riconosciuta",
  "fiscale.errore.operatore": "Numero operatore non valido (1-99)",
  "fiscale.errore.reparti":
    "Indica almeno un reparto: senza, ogni riga finirebbe sul reparto 1 e verrebbe dichiarata con l'aliquota di quel reparto.",
  "fiscale.errore.documento": "Documento non trovato, o già emesso dal registratore",
  "fiscale.errore.rimetti":
    "Si rimettono in coda solo i documenti non riusciti o rimasti in corso.",

  // --- Riga documento ---------------------------------------------------
  "documento.stato.da_emettere": "Da emettere",
  "documento.stato.in_corso": "In corso",
  "documento.stato.emesso": "Emesso",
  "documento.stato.errore": "Non riuscito",
  "documento.stato.battuto_a_mano": "Battuto in cassa",
  "documento.numero_breve": "doc. {numero}",
  "documento.battuto": "L'ho battuto in cassa",
  "documento.numero.segnaposto": "Numero del documento (se lo hai)",
  "documento.numero.aria": "Numero del documento battuto in cassa",
  // Scritta noi nella colonna `errore` quando la stampante non restituisce
  // il numero. Il resto di quella colonna è testo dell'agente o della
  // stampante, e si mostra com'è: non è nostro e non sappiamo tradurlo.
  "documento.errore.senza_numero":
    "Emesso, ma la stampante non ha restituito il numero: recuperalo dal registratore.",
  // Scritta noi quando la connessione con la stampante cade a comando già
  // partito: nessuno può dire se lo scontrino sia uscito.
  "documento.da_verificare":
    "Il collegamento è caduto mentre stampava: lo scontrino potrebbe essere uscito lo stesso. Guarda il registratore prima di decidere.",
  "documento.rimetti": "Rimettilo in coda",
  "documento.battuto.avviso.in_corso":
    "Questo documento è ancora in carico alla cassa: potrebbe averlo già stampato. Controlla il registratore prima di confermare.",
};

const EN: Speculare<typeof IT> = {
  "errore.nessun_locale": "No venue linked to this account.",
  "errore.non_autorizzato": "Not authorised",

  "fattura.vietato.titolo": "Not your area",
  "fattura.vietato.testo":
    "Invoices are for the owner or the manager. Ask the owner if you need them.",
  "fattura.occhiello": "Administration",
  "fattura.titolo": "Electronic invoices",
  "fattura.sottotitolo":
    "Status of invoices sent through Invoicetronic and SDI (Sistema di Interscambio, the Agenzia delle Entrate exchange system for electronic invoices).",
  "fattura.vuoto": "No invoices generated.",
  "fattura.colonna.numero": "Number",
  "fattura.colonna.data": "Date",
  "fattura.colonna.importo": "Amount",
  "fattura.colonna.stato": "Status",
  "fattura.colonna.identificativo": "Identifier",
  "fattura.colonna.documento": "Document",

  "fattura.stato.pending": "Being processed",
  "fattura.stato.sent": "Sent to SDI",
  "fattura.stato.delivered": "Delivered",
  "fattura.stato.rejected": "Rejected",

  "fattura.ferma": "Stuck for over two days: check the status, or ask for support.",
  "fattura.in_attesa": "Waiting",
  "fattura.dettagli": "Details",
  "fattura.apri_xml": "Open XML",
  "fattura.scarica_xml": "Download XML",
  "fattura.xml_invoicetronic": "XML on Invoicetronic",

  "fattura.torna": "← Invoices",
  "fattura.dettaglio.titolo": "Invoice {numero}",
  "fattura.campo.stato": "Status",
  "fattura.campo.data": "Date",
  "fattura.campo.totale": "Total",
  "fattura.campo.provider": "Payment provider",
  "fattura.campo.id_invoicetronic": "Invoicetronic ID",
  "fattura.campo.id_sdi": "SDI ID",
  "fattura.campo.cliente": "Customer",
  "fattura.campo.paese": "Country",
  "fattura.campo.id_fiscale_estero": "Foreign tax ID",
  "fattura.campo.sede": "Registered address",
  "fattura.campo.recapito": "Delivery (Codice Destinatario or PEC)",
  "fattura.campo.copia_email": "Email copy",
  "fattura.email.inviata": "Sent",
  "fattura.email.non_inviata": "Not sent",
  "fattura.conservazione":
    "The original fiscal document is stored and managed by Invoicetronic.",

  "fattura.aggiorna": "Refresh status",
  "fattura.aggiorna.corso": "Refreshing…",
  "fattura.aggiorna.errore": "Check failed: try again shortly.",
  "fattura.errore.non_disponibile": "Invoice or API key not available",
  "fattura.errore.sync": "Sync failed",
  "fattura.errore.documento_non_disponibile": "Document not available",
  "fattura.errore.documento_non_recuperabile":
    "Document could not be retrieved from Invoicetronic",

  "abbonamento.titolo": "Subscription",
  "abbonamento.solo_titolare": "Only the owner can manage the subscription.",
  "abbonamento.piano": "{piano} plan",

  "abbonamento.stato.none": "No subscription",
  "abbonamento.stato.trialing": "Free trial",
  "abbonamento.stato.active": "Active",
  "abbonamento.stato.past_due": "Payment failed",
  "abbonamento.stato.canceled": "Cancelled",
  "abbonamento.stato.incomplete": "Awaiting payment",
  "abbonamento.stato.unpaid": "Unpaid",

  "abbonamento.fino_al": "The service stays on until {data}.",
  "abbonamento.prova_finisce": "The free trial ends on {data}.",
  "abbonamento.rinnovo": "Next renewal on {data}.",
  "abbonamento.past_due":
    "The last charge did not go through. The service stays on for a few more days: update the payment method so the floor keeps working.",
  "abbonamento.non_attivo":
    "Without an active subscription your customers cannot order or pay from the table.",

  "abbonamento.incluso.titolo": "What's included",
  "abbonamento.incluso.menu": "Digital menu with a QR code for every table",
  "abbonamento.incluso.ordine": "Order and pay at the table, split bills included",
  "abbonamento.incluso.prenotazioni": "Bookings and floor management",
  "abbonamento.incluso.marchio": "Your logo and your colours on the customer pages",
  "abbonamento.incluso.fattura": "Electronic invoice requestable from the table",
  "abbonamento.incluso.accessi":
    "Separate logins for owner, front of house and kitchen",
  "abbonamento.incluso.percentuale": "No cut taken by us on your takings",
  "abbonamento.iva":
    "Prices exclude IVA (Italian VAT). Card fees are your payment provider's and you pay them to it: we take nothing off your takings.",
  "abbonamento.incluso.percentuale.si":
    "{percent}% kept by us on card payments made at the table",
  "abbonamento.iva.commissione":
    "Prices exclude IVA (Italian VAT). On cards you pay your payment provider's fees, and on top of those we keep {percent}% on payments made from the guest's phone: it shows on your Stripe statement as an application fee. We keep nothing on Satispay, nor on what you take at the counter on your own card machine.",

  "abbonamento.gestisci": "Manage subscription and invoices",
  "abbonamento.apertura": "Opening…",
  "abbonamento.mensile": "Monthly",
  "abbonamento.annuale": "Yearly — two months free",
  "abbonamento.attivazione": "+ {prezzo} setup fee, once only",
  "abbonamento.prova":
    "First {giorni} days free. Nothing is charged if you cancel before it ends.",

  "abbonamento.errore.piano": "Invalid plan",
  "abbonamento.errore.listino":
    "No price list configured for this plan yet. Check the STRIPE_PRICES variable.",
  "abbonamento.errore.link": "Stripe did not return a payment link",
  "abbonamento.errore.stripe": "Unexpected Stripe error",
  "abbonamento.errore.nessuno": "No subscription to manage",

  "piano.ordini.nome": "Orders and payments",
  "piano.prenotazioni.nome": "Bookings only",
  "piano.completo.nome": "Everything",
  "piano.cadenza.mese": "per month",
  "piano.cadenza.anno": "per year",
  "piano.ordini.descrizione":
    "QR menu, order at the table, split bills, electronic invoice.",
  "piano.prenotazioni.descrizione":
    "Booking page for your website, calendar and confirmations.",
  "piano.completo.descrizione": "Orders, payments and bookings together.",
  "piano.nota.disdetta": "Cancel any time",
  "piano.nota.senza_sala": "Without floor management",
  "piano.nota.risparmio": "€59 less than the two separately",
  "piano.nota.due_mesi": "Two months free",

  "fiscale.titolo": "Corrispettivi (daily takings)",
  "fiscale.sottotitolo":
    "You take the money, the Registratore Telematico (the certified till that reports takings to the Agenzia delle Entrate) certifies it. Here you check the two figures match.",

  "fiscale.oggi.titolo": "Today, by payment method",
  "fiscale.oggi.nota":
    "From 1 January 2026 the documento commerciale (the Italian till receipt) must state how the bill was paid, and the Agenzia delle Entrate cross-checks these amounts against acquirer data. If you ring up by hand, these are the figures to ring up.",
  "fiscale.oggi.vuoto": "No bills closed today.",
  "fiscale.totale": "Total",

  "fiscale.oggi.aliquote": "Today, by aliquota IVA (VAT rate)",
  "fiscale.oggi.aliquote.nota":
    "On the Registratore Telematico you ring up by reparto IVA (VAT department) and then choose the payment: these are the gross amounts per aliquota, summed over the lines of today's documents.",
  "fiscale.aliquota": "IVA {aliquota}%",

  "fiscale.arretrati.uno": "{n} document from a service day already closed",
  "fiscale.arretrati.molti": "{n} documents from service days already closed",
  "fiscale.arretrati.testo":
    "They are no longer sent to the Registratore Telematico: they would come out inside today's service day and inflate it, after their own day was closed. Sort them out with your accountant, then mark them below as rung up on the till.",
  "fiscale.arretrati.doc.uno": "{n} document",
  "fiscale.arretrati.doc.molti": "{n} documents",

  "fiscale.metodo.card": "Card",
  "fiscale.metodo.cash": "Cash",
  "fiscale.metodo.satispay": "Satispay",
  "fiscale.metodo.manual": "Taken at the counter",

  "fiscale.scoperti.uno": "{n} closed bill with no documento commerciale",
  "fiscale.scoperti.molti": "{n} closed bills with no documento commerciale",
  "fiscale.scoperti.testo":
    "These are takings with no certified document. It happens when something goes wrong while the bill is closing: the table closes anyway, because stopping the floor would be worse, but the document has to be issued by hand.",
  "fiscale.scoperti.altri": "and {n} more.",

  "fiscale.rt.titolo": "Your Registratore Telematico",

  "fiscale.documenti.titolo": "Documents",
  "fiscale.documenti.da_certificare": "{n} to certify",
  "fiscale.documenti.vuoto.attivo":
    "Nothing yet: documents appear here when a bill is closed.",
  "fiscale.documenti.vuoto.spento":
    "The link is off, so nothing is queued. While it stays off you ring the documents up on the till as you always have.",

  "fiscale.avvertenza.prima": "This system",
  "fiscale.avvertenza.forte": "does not replace the Registratore Telematico",
  "fiscale.avvertenza.dopo":
    ": it prepares the documents and, if you connect the program on the till, has it issue them. How what you take through the platform must be declared is for your accountant to say — here you find the figures, not the opinion.",

  "rt.coda": "Queue a documento commerciale for every closed bill",
  "rt.matricola.etichetta": "Registratore Telematico serial number (matricola)",
  "rt.matricola.segnaposto": "e.g. 99XXX1234567",
  "rt.matricola.aiuto":
    "It is the one you reported to the Agenzia delle Entrate when you linked the POS to the Registratore Telematico.",
  "rt.stacco.etichetta": "What time the service day ends",
  "rt.stacco.aiuto":
    "Corrispettivi close by service day, not at midnight: if you close at two, put 5:00. A bar opening at six puts an hour earlier, or the first coffees fall into yesterday.",

  "rt.come.legenda": "How they are issued",
  "rt.modo.agente.titolo": "A program on the till",
  "rt.modo.agente.testo":
    "It runs on the venue's computer, takes the documents from the queue and has the Registratore Telematico print them. The printer is on your network and we cannot reach it from here: something has to run there.",
  "rt.modo.manuale.titolo": "I ring them up myself",
  "rt.modo.manuale.testo":
    "The system issues nothing: it prepares the daily summary by payment method, and you ring it up as you always have.",
  "rt.salva.corso": "Saving…",

  "rt.marca.etichetta": "Fiscal printer make",
  "rt.marca.aiuto":
    "They speak different dialects. If you do not know which you have, it is written on the printer.",
  "rt.operatore.etichetta": "Operator number",
  "rt.percorso.etichetta": "Path, if your model changes it",
  "rt.percorso.segnaposto": "leave empty",

  "rt.reparti.titolo": "IVA departments (reparti)",
  "rt.reparti.aiuto":
    "On the printer each IVA rate sits on a numbered reparto, and whoever configured it chose the numbering. Sending everything to reparto 1 means declaring everything at that reparto's rate: no error on screen, a silent tax error.",
  "rt.reparti.aliquota": "IVA {aliquota}%",
  "rt.reparti.segnaposto": "reparto",
  "rt.reparti.dal_menu": "These are the rates that actually appear in your menu.",

  "rt.codice.titolo": "Code for the program on the till",
  "rt.cassa.ferma.da":
    "The till has not checked in since {quando}: documents stay in the queue. Check the program is running.",
  "rt.cassa.ferma.mai":
    "The till has not checked in since you generated the code: documents stay in the queue. Check the program is running.",
  "rt.cassa.collegata": "Till connected, last contact {quando}.",
  "rt.codice.genera": "Generate the code",
  "rt.codice.rigenera": "Generate a new code",
  "rt.codice.corso": "Generating…",
  "rt.codice.rigenera.aiuto":
    "Generating a new one switches the previous off: it is how you take access away from a computer that is no longer there.",
  "rt.codice.copia": "Copy it now: it cannot be shown again.",

  "fiscale.ok.spento": "Off: closed bills are not queued.",
  "fiscale.ok.manuale":
    "Saved. The documents stay to be rung up by hand and you find the summary here.",
  "fiscale.ok.agente":
    "Saved. Generate the code for the program on the till, below.",
  "fiscale.ok.codice":
    "Copy it now: it cannot be shown again. The previous one no longer works.",
  "fiscale.ok.battuto": "Marked as rung up on the till.",
  "fiscale.ok.rimesso": "Back in the queue: the till picks it up on its next round.",
  "fiscale.errore.matricola":
    "The Registratore Telematico serial number (matricola) is required: it is the one you reported to the Agenzia delle Entrate.",
  "fiscale.errore.stacco": "Service day closing time is not valid (0-12)",
  "fiscale.errore.marca": "Make not recognised",
  "fiscale.errore.operatore": "Operator number is not valid (1-99)",
  "fiscale.errore.reparti":
    "Set at least one reparto: without it every line would land on reparto 1 and be declared at that reparto's rate.",
  "fiscale.errore.documento":
    "Document not found, or already issued by the Registratore Telematico",
  "fiscale.errore.rimetti":
    "Only failed documents, or ones left in progress, can go back in the queue.",

  "documento.stato.da_emettere": "To issue",
  "documento.stato.in_corso": "In progress",
  "documento.stato.emesso": "Issued",
  "documento.stato.errore": "Failed",
  "documento.stato.battuto_a_mano": "Rung up on the till",
  "documento.numero_breve": "doc. {numero}",
  "documento.battuto": "I rang it up on the till",
  "documento.numero.segnaposto": "Document number (if you have it)",
  "documento.numero.aria": "Number of the document rung up on the till",
  "documento.errore.senza_numero":
    "Issued, but the printer didn't give back the number: pick it up from the till roll.",
  "documento.da_verificare":
    "The connection dropped while it was printing: the receipt may have come out anyway. Check the Registratore Telematico before deciding.",
  "documento.rimetti": "Put it back in the queue",
  "documento.battuto.avviso.in_corso":
    "This document is still with the till: it may already have printed it. Check the Registratore Telematico before confirming.",
};

export const tSoldi = dizionario(IT, EN);
export type VociSoldi = typeof IT;
