import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Le pagine di servizio: home, informativa privacy (generica e del locale),
 * informativa cookie, termini.
 *
 * L'italiano è il testo che fa fede. L'inglese serve a far capire al turista
 * che cosa succede ai suoi dati, non a sostituire il documento: per questo in
 * testa a ogni pagina legale, quando la lingua è l'inglese, compare la riga
 * `legale.prevalenza`, che dice quale versione vale se le due divergono.
 *
 * Molte voci sono spezzate in `.a` / `.forte` / `.b` perché la frase originale
 * ha un `<strong>`, un `<em>` o un `<code>` in mezzo. Spezzare è brutto ma
 * onesto: l'alternativa è mettere HTML dentro il dizionario e darlo in pasto a
 * `dangerouslySetInnerHTML` in una pagina che parla di sicurezza dei dati.
 *
 * I nomi propri non si traducono: il nome del locale (titolare del
 * trattamento), il "Garante per la protezione dei dati personali", il
 * "Sistema di Interscambio", "Agenzia delle Entrate". Sono gli enti a cui il
 * cliente deve poter scrivere: tradurli renderebbe la frase più scorrevole e
 * l'indirizzo irreperibile.
 */

const IT = {
  // Layout e metadati generali
  "app.titolo": "Ordina al tavolo",
  "app.descrizione": "Consulta il menu, ordina e paga dal tuo telefono.",

  // Home
  "home.titolo": "Ordina dal tavolo",
  "home.istruzioni":
    "Inquadra il QR code sul tuo tavolo per aprire il menu, ordinare e pagare dal telefono.",
  "nav.privacy": "Privacy",
  "nav.termini": "Termini",
  "nav.cookie": "Cookie",

  // Comuni ai documenti legali
  "legale.prevalenza":
    "In caso di divergenza fra le due versioni prevale il testo italiano.",
  "legale.aggiornamento": "Ultimo aggiornamento: settembre 2026.",
  "cookie.link": "informativa cookie",
  "privacy.garante": "Garante per la protezione dei dati personali",

  // Informativa cookie
  "cookie.titolo": "Informativa cookie",
  "cookie.intro.a": "Questo servizio",
  "cookie.intro.forte": "non usa cookie di profilazione",
  "cookie.intro.b":
    ", non raccoglie statistiche di navigazione, non ospita pixel pubblicitari e non condivide dati con reti di advertising. Per questo non trovi un banner che ti chiede di accettare qualcosa: non c'è nulla da accettare.",

  "cookie.salvato.titolo": "Cosa viene effettivamente salvato",
  "cookie.tabella.nome": "Nome",
  "cookie.tabella.chi": "Chi lo imposta",
  "cookie.tabella.scopo": "A cosa serve",
  "cookie.tabella.durata": "Durata",
  "cookie.stripe.chi": "Stripe, solo nella pagina di pagamento",
  "cookie.stripe.scopo":
    "Riconoscere tentativi di frode con carta. Senza, il pagamento non può essere messo in sicurezza.",
  "cookie.stripe.durata": "1 anno e 30 minuti",
  "cookie.sessione.chi": "Il gestionale del locale, non le pagine cliente",
  "cookie.sessione.scopo": "Tenere collegato il personale dopo l'accesso",
  "cookie.sessione.durata": "12 ore",

  "cookie.tecnici.a": "Sono entrambi",
  "cookie.tecnici.forte": "cookie tecnici",
  "cookie.tecnici.b":
    ": servono a erogare un servizio che hai chiesto tu — pagare in sicurezza, restare collegato — e secondo le Linee guida del Garante del 10 giugno 2021 non richiedono consenso preventivo. Le pagine che vedi al tavolo, quando non stai pagando, non impostano alcun cookie.",

  "cookie.memoria.titolo": "Memoria del browser",
  "cookie.memoria.a": "Il servizio non usa",
  "cookie.memoria.b":
    "né impronte digitali del dispositivo. Il carrello vive nella pagina aperta e sparisce quando la chiudi.",

  "cookie.rimuovere.titolo": "Come rimuoverli",
  "cookie.rimuovere.testo":
    "I cookie tecnici si cancellano dalle impostazioni del browser, alla voce dati dei siti. Bloccando quelli di Stripe il pagamento con carta smette di funzionare: in quel caso puoi pagare al banco.",

  "cookie.cambia.titolo": "Se qualcosa cambia",
  "cookie.cambia.a":
    "Se in futuro venisse introdotto uno strumento di misurazione o di marketing, questa pagina verrebbe aggiornata e comparirebbe una richiesta di consenso",
  "cookie.cambia.enfasi": "prima",
  "cookie.cambia.b":
    "dell'installazione, con la possibilità di rifiutare senza perdere l'uso del servizio.",

  // Informativa privacy generica
  "privacy.titolo": "Informativa privacy",
  "privacy.intro.a":
    "Questa piattaforma è usata da molti ristoranti e bar, ognuno dei quali è",
  "privacy.intro.forte": "titolare autonomo",
  "privacy.intro.b":
    "del trattamento dei dati dei propri clienti. Non esiste quindi un'informativa unica: quella che ti riguarda è del locale presso cui hai ordinato, pagato o prenotato.",

  "privacy.trovare.titolo": "Come trovare quella giusta",
  "privacy.trovare.tavolo":
    "Dalla pagina del tuo tavolo o dal menu del locale, in fondo, alla voce",
  "privacy.trovare.indirizzo.a": "Oppure all'indirizzo",
  "privacy.trovare.indirizzo.b":
    "seguito dal nome del locale come compare nel link del menu.",

  "privacy.piattaforma.titolo": "Il ruolo di chi gestisce la piattaforma",
  "privacy.piattaforma.testo":
    "Il fornitore della piattaforma tratta i dati esclusivamente per conto dei locali e secondo le loro istruzioni, in qualità di responsabile del trattamento nominato ai sensi dell'art. 28 GDPR. Non usa i dati dei clienti dei locali per finalità proprie, non li rivende e non li impiega per pubblicità o profilazione.",

  "privacy.cookie.titolo": "Cookie",
  "privacy.cookie.a": "Vale per tutti i locali ed è descritto nella",
  "privacy.cookie.b":
    ": nessun cookie di profilazione, nessuna analitica, nessun banner.",

  "privacy.reclami.titolo": "Reclami",
  "privacy.reclami.a": "Puoi rivolgerti al",
  "privacy.reclami.b": ", Piazza Venezia 11, 00187 Roma — garante@gpdp.it.",

  // Informativa privacy del singolo locale
  "privacy.locale.meta": "Informativa privacy — {nome}",
  "privacy.locale.sommario.a": "Come",
  "privacy.locale.sommario.b":
    "tratta i tuoi dati quando ordini, paghi o prenoti da questo servizio. Ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679.",

  "privacy.locale.chi.titolo": "Chi tratta i tuoi dati",
  "privacy.locale.chi.a": "Il titolare del trattamento è",
  "privacy.locale.piva": "P. IVA {numero}",
  "privacy.locale.cf": "C.F. {codice}",
  "privacy.locale.sede": ", con sede in {indirizzo}",
  "privacy.locale.contatti":
    "Per esercitare i tuoi diritti puoi scrivere a: {elenco}.",
  "privacy.locale.contatti.mancanti":
    "I recapiti per l'esercizio dei diritti non sono ancora stati indicati dal locale: chiedili direttamente al personale.",
  "privacy.locale.incompleto":
    "Alcuni estremi del titolare non risultano compilati. Il personale del locale può fornirteli su richiesta.",
  "privacy.locale.responsabile":
    "Il gestore della piattaforma tratta i dati per conto del locale, in qualità di responsabile del trattamento nominato ai sensi dell'art. 28 GDPR.",

  "privacy.locale.dati.titolo":
    "Quali dati, per farne cosa, e con quale base giuridica",
  "privacy.locale.tabella.dati": "Dati",
  "privacy.locale.tabella.finalita": "Finalità",
  "privacy.locale.tabella.base": "Base giuridica",
  "privacy.locale.tabella.conservazione": "Conservazione",

  "privacy.locale.base.contratto": "Esecuzione del contratto — art. 6.1.b",
  "privacy.locale.base.obbligo": "Obbligo legale — art. 6.1.c",
  "privacy.locale.base.precontrattuale":
    "Esecuzione di misure precontrattuali — art. 6.1.b",
  "privacy.locale.base.interesse":
    "Legittimo interesse alla sicurezza — art. 6.1.f",

  "privacy.locale.ordine.dati":
    "Piatti ordinati, quantità, note per la cucina, importi",
  "privacy.locale.ordine.finalita": "Prendere e servire il tuo ordine",
  "privacy.locale.ordine.conservazione":
    "Con i dati contabili del locale, per i termini di legge",

  "privacy.locale.pagamento.dati": "Esito del pagamento, importo, metodo",
  "privacy.locale.pagamento.finalita": "Incassare il conto e chiudere il tavolo",
  "privacy.locale.pagamento.conservazione": "10 anni (art. 2220 c.c.)",

  "privacy.locale.fattura.dati":
    "Dati di fatturazione: codice fiscale o partita IVA, codice destinatario o PEC",
  "privacy.locale.fattura.finalita":
    "Emettere la fattura elettronica e trasmetterla al Sistema di Interscambio",
  "privacy.locale.fattura.conservazione": "10 anni",

  "privacy.locale.prenotazione.dati":
    "Prenotazione: nome, telefono, email, numero di persone, richieste particolari",
  "privacy.locale.prenotazione.finalita": "Gestire la prenotazione del tavolo",
  "privacy.locale.prenotazione.conservazione":
    "Fino a 24 mesi dalla data prenotata, poi cancellata",

  "privacy.locale.ip.dati":
    "Indirizzo IP, in forma pseudonimizzata e non riconducibile a te senza una chiave che non è conservata insieme al dato",
  "privacy.locale.ip.finalita":
    "Impedire invii ripetuti e abusi sui moduli pubblici",
  "privacy.locale.ip.conservazione": "Massimo 2 ore",

  "privacy.locale.salute":
    "Se scrivi una richiesta particolare nella prenotazione o una nota per la cucina, evita di indicare informazioni sulla salute. Per allergie e intolleranze parlane a voce con il personale: è più sicuro e non lascia un dato sanitario scritto.",

  "privacy.locale.carta.titolo": "I dati della tua carta",
  "privacy.locale.carta.testo":
    "I dati della carta non passano mai dai sistemi del locale né da questa piattaforma: vengono inseriti direttamente nei moduli del fornitore di pagamento, che li tratta come titolare autonomo secondo la propria informativa. Il locale riceve solo l'esito, l'importo e le ultime cifre del metodo usato.",

  "privacy.locale.destinatari.titolo": "A chi vengono comunicati",
  "privacy.locale.destinatari.piattaforma.forte": "Fornitore della piattaforma",
  "privacy.locale.destinatari.piattaforma.testo":
    "— responsabile del trattamento, per il funzionamento del servizio.",
  "privacy.locale.destinatari.hosting.forte": "Fornitore di hosting e banca dati",
  "privacy.locale.destinatari.hosting.testo":
    "— i dati sono ospitati su server nell'Unione Europea (Francoforte), presso fornitori le cui capogruppo hanno sede negli Stati Uniti.",
  "privacy.locale.destinatari.pagamento.forte": "Fornitore di pagamento",
  "privacy.locale.destinatari.pagamento.testo":
    "(Stripe, Satispay) — titolare autonomo per i dati di pagamento.",
  "privacy.locale.destinatari.fattura.forte":
    "Intermediario per la fatturazione elettronica",
  "privacy.locale.destinatari.fattura.mezzo":
    ", solo se richiedi la fattura, e di conseguenza",
  "privacy.locale.destinatari.fattura.agenzia": "l'Agenzia delle Entrate",
  "privacy.locale.destinatari.fattura.fine": "tramite il Sistema di Interscambio.",
  "privacy.locale.destinatari.cassa.forte": "Software di cassa del locale",
  "privacy.locale.destinatari.cassa.testo":
    ", se collegato, per trasmettere la comanda.",
  "privacy.locale.destinatari.nota":
    "I dati non vengono venduti, ceduti a fini pubblicitari, né usati per profilazione o decisioni automatizzate.",

  "privacy.locale.trasferimenti.titolo": "Trasferimenti fuori dall'Unione Europea",
  "privacy.locale.trasferimenti.testo":
    "La banca dati risiede fisicamente nell'Unione Europea, a Francoforte. I fornitori che la gestiscono — così come quelli di hosting applicativo e di pagamento — hanno però società capogruppo negli Stati Uniti, e possono quindi essere raggiunti da richieste delle autorità statunitensi anche per dati conservati in Europa. I trasferimenti avvengono sulla base delle clausole contrattuali tipo approvate dalla Commissione europea e, ove applicabile, dell'adeguatezza riconosciuta al quadro UE-USA per la protezione dei dati.",

  "privacy.locale.cookie.titolo": "Cookie e tecnologie simili",
  "privacy.locale.cookie.a":
    "Questo servizio non usa cookie di profilazione, di analisi statistica né di terze parti a fini pubblicitari, e non installa alcun cookie che richieda il tuo consenso. Il dettaglio è nella",

  "privacy.locale.diritti.titolo": "I tuoi diritti",
  "privacy.locale.diritti.testo":
    "Puoi chiedere in ogni momento l'accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità, e opporti al trattamento fondato sul legittimo interesse (artt. 15-22 GDPR). Le richieste vanno rivolte al titolare, ai recapiti indicati sopra; il fornitore della piattaforma assiste il locale nel darvi seguito.",
  "privacy.locale.diritti.limiti":
    "Alcuni dati non possono essere cancellati su richiesta finché dura l'obbligo di conservarli: è il caso dei documenti contabili e fiscali.",
  "privacy.locale.diritti.reclamo.a":
    "Se ritieni che il trattamento violi il Regolamento puoi proporre reclamo al",
  "privacy.locale.diritti.reclamo.b":
    "(Piazza Venezia 11, 00187 Roma — garante@gpdp.it) o rivolgerti all'autorità giudiziaria.",

  "privacy.locale.conferimento.titolo": "Conferimento dei dati",
  "privacy.locale.conferimento.testo":
    "Il conferimento è facoltativo, ma senza i dati indicati come necessari non è possibile prendere l'ordine, incassare il conto, emettere la fattura o registrare la prenotazione.",

  // Termini di servizio
  "termini.titolo": "Termini di servizio",
  "termini.bozza":
    "BOZZA — punto di partenza tecnico, non un documento legale validato. Va rivisto da un legale prima della pubblicazione.",
  "termini.oggetto.titolo": "Oggetto",
  "termini.oggetto.testo":
    "Questo servizio permette di consultare il menu, inviare ordini al locale e pagare il conto dal proprio dispositivo. Il contratto di somministrazione è concluso direttamente con il locale, che resta l'unico responsabile della preparazione, della qualità e della somministrazione di quanto ordinato.",
  "termini.ordini.titolo": "Ordini",
  "termini.ordini.testo":
    "L'invio di un ordine dal tavolo equivale a una richiesta al locale. Eventuali modifiche o annullamenti vanno concordati direttamente con il personale di sala.",
  "termini.pagamenti.titolo": "Pagamenti",
  "termini.pagamenti.testo":
    "I pagamenti sono elaborati dai provider abilitati (Stripe, Satispay). Il pagamento si considera perfezionato quando il provider ne conferma l'esito. Le somme sono incassate dal locale.",
  "termini.fattura.titolo": "Fattura elettronica",
  "termini.fattura.testo":
    "Se richiesta, la fattura è emessa dal locale e trasmessa al Sistema di Interscambio. È responsabilità di chi la richiede fornire dati fiscali corretti e completi.",
  "termini.rimborsi.titolo": "Rimborsi e contestazioni",
  "termini.rimborsi.testo":
    "Contestazioni su quanto ordinato, importi o rimborsi vanno rivolte direttamente al locale, che ne è la controparte contrattuale.",
};

const EN: Speculare<typeof IT> = {
  "app.titolo": "Order at your table",
  "app.descrizione": "Browse the menu, order and pay from your phone.",

  "home.titolo": "Order from your table",
  "home.istruzioni":
    "Scan the QR code on your table to open the menu, order and pay from your phone.",
  "nav.privacy": "Privacy",
  "nav.termini": "Terms",
  "nav.cookie": "Cookies",

  "legale.prevalenza":
    "The Italian text is the binding version: if the two differ, the Italian wording prevails.",
  "legale.aggiornamento": "Last updated: September 2026.",
  "cookie.link": "cookie notice",
  "privacy.garante": "Garante per la protezione dei dati personali",

  "cookie.titolo": "Cookie notice",
  "cookie.intro.a": "This service",
  "cookie.intro.forte": "does not use profiling cookies",
  "cookie.intro.b":
    ", does not collect browsing statistics, does not host advertising pixels and does not share data with advertising networks. That is why there is no banner asking you to accept anything: there is nothing to accept.",

  "cookie.salvato.titolo": "What is actually stored",
  "cookie.tabella.nome": "Name",
  "cookie.tabella.chi": "Who sets it",
  "cookie.tabella.scopo": "What it is for",
  "cookie.tabella.durata": "Duration",
  "cookie.stripe.chi": "Stripe, on the payment page only",
  "cookie.stripe.scopo":
    "Spotting attempted card fraud. Without them, the payment cannot be secured.",
  "cookie.stripe.durata": "1 year and 30 minutes",
  "cookie.sessione.chi": "The venue's management system, not the guest pages",
  "cookie.sessione.durata": "12 hours",
  "cookie.sessione.scopo": "Keeping staff signed in after they log in",

  "cookie.tecnici.a": "Both are",
  "cookie.tecnici.forte": "strictly necessary cookies",
  "cookie.tecnici.b":
    ": they deliver a service you asked for — paying securely, staying signed in — and under the Italian Data Protection Authority's guidelines of 10 June 2021 they do not require prior consent. The pages you see at the table, when you are not paying, set no cookies at all.",

  "cookie.memoria.titolo": "Browser storage",
  "cookie.memoria.a": "The service uses neither",
  "cookie.memoria.b":
    "nor device fingerprinting. Your basket lives in the open page and disappears when you close it.",

  "cookie.rimuovere.titolo": "How to remove them",
  "cookie.rimuovere.testo":
    "Strictly necessary cookies can be deleted from your browser settings, under site data. If you block Stripe's cookies, card payment stops working: in that case you can pay at the counter.",

  "cookie.cambia.titolo": "If anything changes",
  "cookie.cambia.a":
    "If a measurement or marketing tool were introduced in future, this page would be updated and a consent request would appear",
  "cookie.cambia.enfasi": "before",
  "cookie.cambia.b":
    "it is installed, with the option to refuse without losing the use of the service.",

  "privacy.titolo": "Privacy notice",
  "privacy.intro.a":
    "This platform is used by many restaurants and bars, each of which is an",
  "privacy.intro.forte": "independent data controller",
  "privacy.intro.b":
    "for its own customers' data. There is therefore no single notice: the one that concerns you is the one belonging to the venue where you ordered, paid or booked.",

  "privacy.trovare.titolo": "How to find the right one",
  "privacy.trovare.tavolo":
    "From your table page or from the venue's menu, at the foot of the page, under",
  "privacy.trovare.indirizzo.a": "Or at the address",
  "privacy.trovare.indirizzo.b":
    "followed by the venue name as it appears in the menu link.",

  "privacy.piattaforma.titolo": "The role of the platform operator",
  "privacy.piattaforma.testo":
    "The platform provider processes data solely on behalf of the venues and on their instructions, as a data processor appointed under Article 28 GDPR. It does not use venue customers' data for its own purposes, does not resell it and does not use it for advertising or profiling.",

  "privacy.cookie.titolo": "Cookies",
  "privacy.cookie.a": "It is the same for every venue and is described in the",
  "privacy.cookie.b": ": no profiling cookies, no analytics, no banner.",

  "privacy.reclami.titolo": "Complaints",
  "privacy.reclami.a": "You can contact the Italian Data Protection Authority,",
  "privacy.reclami.b": ", Piazza Venezia 11, 00187 Rome — garante@gpdp.it.",

  "privacy.locale.meta": "Privacy notice — {nome}",
  "privacy.locale.sommario.a": "How",
  "privacy.locale.sommario.b":
    "processes your data when you order, pay or book through this service. Pursuant to Articles 13 and 14 of Regulation (EU) 2016/679.",

  "privacy.locale.chi.titolo": "Who processes your data",
  "privacy.locale.chi.a": "The data controller is",
  "privacy.locale.piva": "VAT no. {numero}",
  "privacy.locale.cf": "Tax code {codice}",
  "privacy.locale.sede": ", with registered office at {indirizzo}",
  "privacy.locale.contatti":
    "To exercise your rights you can write to: {elenco}.",
  "privacy.locale.contatti.mancanti":
    "The venue has not yet given contact details for exercising your rights: ask the staff directly.",
  "privacy.locale.incompleto":
    "Some of the controller's details have not been filled in. The venue's staff can give them to you on request.",
  "privacy.locale.responsabile":
    "The platform operator processes the data on behalf of the venue, as a data processor appointed under Article 28 GDPR.",

  "privacy.locale.dati.titolo": "What data, what for, and on what legal basis",
  "privacy.locale.tabella.dati": "Data",
  "privacy.locale.tabella.finalita": "Purpose",
  "privacy.locale.tabella.base": "Legal basis",
  "privacy.locale.tabella.conservazione": "Retention",

  "privacy.locale.base.contratto": "Performance of the contract — Art. 6(1)(b)",
  "privacy.locale.base.obbligo": "Legal obligation — Art. 6(1)(c)",
  "privacy.locale.base.precontrattuale":
    "Steps taken prior to entering into a contract — Art. 6(1)(b)",
  "privacy.locale.base.interesse":
    "Legitimate interest in security — Art. 6(1)(f)",

  "privacy.locale.ordine.dati":
    "Dishes ordered, quantities, notes for the kitchen, amounts",
  "privacy.locale.ordine.finalita": "Taking and serving your order",
  "privacy.locale.ordine.conservazione":
    "With the venue's accounting records, for the periods required by law",

  "privacy.locale.pagamento.dati": "Payment outcome, amount, method",
  "privacy.locale.pagamento.finalita":
    "Collecting the bill and closing the table",
  "privacy.locale.pagamento.conservazione":
    "10 years (Art. 2220 of the Italian Civil Code)",

  "privacy.locale.fattura.dati":
    "Invoicing details: tax code or VAT number, recipient code or certified email address (PEC)",
  "privacy.locale.fattura.finalita":
    "Issuing the electronic invoice and sending it to the Sistema di Interscambio",
  "privacy.locale.fattura.conservazione": "10 years",

  "privacy.locale.prenotazione.dati":
    "Booking: name, telephone, email, number of guests, special requests",
  "privacy.locale.prenotazione.finalita": "Managing your table booking",
  "privacy.locale.prenotazione.conservazione":
    "Up to 24 months from the booked date, then deleted",

  "privacy.locale.ip.dati":
    "IP address, pseudonymised and not traceable back to you without a key that is not stored alongside the data",
  "privacy.locale.ip.finalita":
    "Preventing repeated submissions and abuse of the public forms",
  "privacy.locale.ip.conservazione": "2 hours at most",

  "privacy.locale.salute":
    "If you write a special request on a booking or a note for the kitchen, please avoid giving health information. For allergies and intolerances, speak to the staff in person: it is safer and leaves no written health data behind.",

  "privacy.locale.carta.titolo": "Your card details",
  "privacy.locale.carta.testo":
    "Card details never pass through the venue's systems or through this platform: they are entered directly into the payment provider's own forms, and the provider handles them as an independent controller under its own privacy notice. The venue receives only the outcome, the amount and the last digits of the method used.",

  "privacy.locale.destinatari.titolo": "Who the data is disclosed to",
  "privacy.locale.destinatari.piattaforma.forte": "Platform provider",
  "privacy.locale.destinatari.piattaforma.testo":
    "— data processor, for the running of the service.",
  "privacy.locale.destinatari.hosting.forte": "Hosting and database provider",
  "privacy.locale.destinatari.hosting.testo":
    "— the data is hosted on servers in the European Union (Frankfurt), with providers whose parent companies are based in the United States.",
  "privacy.locale.destinatari.pagamento.forte": "Payment provider",
  "privacy.locale.destinatari.pagamento.testo":
    "(Stripe, Satispay) — independent controller for payment data.",
  "privacy.locale.destinatari.fattura.forte":
    "Electronic invoicing intermediary",
  "privacy.locale.destinatari.fattura.mezzo":
    ", only if you ask for an invoice, and consequently",
  "privacy.locale.destinatari.fattura.agenzia":
    "the Italian Revenue Agency (Agenzia delle Entrate)",
  "privacy.locale.destinatari.fattura.fine":
    "through the Sistema di Interscambio.",
  "privacy.locale.destinatari.cassa.forte": "The venue's till software",
  "privacy.locale.destinatari.cassa.testo":
    ", where connected, to send the order ticket through.",
  "privacy.locale.destinatari.nota":
    "The data is not sold, passed on for advertising purposes, or used for profiling or automated decision-making.",

  "privacy.locale.trasferimenti.titolo": "Transfers outside the European Union",
  "privacy.locale.trasferimenti.testo":
    "The database physically resides in the European Union, in Frankfurt. The providers that run it — like those for application hosting and for payments — do however have parent companies in the United States, and so may be reached by requests from US authorities even for data held in Europe. Transfers take place on the basis of the standard contractual clauses approved by the European Commission and, where applicable, of the adequacy recognised for the EU-US data protection framework.",

  "privacy.locale.cookie.titolo": "Cookies and similar technologies",
  "privacy.locale.cookie.a":
    "This service uses no profiling cookies, no statistical analytics cookies and no third-party advertising cookies, and installs no cookie that requires your consent. The details are in the",

  "privacy.locale.diritti.titolo": "Your rights",
  "privacy.locale.diritti.testo":
    "At any time you may request access to your data, its rectification, its erasure, restriction of processing and portability, and you may object to processing based on legitimate interest (Articles 15-22 GDPR). Requests should be addressed to the controller, at the contact details given above; the platform provider assists the venue in dealing with them.",
  "privacy.locale.diritti.limiti":
    "Some data cannot be erased on request for as long as the duty to keep it lasts: that is the case for accounting and tax records.",
  "privacy.locale.diritti.reclamo.a":
    "If you believe the processing infringes the Regulation you may lodge a complaint with the Italian Data Protection Authority,",
  "privacy.locale.diritti.reclamo.b":
    "(Piazza Venezia 11, 00187 Rome — garante@gpdp.it) or bring the matter before the courts.",

  "privacy.locale.conferimento.titolo": "Providing your data",
  "privacy.locale.conferimento.testo":
    "Providing your data is optional, but without the data marked as necessary it is not possible to take your order, collect the bill, issue the invoice or record the booking.",

  "termini.titolo": "Terms of service",
  "termini.bozza":
    "DRAFT — a technical starting point, not a validated legal document. It must be reviewed by a lawyer before publication.",
  "termini.oggetto.titolo": "Subject matter",
  "termini.oggetto.testo":
    "This service lets you browse the menu, send orders to the venue and pay the bill from your own device. The contract for the supply of food and drink is entered into directly with the venue, which remains solely responsible for the preparation, the quality and the serving of whatever is ordered.",
  "termini.ordini.titolo": "Orders",
  "termini.ordini.testo":
    "Sending an order from the table amounts to a request made to the venue. Any changes or cancellations must be agreed directly with the floor staff.",
  "termini.pagamenti.titolo": "Payments",
  "termini.pagamenti.testo":
    "Payments are processed by the enabled providers (Stripe, Satispay). A payment is treated as completed when the provider confirms its outcome. The sums are collected by the venue.",
  "termini.fattura.titolo": "Electronic invoicing",
  "termini.fattura.testo":
    "If requested, the invoice is issued by the venue and sent to the Sistema di Interscambio. Anyone requesting one is responsible for providing correct and complete tax details.",
  "termini.rimborsi.titolo": "Refunds and complaints",
  "termini.rimborsi.testo":
    "Complaints about what was ordered, about amounts or about refunds must be addressed directly to the venue, which is the contracting party.",
};

export const tLegale = dizionario(IT, EN);
