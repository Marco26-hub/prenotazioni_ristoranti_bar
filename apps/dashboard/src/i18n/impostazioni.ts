import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Le parole delle Impostazioni del gestionale.
 *
 * È la pagina più densa di istituti italiani che non hanno un equivalente
 * inglese: Partita IVA, Codice Fiscale, regime fiscale, coperto,
 * corrispettivi. Non si traducono, perché il commercialista inglese che
 * legge "VAT number" e poi deve compilare un portale che dice "Partita IVA"
 * si blocca. Restano in italiano, con la spiegazione inglese fra parentesi
 * la prima volta che compaiono nella schermata.
 *
 * Sul resto l'inglese è quello del mestiere: "covers" per i coperti,
 * "service charge" per il servizio, "counter" per il banco, "set menu" per
 * la formula a prezzo fisso.
 */

const IT = {
  // --- Pagina -------------------------------------------------------------
  "pagina.nessun_locale": "Nessun locale associato.",
  "pagina.negato.titolo": "Non è roba tua",
  "pagina.negato.testo":
    "Le impostazioni del locale le cambia chi comanda. Chiedi al titolare se ti serve.",
  "pagina.titolo": "Impostazioni — {locale}",

  // --- Stati dei pulsanti -------------------------------------------------
  "stato.salvataggio": "Salvataggio…",
  "stato.salvataggio_punti": "Salvataggio...",
  "stato.salvo": "Salvo…",
  "stato.attendere_punti": "Attendere...",
  "stato.verifica_punti": "Verifica...",
  "stato.verifico": "Verifico…",
  "stato.attivazione": "Attivazione...",

  // --- Marchio ------------------------------------------------------------
  "sezione.brand.titolo": "Il tuo marchio",
  "sezione.brand.testo":
    "Logo, colore e contatti che i clienti vedono quando scansionano il QR.",
  "brand.nome": "Nome mostrato ai clienti",
  "brand.logo": "Logo",
  "brand.logo.alt": "Logo attuale",
  "brand.logo.nota": "PNG, JPG, WEBP o SVG, massimo 200 KB.",
  "brand.colore": "Colore principale",
  "brand.colore.nota":
    "Usato per pulsanti ed evidenziazioni nella pagina che vedono i clienti.",
  "brand.telefono": "Telefono pubblico",
  "brand.email": "Email pubblica",
  "brand.mancia": "Proponi la mancia al cliente",
  "brand.mancia.nota":
    "Percentuali separate da virgola. Quella centrale viene indicata al cliente come \"più scelta\".",
  "brand.recensioni": "Link per le recensioni Google",
  "brand.recensioni.nota":
    "Dal tuo profilo Google Business, voce \"Chiedi recensioni\". Compare al cliente subito dopo il pagamento, quando è più disposto a lasciarla.",
  "brand.salvato": "Personalizzazione salvata.",
  "brand.salva": "Salva personalizzazione",
  "brand.errore.nome": "Il nome del locale è obbligatorio",
  "brand.errore.mancia": "Indica almeno una percentuale di mancia, es. 5,10,15",
  "brand.errore.recensioni": "Il link recensioni deve iniziare con https://",
  "brand.errore.colore": "Colore non valido: usa il formato #RRGGBB",
  "brand.errore.logo.formato":
    "Formato logo non supportato: usa PNG, JPG, WEBP o SVG",
  "brand.errore.logo.peso": "Il logo supera 200 KB: caricane uno più leggero",

  // --- Annuncio -----------------------------------------------------------
  "sezione.annuncio.titolo": "Annuncio ai clienti",
  "sezione.annuncio.testo":
    "Compare all'apertura del menu, sia al tavolo sia dalla pagina pubblica. Serve per il menu del giorno, una serata a tema o una chiusura straordinaria. Chi lo chiude non lo rivede, finché non ne pubblichi uno diverso.",
  "annuncio.mostra": "Mostra l'annuncio ai clienti",
  "annuncio.titolo": "Titolo",
  "annuncio.titolo.placeholder": "Menu del giorno · Serata pesce",
  "annuncio.testo": "Testo",
  "annuncio.testo.placeholder":
    "Antipasto di mare\nRisotto allo scoglio\nDolce della casa\n\n32 € a persona, bevande escluse",
  "annuncio.testo.nota":
    "Gli a capo vengono rispettati: puoi scrivere il menu una portata per riga.",
  "annuncio.immagine": "Immagine (facoltativa)",
  "annuncio.immagine.nota":
    "JPG, PNG o WEBP fino a 500 KB. Se hai già la locandina della serata, caricala così com'è. Lasciando vuoto resta quella attuale.",
  "annuncio.cta.testo": "Bottone — testo",
  "annuncio.cta.testo.placeholder": "Prenota un tavolo",
  "annuncio.cta.link": "Bottone — link",
  "annuncio.da": "Da (facoltativo)",
  "annuncio.a": "Fino a (facoltativo)",
  "annuncio.date.nota":
    "Con una data di fine l'annuncio sparisce da solo. Senza, resta finché non lo togli: un «Menu di San Valentino» ancora visibile a marzo fa più danno che altro.",
  "annuncio.salva": "Salva annuncio",
  "annuncio.errore.titolo": "Serve almeno un titolo per mostrare l'annuncio",
  "annuncio.errore.link":
    "Il link del bottone deve iniziare per http:// o https://",
  "annuncio.errore.date": "La data di fine deve venire dopo quella di inizio",
  "annuncio.errore.formato": "Formato non supportato: usa JPG, PNG o WEBP",
  "annuncio.errore.peso": "Immagine troppo pesante (massimo 500 KB)",
  "annuncio.ok.spento": "Salvato. L'annuncio non è mostrato ai clienti.",
  "annuncio.ok.scaduto":
    "Salvato, ma la data di fine è già passata: non comparirà.",
  "annuncio.ok.futuro": "Salvato. Comparirà alla data di inizio indicata.",
  "annuncio.ok": "Salvato. I clienti lo vedono aprendo il menu.",

  // --- Prenotazioni -------------------------------------------------------
  "sezione.prenotazioni.titolo": "Prenotazioni",
  "sezione.prenotazioni.testo":
    "Regola come arrivano e come vengono accettate le richieste dalla tua pagina pubblica di prenotazione.",
  "prenotazioni.email": "Dove ricevere le richieste",
  "prenotazioni.email.placeholder": "prenotazioni@iltuolocale.it",
  "prenotazioni.email.nota":
    "Spesso non è l'indirizzo pubblico: le prenotazioni le guarda una persona sola. Lasciando vuoto usiamo l'email pubblica del locale.",
  "prenotazioni.capienza": "Quanti coperti puoi servire nella stessa fascia",
  "prenotazioni.capienza.placeholder": "es. 40",
  "prenotazioni.capienza.nota":
    "Serve a dire di no da soli quando è pieno, e a proporre al cliente gli orari vicini in cui c'è posto. Senza, ogni richiesta arriva a te senza controllo.",
  "prenotazioni.auto": "Conferma da sola le richieste che ci stanno nella capienza",
  "prenotazioni.auto.nota":
    "Il cliente riceve subito la conferma. Tu puoi comunque annullare.",
  "prenotazioni.errore.email": "Email non valida",
  "prenotazioni.errore.capienza": "Capienza non valida",
  "prenotazioni.errore.auto":
    "Per la conferma automatica devi indicare quanti coperti puoi servire.",
  "prenotazioni.ok.auto":
    "Salvato. Le richieste fino a {capienza} coperti per fascia vengono accettate da sole.",
  "prenotazioni.ok.manuale":
    "Salvato. Confermerai tu ogni richiesta dal calendario.",

  // --- Orari e assistente -------------------------------------------------
  "sezione.assistente.titolo": "Orari e assistente",
  "sezione.assistente.testo":
    "Gli orari servono comunque. L'assistente è facoltativo e a consumo: risponde ai clienti sulle pagine pubbliche e li porta a prenotare.",
  "assistente.orari": "Orari",
  "assistente.orari.placeholder":
    "Martedì-domenica 12:00-14:30 e 19:00-23:00\nLunedì chiuso\nCucina fino alle 22:30",
  "assistente.orari.nota":
    "Scrivili come li diresti al telefono, eccezioni comprese. Compaiono sulla pagina pubblica anche senza assistente.",
  "assistente.info": "Informazioni pratiche",
  "assistente.info.placeholder":
    "Parcheggio in piazza a 50 metri. Dehors coperto. Cani ammessi. Accessibile in carrozzina.",
  "assistente.info.nota":
    "Parcheggio, dehors, animali, accessibilità: le domande che oggi arrivano al telefono.",
  "assistente.accendi": "Accendi l'assistente sulle pagine pubbliche",
  "assistente.accendi.costo":
    "Ogni domanda di un cliente è una chiamata addebitata sul tuo account OpenRouter. Spento non costa nulla.",
  "assistente.accendi.serve_chiave": "Serve prima una chiave OpenRouter, qui sopra.",
  "assistente.limiti":
    "Risponde solo con quello che hai scritto tu: menu, orari, indirizzo, informazioni pratiche. Su allergie e intolleranze riporta ciò che è dichiarato e rimanda sempre al personale — non dichiara mai un piatto sicuro, perché una risposta sbagliata lì manda qualcuno in ospedale.",
  "assistente.errore.chiave":
    "Per accendere l'assistente serve prima una chiave OpenRouter: senza, non può rispondere a nulla.",
  "assistente.errore.orari":
    "Indica gli orari prima di accenderlo: è la domanda che riceverai per prima.",
  "assistente.ok.acceso":
    "Assistente acceso. Compare sul menu pubblico e sulla pagina di prenotazione; ogni domanda è una chiamata addebitata sul tuo account OpenRouter.",
  "assistente.ok.spento":
    "Salvato. L'assistente è spento: nessuna chiamata, nessun costo.",

  // --- Schede vino da foto (OpenRouter) -----------------------------------
  "sezione.openrouter.titolo": "Schede vino da foto",
  "sezione.openrouter.testo":
    "Fotografi l'etichetta e la scheda si compila da sé. Quello che esce è una proposta da rileggere: in carta ci va quello che confermi tu.",
  "openrouter.attiva.prima": "Attiva, modello",
  "openrouter.attiva.dopo":
    ". Nel menu, sui vini, compare il bottone per compilare la scheda da una foto dell'etichetta.",
  "openrouter.non_attiva": "Non attiva. Le schede dei vini si compilano a mano.",
  "openrouter.cambia": "Cambia o rimuovi",
  "openrouter.collega": "Collega OpenRouter",
  "openrouter.serve.prima": "Serve un account su",
  "openrouter.serve.dopo":
    ". Le chiamate vengono addebitate sul tuo account, non sul nostro: leggere un'etichetta costa una frazione di centesimo.",
  "openrouter.chiave": "Chiave API",
  "openrouter.chiave.nota": "Salvata cifrata.",
  "openrouter.modello": "Modello",
  "openrouter.modello.nota":
    "Deve saper leggere le immagini. Il catalogo di OpenRouter cambia spesso: se il modello non esiste più, l'errore te lo dice testualmente e ne basta un altro.",
  "openrouter.privacy":
    "La foto dell'etichetta viene inviata a OpenRouter e al fornitore del modello. Non contiene dati dei tuoi clienti, ma è un trattamento in più nella catena: se tieni un registro, va annotato.",
  "openrouter.rimuovi_chiave": "Rimuovi la chiave",

  // --- Testi delle pagine pubbliche ---------------------------------------
  "sezione.testi.titolo": "Testi delle pagine pubbliche",
  "sezione.testi.testo":
    "Piatti e prezzi li scrivi dal Menu. Qui riscrivi le frasi intorno: il titolo della pagina prenotazioni, la presentazione del locale, la nota in fondo alla carta.",
  "testi.intro.prima":
    "Le frasi che il cliente legge intorno al menu e alle prenotazioni. Lascia vuoto per tenere il testo che vedi in grigio. Scrivi",
  "testi.intro.mezzo": "dove vuoi che compaia",
  "testi.intro.fine": ".",
  "testi.vuoto.placeholder": "Vuoto: non compare niente",
  "testi.locale_generico": "il tuo locale",
  "testi.salva": "Salva testi",
  "testi.errore.locale": "Locale non trovato",
  "testi.ok": "Testi salvati.",

  // --- Tempi e allarmi ----------------------------------------------------
  // Ogni quanto un tavolo riparte da zero. Era fisso a sei ore e deciso da
  // noi per tutti: giusto per una trattoria, sbagliato per due turni.
  "sezione.sessione.titolo": "Quando un tavolo riparte da zero",
  "sezione.sessione.testo":
    "Un tavolo lasciato aperto resta lo stesso conto: chi inquadra il QR dopo si aggiunge a quello di prima. Passate queste ore, il conto vecchio si chiude e ne comincia uno nuovo.",
  "sessione.ore": "Ore prima di chiudere un tavolo lasciato aperto",
  "sessione.nota":
    "0 significa mai: il tavolo resta aperto finché non lo chiude qualcuno.",
  "sessione.nota.turni":
    "Se fai due turni, mettilo sotto la distanza fra l\u2019uno e l\u2019altro: altrimenti il secondo turno eredita il conto del primo, e a prezzo fisso paga una formula per tutti.",
  "sessione.salva": "Salva",
  "sessione.errore": "Numero di ore non valido (0-24)",
  "sessione.ok": "Un tavolo lasciato aperto si chiude dopo {n} ore.",
  "sessione.ok.mai": "I tavoli lasciati aperti non si chiudono da soli.",
  "sezione.soglie.titolo": "Tempi e allarmi",
  "sezione.soglie.testo":
    "Quanto può aspettare un tavolo, e quanto può restare seduto dopo aver pagato, prima che tu voglia accorgertene.",
  "soglia.ritardo": "Minuti dopo i quali una comanda è in ritardo",
  "soglia.ritardo.nota.prima":
    "Si conta dal momento in cui il cliente ordina. Superata la soglia il tavolo lampeggia in rosso in sala e sul monitor comande, finché il piatto non è pronto. Metti",
  "soglia.ritardo.nota.dopo": " per spegnere l'allarme.",
  "soglia.recupero": "Minuti dopo il saldo oltre i quali il tavolo va recuperato",
  "soglia.recupero.nota.prima":
    "Un tavolo che ha pagato e resta seduto per un po' è normale — il caffè, i cappotti. Passata questa soglia diventa un coperto già incassato che tiene occupato un posto, e in sala lo vedi evidenziato.",
  "soglia.recupero.nota.dopo": " per non essere avvisato.",
  "soglia.salva": "Salva soglia",
  "soglia.errore.ritardo": "Indica un valore fra 0 e 240 minuti per i ritardi",
  "soglia.errore.recupero":
    "Indica un valore fra 0 e 240 minuti per il recupero tavolo",
  "soglia.ok": "Ritardi {ritardi}, recupero tavolo {recupero}.",
  "soglia.ok.ritardi_spenti": "spenti",
  "soglia.ok.recupero_spento": "spento",
  "soglia.ok.dopo_min": "dopo {n} min",

  // --- Coperto e servizio -------------------------------------------------
  "sezione.coperto.titolo": "Coperto e servizio",
  "sezione.coperto.testo":
    "Se il tuo locale li applica, vanno dichiarati al cliente insieme ai prezzi dei piatti.",
  "coperto.importo": "Coperto a persona (€)",
  "coperto.servizio": "Servizio (%)",
  "coperto.iva": "IVA su coperto e servizio (%)",
  "coperto.iva.nota":
    "Vale solo in fattura elettronica. Di norma è l'aliquota della somministrazione, ma chiedilo al tuo commercialista: qui il programma non decide al posto suo.",
  "coperto.intervallo": "Attesa fra un'ordinazione e la successiva (minuti)",
  "coperto.intervallo.nota":
    "Il metodo dell'all you can eat: si ordina a ondate. Senza, un tavolo da sei manda ottanta piatti in tre minuti, la cucina li prepara tutti insieme e metà restano nel piatto. Il cliente vede il tempo che manca sul pulsante, non lo scopre premendo. 0 = nessuna attesa.",
  "coperto.etichetta": "Come si chiama in conto",
  "coperto.etichetta.placeholder": "Coperto · Pane e coperto · Servizio",
  "coperto.nota":
    "Il coperto si moltiplica per i coperti indicati dallo staff sulla scheda del tavolo. Il servizio si calcola sull'ordinato, non sul coperto. Entrambi compaiono al cliente già sul menu: la legge li tratta come una voce di prezzo, non come una sorpresa in fondo al conto.",
  "coperto.errore.importo": "Coperto non valido (0-50 €)",
  "coperto.errore.servizio": "Servizio non valido (0-30%)",
  "coperto.errore.iva": "Aliquota di coperto e servizio non valida (0-30%)",
  "coperto.errore.intervallo":
    "Intervallo fra gli ordini non valido (0-120 minuti)",
  "coperto.ok.nulla":
    "Salvato. Nessun coperto né servizio: al cliente non compare nulla.",
  "coperto.ok": "Salvato. Compare sul menu del cliente e come voce a parte nel conto.",

  // --- Formula a prezzo fisso ---------------------------------------------
  "sezione.formula.titolo": "Formula a prezzo fisso",
  "sezione.formula.testo":
    "Si paga a persona e i piatti compresi non si pagano a piatto: è il modello dell'all you can eat. Il tavolo può comunque essere passato alla carta dallo staff.",
  "formula.attiva": "Il locale propone una formula a prezzo fisso",
  "formula.pranzo": "Prezzo a persona, pranzo (€)",
  "formula.cena": "Prezzo a persona, cena (€)",
  "formula.ora": "Da che ora vale il prezzo di cena",
  "formula.ora.nota":
    "Conta l'ora in cui il tavolo si è seduto, non quella in cui chiede il conto: chi si siede alle 12:30 paga il pranzo anche se esce alle 17.",
  "formula.bambini": "I bambini",
  "formula.bambini.adulti": "Pagano come gli adulti",
  "formula.bambini.gratis": "Non pagano",
  "formula.bambini.ridotto": "Pagano una tariffa ridotta",
  "formula.bambino.tariffa": "Tariffa bambino (€)",
  "formula.eta": "Fino a che età (anni)",
  "formula.eta.placeholder": "es. 10",
  "formula.eta.nota":
    "Serve a scriverlo sul menu. Senza una soglia dichiarata, due tavoli identici pagano diverso a seconda di chi li serve.",
  "formula.supplemento": "Supplemento per l'avanzato (€)",
  "formula.supplemento.nota.prima":
    "Lo aggiunge il cameriere alla chiusura, guardando il tavolo: nessun programma può sapere quanto è rimasto nel piatto. Va scritto sul menu",
  "formula.supplemento.nota.forte": "prima",
  "formula.supplemento.nota.dopo":
    "che si ordini — se compare solo sul conto è una condizione che il cliente non ha accettato. 0 = non lo applichi.",
  "formula.predefinita": "I nuovi tavoli partono già a formula",
  "formula.nota": "Cosa comprende, per il cliente",
  "formula.nota.placeholder":
    "Tutto il menu esclusi dolci, caffè, amari e bevande. Ordinazioni a ondate.",
  "formula.fuori.prima":
    "Le voci che restano a pagamento si segnano una per una nel menu, con la spunta",
  "formula.fuori.forte": "Fuori formula",
  "formula.fuori.dopo": ": dolci, caffè, amari, bevande e i piatti premium.",
  "formula.salva": "Salva formula",
  "formula.errore.prezzi": "Prezzi non validi (0-500 €)",
  "formula.errore.bambino":
    "Indica la tariffa bambino, o scegli un'altra opzione",
  "formula.errore.eta": "Età bambini non valida (0-17)",
  "formula.errore.ora": "Ora della cena non valida",
  "formula.errore.senza_prezzo": "Imposta almeno un prezzo, di pranzo o di cena",
  "formula.ok.spenta": "Formula spenta: i tavoli pagano i piatti a prezzo di carta.",
  "formula.ok.predefinita":
    "Salvato. I nuovi tavoli partono a formula; lo staff può passarli alla carta.",
  "formula.ok.carta":
    "Salvato. I tavoli partono alla carta; lo staff accende la formula quando serve.",

  // --- Numeri di ritiro ---------------------------------------------------
  "sezione.ritiro.titolo": "Numeri di ritiro",
  "sezione.ritiro.testo":
    "Per chi consegna al bancone e non al tavolo: piadineria, pizza al taglio, gastronomia. Ogni ordine prende un numero che riparte da uno a ogni giornata di servizio, e lo schermo del banco dice quale chiamare.",
  "ritiro.banco.titolo": "Si consegna al bancone",
  "ritiro.banco.nota":
    "Piadineria, pizza al taglio, gastronomia: la gente si siede dove capita, o non si siede affatto. Ogni cliente che inquadra il QR apre un conto suo — al tavolo invece il conto si condivide, e con un QR solo al bancone la piadina del secondo finirebbe sul conto del primo. La pagina principale diventa il Banco.",
  "ritiro.numero": "Dai un numero a ogni ordine",
  "ritiro.come": "Come avvisi chi aspetta",
  "ritiro.metodo.segnaposto": "Segnaposto numerato",
  "ritiro.metodo.segnaposto.nota":
    "Il cliente porta al tavolo un cavalierino col numero. Al banco vedi quale chiamare.",
  "ritiro.metodo.cercapersone": "Cercapersone",
  "ritiro.metodo.cercapersone.nota":
    "Il disco che vibra quando è pronto. Il banco ti dice quale far suonare.",
  "ritiro.metodo.telefono": "Avviso sul telefono",
  "ritiro.metodo.telefono.nota":
    "Chi ha ordinato dal QR vede il proprio numero diventare «pronto» da solo, senza stare in piedi davanti al bancone.",
  "ritiro.piu.nota":
    "Puoi sceglierne più d'uno: molti consegnano il segnaposto e avvisano anche sul telefono, per chi si è seduto fuori e il numero sul tavolo non lo vede nessuno.",
  "ritiro.errore.metodi":
    "Scegli almeno un modo per avvisare chi aspetta, o il numero non lo saprà nessuno.",
  "ritiro.ok.spento": "Numeri di ritiro spenti: si serve al tavolo.",
  "ritiro.ok":
    "Salvato. I numeri ripartono da uno a ogni giornata di servizio, e li vedi nella pagina Banco.",

  // --- Email ai clienti ---------------------------------------------------
  "sezione.email.titolo": "Email ai clienti",
  "sezione.email.testo":
    "Da quale indirizzo partono conferme e rifiuti delle prenotazioni.",
  "email.collegato.prima": "Le email ai tuoi clienti partono da",
  "email.piattaforma":
    "Le email partono dal nostro mittente, con risposta al tuo indirizzo. Non devi fare nulla.",
  "email.non_attivo":
    "L'invio email non è ancora attivo: le prenotazioni arrivano solo nel gestionale e il cliente non riceve conferme.",
  "email.cambia": "Cambia o rimuovi il tuo mittente",
  "email.usa_dominio": "Usa il tuo dominio",
  "email.serve.prima": "Serve un account su",
  "email.serve.dopo":
    "e il tuo dominio verificato lì dentro, il che richiede di aggiungere due record DNS. È l'unico passaggio tecnico del prodotto: se non te ne occupi tu, lascia perdere e resta il nostro mittente — funziona uguale.",
  "email.mittente": "Mittente",
  "email.mittente.placeholder": "prenotazioni@iltuolocale.it",
  "email.chiave": "Chiave API Resend",
  "email.chiave.nota":
    "Salvata cifrata. Salvando mandiamo una prova al mittente indicato: se non arriva, il dominio non è verificato.",
  "email.rimuovi": "Rimuovi e torna al mittente della piattaforma",
  "email.salva_prova": "Salva e prova",
  "email.errore.vuoto": "Inserisci chiave e mittente, o non cambiare nulla",
  "email.errore.chiave": "La chiave Resend inizia per re_",
  "email.errore.mittente": "Il mittente deve essere un indirizzo email",
  "email.prova.oggetto": "Prova di invio — gestionale",
  "email.prova.testo":
    "Se leggi questo messaggio, il mittente del tuo locale è configurato correttamente. Le conferme di prenotazione partiranno da qui.",
  "email.errore.resend":
    "Resend ha rifiutato l'invio: {errore}. Controlla che il dominio del mittente sia verificato.",
  "email.ok.rimosso": "Rimosso. Le email tornano a partire dal nostro mittente.",
  "email.ok.collegato":
    "Collegato. Abbiamo mandato una prova a {indirizzo}: controlla che sia arrivata.",

  // --- Password -----------------------------------------------------------
  "sezione.password.titolo": "Password",
  "password.attuale": "Password attuale",
  "password.nuova": "Nuova password (min 8 caratteri)",
  "password.ripeti": "Ripeti nuova password",
  "password.aggiornata": "Password aggiornata.",
  "password.cambia": "Cambia password",
  "password.errore.corta":
    "La nuova password deve essere di almeno 8 caratteri",
  "password.errore.diverse": "Le due password non coincidono",
  "password.errore.attuale": "Password attuale non corretta",

  // --- Stripe -------------------------------------------------------------
  "sezione.stripe.titolo": "Pagamenti (Stripe)",
  "stripe.stato_ignoto":
    "Stato del collegamento non verificabile in questo momento. I pagamenti già attivi continuano a funzionare.",
  "stripe.attivo": "Attivo — i clienti possono pagare il conto dal telefono.",
  "stripe.incompleto":
    "Onboarding iniziato ma non completato — mancano dati richiesti da Stripe.",
  "stripe.completa": "Completa onboarding Stripe",
  "stripe.collega.testo":
    "Collega un account Stripe per accettare pagamenti al tavolo. Ti verranno chiesti dati dell'attività e coordinate bancarie sulla pagina Stripe.",
  "stripe.connetti": "Connetti Stripe",
  "stripe.errore.avvio": "Errore avvio connessione Stripe",
  "stripe.errore.rete": "Connessione assente — riprova.",
  // Errori che tornano dall'endpoint di connessione: il bottone li mostra
  // com'è, quindi vanno tradotti là dove nascono.
  "stripe.errore.nessun_locale": "Nessun locale associato",
  "stripe.errore.permessi": "Permessi insufficienti",
  "stripe.errore.piattaforma":
    "I pagamenti non sono ancora configurati sulla piattaforma. Contatta l'assistenza.",
  "stripe.errore.locale_non_trovato": "Locale non trovato",

  // --- Satispay -----------------------------------------------------------
  "sezione.satispay.titolo": "Pagamenti (Satispay)",
  "satispay.connesso": "Connesso.",
  "satispay.serve.prima": "Serve prima un",
  "satispay.serve.link": "account Satispay Business",
  "satispay.serve.dopo":
    "attivato, con un negozio creato e un codice di attivazione generato dalla loro dashboard — incollalo qui sotto.",
  "satispay.codice.placeholder":
    "Codice attivazione (dalla Dashboard Satispay Business)",
  "satispay.connetti": "Connetti Satispay",
  "satispay.ok": "Satispay connesso.",
  "satispay.errore.codice": "Codice attivazione mancante",
  "satispay.errore.attivazione": "Attivazione Satispay non riuscita",

  // --- Tilby --------------------------------------------------------------
  "sezione.tilby.titolo": "Gestionale di cassa (Tilby)",
  "tilby.intro.prima":
    "Collegando la cassa puoi importare il menu che hai già, con prezzi e aliquote IVA corretti, senza reinserirlo a mano. Il token si ottiene aderendo al",
  "tilby.intro.link": "Developer Program di Tilby",
  "tilby.intro.dopo": ", che prevede approvazione e costi propri.",
  "tilby.collegato": "Collegato al negozio \"{negozio}\".",
  "tilby.collegato.breve": "Collegato a \"{negozio}\".",
  "tilby.scollega": "Scollega Tilby",
  "tilby.token.placeholder": "Token Tilby del tuo negozio",
  "tilby.collega": "Collega Tilby",
  "tilby.errore.token": "Inserisci il token Tilby",
  "tilby.errore.contatto": "Impossibile contattare Tilby",

  // --- Fatturazione elettronica -------------------------------------------
  "sezione.fattura.titolo": "Fatturazione elettronica (SDI)",
  "fattura.serve.prima": "Serve un account",
  "fattura.serve.dopo":
    "(o compatibile) con la sua API key. Verifica i dati fiscali con il tuo commercialista prima di attivare — qui gestiamo il caso di vendita standard (TD01) a privato o azienda.",
  "fattura.piva.placeholder": "Partita IVA (es. IT01234567891)",
  "fattura.cf.placeholder": "Codice fiscale",
  "fattura.regime.ordinario": "RF01 — Ordinario",
  "fattura.regime.forfettario": "RF19 — Forfettario",
  "fattura.indirizzo.placeholder": "Indirizzo (via e numero civico)",
  "fattura.cap.placeholder": "CAP",
  "fattura.comune.placeholder": "Comune",
  "fattura.provincia.placeholder": "Prov.",
  "fattura.chiave.impostata":
    "API key già impostata — lascia vuoto per non cambiarla",
  "fattura.chiave.placeholder":
    "API key Invoicetronic (ik_live_... o ik_test_...)",
  "fattura.salva": "Salva dati fatturazione",

  // --- Lingua -------------------------------------------------------------
  "sezione.lingua.titolo": "Lingua",
  "sezione.lingua.testo":
    "Sono due cose diverse: una è come vedi tu il gestionale, l'altra è in che lingua si apre la pagina che il cliente guarda al tavolo.",
  "lingua.mia": "La tua lingua del gestionale",
  "lingua.mia.nota":
    "Vale solo per te, su qualunque dispositivo tu faccia l'accesso. Gli altri del personale scelgono la loro.",
  "lingua.mia.auto": "Decide il browser",
  "lingua.locale": "Lingua di partenza delle pagine pubbliche",
  "lingua.locale.nota":
    "Vale per tutti i clienti del locale: è la lingua con cui si aprono il menu al tavolo e la pagina di prenotazione. Il cliente può sempre cambiarla.",
  "lingua.salva": "Salva lingua",
  "lingua.errore.valore": "Lingua non valida",
  "lingua.ok":
    "Salvato. Il gestionale è in {mia}; le pagine pubbliche partono in {pubblica}.",
  "lingua.ok.auto":
    "Salvato. Il gestionale segue la lingua del browser; le pagine pubbliche partono in {pubblica}.",
};

const EN: Speculare<typeof IT> = {
  // --- Pagina -------------------------------------------------------------
  "pagina.nessun_locale": "No venue linked to this account.",
  "pagina.negato.titolo": "Not yours to change",
  "pagina.negato.testo":
    "Venue settings are changed by whoever runs the place. Ask the owner if you need something.",
  "pagina.titolo": "Settings — {locale}",

  // --- Stati dei pulsanti -------------------------------------------------
  "stato.salvataggio": "Saving…",
  "stato.salvataggio_punti": "Saving...",
  "stato.salvo": "Saving…",
  "stato.attendere_punti": "Please wait...",
  "stato.verifica_punti": "Checking...",
  "stato.verifico": "Checking…",
  "stato.attivazione": "Activating...",

  // --- Marchio ------------------------------------------------------------
  "sezione.brand.titolo": "Your brand",
  "sezione.brand.testo":
    "Logo, colour and contact details customers see when they scan the QR code.",
  "brand.nome": "Name shown to customers",
  "brand.logo": "Logo",
  "brand.logo.alt": "Current logo",
  "brand.logo.nota": "PNG, JPG, WEBP or SVG, 200 KB maximum.",
  "brand.colore": "Main colour",
  "brand.colore.nota":
    "Used for buttons and highlights on the page customers see.",
  "brand.telefono": "Public phone number",
  "brand.email": "Public email",
  "brand.mancia": "Offer the customer a tip",
  "brand.mancia.nota":
    "Percentages separated by commas. The middle one is shown to the customer as \"most chosen\".",
  "brand.recensioni": "Google review link",
  "brand.recensioni.nota":
    "From your Google Business profile, under \"Ask for reviews\". It appears to the customer right after payment, when they are most willing to leave one.",
  "brand.salvato": "Branding saved.",
  "brand.salva": "Save branding",
  "brand.errore.nome": "The venue name is required",
  "brand.errore.mancia": "Enter at least one tip percentage, e.g. 5,10,15",
  "brand.errore.recensioni": "The review link must start with https://",
  "brand.errore.colore": "Invalid colour: use the #RRGGBB format",
  "brand.errore.logo.formato":
    "Logo format not supported: use PNG, JPG, WEBP or SVG",
  "brand.errore.logo.peso": "The logo is over 200 KB: upload a lighter one",

  // --- Annuncio -----------------------------------------------------------
  "sezione.annuncio.titolo": "Customer announcement",
  "sezione.annuncio.testo":
    "It shows when the menu opens, both at the table and from the public page. Use it for the daily menu, a themed evening or an unexpected closure. Whoever dismisses it won't see it again until you publish a different one.",
  "annuncio.mostra": "Show the announcement to customers",
  "annuncio.titolo": "Title",
  "annuncio.titolo.placeholder": "Daily menu · Fish night",
  "annuncio.testo": "Text",
  "annuncio.testo.placeholder":
    "Seafood starter\nSeafood risotto\nHouse dessert\n\n€32 per person, drinks not included",
  "annuncio.testo.nota":
    "Line breaks are kept: you can write the menu one course per line.",
  "annuncio.immagine": "Image (optional)",
  "annuncio.immagine.nota":
    "JPG, PNG or WEBP up to 500 KB. If you already have the poster for the evening, upload it as it is. Leave it empty and the current one stays.",
  "annuncio.cta.testo": "Button — text",
  "annuncio.cta.testo.placeholder": "Book a table",
  "annuncio.cta.link": "Button — link",
  "annuncio.da": "From (optional)",
  "annuncio.a": "Until (optional)",
  "annuncio.date.nota":
    "With an end date the announcement disappears on its own. Without one it stays until you take it down: a «Valentine's menu» still showing in March does more harm than good.",
  "annuncio.salva": "Save announcement",
  "annuncio.errore.titolo": "A title is needed to show the announcement",
  "annuncio.errore.link":
    "The button link must start with http:// or https://",
  "annuncio.errore.date": "The end date must come after the start date",
  "annuncio.errore.formato": "Format not supported: use JPG, PNG or WEBP",
  "annuncio.errore.peso": "Image too heavy (500 KB maximum)",
  "annuncio.ok.spento": "Saved. The announcement is not shown to customers.",
  "annuncio.ok.scaduto":
    "Saved, but the end date has already passed: it won't appear.",
  "annuncio.ok.futuro": "Saved. It will appear on the start date you set.",
  "annuncio.ok": "Saved. Customers see it when they open the menu.",

  // --- Prenotazioni -------------------------------------------------------
  "sezione.prenotazioni.titolo": "Bookings",
  "sezione.prenotazioni.testo":
    "Set how requests from your public booking page arrive and how they are accepted.",
  "prenotazioni.email": "Where to receive requests",
  "prenotazioni.email.placeholder": "bookings@yourvenue.com",
  "prenotazioni.email.nota":
    "Often it isn't the public address: bookings are watched by one person only. Leave it empty and we use the venue's public email.",
  "prenotazioni.capienza": "How many covers you can serve in the same slot",
  "prenotazioni.capienza.placeholder": "e.g. 40",
  "prenotazioni.capienza.nota":
    "It lets the system say no on its own when you are full, and offer the customer nearby times where there is room. Without it, every request reaches you unchecked.",
  "prenotazioni.auto": "Automatically confirm requests that fit the capacity",
  "prenotazioni.auto.nota":
    "The customer is confirmed straight away. You can still cancel.",
  "prenotazioni.errore.email": "Invalid email",
  "prenotazioni.errore.capienza": "Invalid capacity",
  "prenotazioni.errore.auto":
    "For automatic confirmation you have to state how many covers you can serve.",
  "prenotazioni.ok.auto":
    "Saved. Requests up to {capienza} covers per slot are accepted automatically.",
  "prenotazioni.ok.manuale":
    "Saved. You will confirm each request yourself from the calendar.",

  // --- Orari e assistente -------------------------------------------------
  "sezione.assistente.titolo": "Opening hours and assistant",
  "sezione.assistente.testo":
    "The opening hours are needed either way. The assistant is optional and pay-as-you-go: it answers customers on the public pages and leads them to book.",
  "assistente.orari": "Opening hours",
  "assistente.orari.placeholder":
    "Tuesday-Sunday 12:00-14:30 and 19:00-23:00\nClosed Monday\nKitchen until 22:30",
  "assistente.orari.nota":
    "Write them the way you would say them on the phone, exceptions included. They appear on the public page even without the assistant.",
  "assistente.info": "Practical information",
  "assistente.info.placeholder":
    "Parking in the square 50 metres away. Covered outdoor seating. Dogs welcome. Wheelchair accessible.",
  "assistente.info.nota":
    "Parking, outdoor seating, pets, accessibility: the questions that reach you by phone today.",
  "assistente.accendi": "Turn the assistant on for the public pages",
  "assistente.accendi.costo":
    "Every customer question is a call charged to your OpenRouter account. Switched off it costs nothing.",
  "assistente.accendi.serve_chiave": "You need an OpenRouter key first, just above.",
  "assistente.limiti":
    "It answers only with what you have written: menu, opening hours, address, practical information. On allergies and intolerances it reports what is declared and always refers the customer back to the staff — it never calls a dish safe, because a wrong answer there sends somebody to hospital.",
  "assistente.errore.chiave":
    "To turn the assistant on you need an OpenRouter key first: without one it can't answer anything.",
  "assistente.errore.orari":
    "Enter the opening hours before turning it on: it is the first question you will get.",
  "assistente.ok.acceso":
    "Assistant on. It appears on the public menu and on the booking page; every question is a call charged to your OpenRouter account.",
  "assistente.ok.spento":
    "Saved. The assistant is off: no calls, no cost.",

  // --- Schede vino da foto (OpenRouter) -----------------------------------
  "sezione.openrouter.titolo": "Wine cards from a photo",
  "sezione.openrouter.testo":
    "Photograph the label and the card fills itself in. What comes out is a draft to read over: what goes on the wine list is what you confirm.",
  "openrouter.attiva.prima": "On, model",
  "openrouter.attiva.dopo":
    ". In the menu, on wines, a button appears to fill in the card from a photo of the label.",
  "openrouter.non_attiva": "Off. Wine cards are filled in by hand.",
  "openrouter.cambia": "Change or remove",
  "openrouter.collega": "Connect OpenRouter",
  "openrouter.serve.prima": "You need an account on",
  "openrouter.serve.dopo":
    ". The calls are charged to your account, not ours: reading a label costs a fraction of a cent.",
  "openrouter.chiave": "API key",
  "openrouter.chiave.nota": "Stored encrypted.",
  "openrouter.modello": "Model",
  "openrouter.modello.nota":
    "It has to be able to read images. OpenRouter's catalogue changes often: if the model no longer exists, the error says so in plain words and any other one will do.",
  "openrouter.privacy":
    "The photo of the label is sent to OpenRouter and to the model provider. It holds no customer data, but it is one more processing step in the chain: if you keep a register, note it down.",
  "openrouter.rimuovi_chiave": "Remove the key",

  // --- Testi delle pagine pubbliche ---------------------------------------
  "sezione.testi.titolo": "Public page wording",
  "sezione.testi.testo":
    "Dishes and prices you write from the Menu. Here you rewrite the words around them: the booking page title, the venue's introduction, the note at the foot of the menu.",
  "testi.intro.prima":
    "The sentences the customer reads around the menu and the bookings. Leave empty to keep the text you see in grey. Write",
  "testi.intro.mezzo": "wherever you want",
  "testi.intro.fine": " to appear.",
  "testi.vuoto.placeholder": "Empty: nothing appears",
  "testi.locale_generico": "your venue",
  "testi.salva": "Save wording",
  "testi.errore.locale": "Venue not found",
  "testi.ok": "Wording saved.",

  // --- Tempi e allarmi ----------------------------------------------------
  "sezione.sessione.titolo": "When a table starts over",
  "sezione.sessione.testo":
    "A table left open stays the same bill: whoever scans the QR next joins the previous one. After these hours, the old bill closes and a new one begins.",
  "sessione.ore": "Hours before a table left open is closed",
  "sessione.nota": "0 means never: the table stays open until someone closes it.",
  "sessione.nota.turni":
    "Running two sittings? Set this below the gap between them, or the second sitting inherits the first one\u2019s bill — and on a set menu it pays for one.",
  "sessione.salva": "Save",
  "sessione.errore": "That number of hours isn\u2019t valid (0-24)",
  "sessione.ok": "A table left open now closes after {n} hours.",
  "sessione.ok.mai": "Tables left open will not close by themselves.",
  "sezione.soglie.titolo": "Timings and alerts",
  "sezione.soglie.testo":
    "How long a table can wait, and how long it can sit on after paying, before you want to notice.",
  "soglia.ritardo": "Minutes after which an order counts as late",
  "soglia.ritardo.nota.prima":
    "Counted from the moment the customer orders. Past the threshold the table flashes red in the dining room and on the order screen, until the dish is ready. Set",
  "soglia.ritardo.nota.dopo": " to switch the alert off.",
  "soglia.recupero": "Minutes after payment before the table should be turned",
  "soglia.recupero.nota.prima":
    "A table that has paid and sits on for a while is normal — the coffee, the coats. Past this threshold it becomes a cover already banked that is holding a seat, and you see it highlighted in the dining room.",
  "soglia.recupero.nota.dopo": " to not be alerted.",
  "soglia.salva": "Save thresholds",
  "soglia.errore.ritardo": "Enter a value between 0 and 240 minutes for late orders",
  "soglia.errore.recupero":
    "Enter a value between 0 and 240 minutes for turning the table",
  "soglia.ok": "Late orders {ritardi}, table turning {recupero}.",
  "soglia.ok.ritardi_spenti": "off",
  "soglia.ok.recupero_spento": "off",
  "soglia.ok.dopo_min": "after {n} min",

  // --- Coperto e servizio -------------------------------------------------
  "sezione.coperto.titolo": "Coperto (cover charge) and service charge",
  "sezione.coperto.testo":
    "If your venue applies them, they have to be declared to the customer alongside the dish prices.",
  "coperto.importo": "Coperto per person (€)",
  "coperto.servizio": "Service charge (%)",
  "coperto.iva": "VAT on coperto and service charge (%)",
  "coperto.iva.nota":
    "It only counts on electronic invoices. As a rule it is the catering rate, but ask your accountant: the software does not decide in their place.",
  "coperto.intervallo": "Wait between one order and the next (minutes)",
  "coperto.intervallo.nota":
    "The all you can eat method: you order in waves. Without it, a table of six sends eighty dishes in three minutes, the kitchen cooks them all at once and half stay on the plate. The customer sees the time left on the button, instead of finding out by pressing it. 0 = no wait.",
  "coperto.etichetta": "What it is called on the bill",
  "coperto.etichetta.placeholder": "Coperto · Bread and coperto · Service",
  "coperto.nota":
    "The coperto is multiplied by the covers the staff entered on the table card. The service charge is worked out on what was ordered, not on the coperto. Both are shown to the customer on the menu itself: the law treats them as a price item, not as a surprise at the foot of the bill.",
  "coperto.errore.importo": "Invalid coperto (0-50 €)",
  "coperto.errore.servizio": "Invalid service charge (0-30%)",
  "coperto.errore.iva": "Invalid VAT rate on coperto and service charge (0-30%)",
  "coperto.errore.intervallo":
    "Invalid wait between orders (0-120 minutes)",
  "coperto.ok.nulla":
    "Saved. No coperto and no service charge: nothing is shown to the customer.",
  "coperto.ok": "Saved. It shows on the customer's menu and as a separate line on the bill.",

  // --- Formula a prezzo fisso ---------------------------------------------
  "sezione.formula.titolo": "Fixed-price set menu",
  "sezione.formula.testo":
    "It is paid per person and the dishes it covers are not charged per dish: it is the all you can eat model. The staff can still switch the table to à la carte.",
  "formula.attiva": "The venue offers a fixed-price set menu",
  "formula.pranzo": "Price per person, lunch (€)",
  "formula.cena": "Price per person, dinner (€)",
  "formula.ora": "From what time the dinner price applies",
  "formula.ora.nota":
    "What counts is the time the table sat down, not the time they ask for the bill: someone seated at 12:30 pays the lunch price even if they leave at 17:00.",
  "formula.bambini": "Children",
  "formula.bambini.adulti": "Pay the same as adults",
  "formula.bambini.gratis": "Do not pay",
  "formula.bambini.ridotto": "Pay a reduced rate",
  "formula.bambino.tariffa": "Child rate (€)",
  "formula.eta": "Up to what age (years)",
  "formula.eta.placeholder": "e.g. 10",
  "formula.eta.nota":
    "You need it to state it on the menu. Without a declared cut-off, two identical tables pay differently depending on who serves them.",
  "formula.supplemento": "Surcharge for food left over (€)",
  "formula.supplemento.nota.prima":
    "The waiter adds it at closing, looking at the table: no software can know how much was left on the plate. It has to be written on the menu",
  "formula.supplemento.nota.forte": "before",
  "formula.supplemento.nota.dopo":
    "anyone orders — if it only turns up on the bill it is a condition the customer never accepted. 0 = you don't apply it.",
  "formula.predefinita": "New tables start on the set menu",
  "formula.nota": "What it covers, for the customer",
  "formula.nota.placeholder":
    "The whole menu except desserts, coffee, digestifs and drinks. Ordering in waves.",
  "formula.fuori.prima":
    "The items that stay chargeable are marked one by one in the menu, with the",
  "formula.fuori.forte": "Outside the set menu",
  "formula.fuori.dopo": " tick: desserts, coffee, digestifs, drinks and the premium dishes.",
  "formula.salva": "Save set menu",
  "formula.errore.prezzi": "Invalid prices (0-500 €)",
  "formula.errore.bambino":
    "Enter the child rate, or choose another option",
  "formula.errore.eta": "Invalid children's age (0-17)",
  "formula.errore.ora": "Invalid dinner time",
  "formula.errore.senza_prezzo": "Set at least one price, lunch or dinner",
  "formula.ok.spenta": "Set menu off: tables pay à la carte prices for the dishes.",
  "formula.ok.predefinita":
    "Saved. New tables start on the set menu; the staff can switch them to à la carte.",
  "formula.ok.carta":
    "Saved. Tables start à la carte; the staff turn the set menu on when it is needed.",

  // --- Numeri di ritiro ---------------------------------------------------
  "sezione.ritiro.titolo": "Pickup numbers",
  "sezione.ritiro.testo":
    "For places that hand over at the counter and not at the table: piadina bars, pizza by the slice, delis. Every order takes a number that restarts from one each service day, and the counter screen says which one to call.",
  "ritiro.banco.titolo": "Service is at the counter",
  "ritiro.banco.nota":
    "Piadina bars, pizza by the slice, delis: people sit wherever they land, or don't sit at all. Every customer who scans the QR opens a bill of their own — at a table the bill is shared instead, and with a single QR at the counter the second person's piadina would end up on the first person's bill. The main page becomes the Counter.",
  "ritiro.numero": "Give every order a number",
  "ritiro.come": "How you tell people their order is ready",
  "ritiro.metodo.segnaposto": "Numbered table marker",
  "ritiro.metodo.segnaposto.nota":
    "The customer takes a numbered stand to the table. At the counter you see which one to call.",
  "ritiro.metodo.cercapersone": "Pager",
  "ritiro.metodo.cercapersone.nota":
    "The disc that buzzes when the order is ready. The counter tells you which one to set off.",
  "ritiro.metodo.telefono": "Phone notification",
  "ritiro.metodo.telefono.nota":
    "Whoever ordered from the QR sees their own number turn to «ready» by itself, without standing in front of the counter.",
  "ritiro.piu.nota":
    "You can pick more than one: many hand out the marker and notify on the phone as well, for customers who sat outside where nobody can see the number on the table.",
  "ritiro.errore.metodi":
    "Choose at least one way to tell people their order is ready, or nobody will know their number.",
  "ritiro.ok.spento": "Pickup numbers off: service is at the table.",
  "ritiro.ok":
    "Saved. The numbers restart from one each service day, and you see them on the Counter page.",

  // --- Email ai clienti ---------------------------------------------------
  "sezione.email.titolo": "Emails to customers",
  "sezione.email.testo":
    "Which address booking confirmations and refusals are sent from.",
  "email.collegato.prima": "Emails to your customers are sent from",
  "email.piattaforma":
    "Emails are sent from our address, with replies going to yours. There is nothing for you to do.",
  "email.non_attivo":
    "Email sending is not active yet: bookings only arrive in the back office and the customer gets no confirmation.",
  "email.cambia": "Change or remove your own sender",
  "email.usa_dominio": "Use your own domain",
  "email.serve.prima": "You need an account on",
  "email.serve.dopo":
    "and your domain verified inside it, which means adding two DNS records. It is the only technical step in the product: if you are not going to handle it, skip it and keep our sender — it works just the same.",
  "email.mittente": "Sender",
  "email.mittente.placeholder": "bookings@yourvenue.com",
  "email.chiave": "Resend API key",
  "email.chiave.nota":
    "Stored encrypted. When you save we send a test to the sender address: if it doesn't arrive, the domain is not verified.",
  "email.rimuovi": "Remove and go back to the platform sender",
  "email.salva_prova": "Save and test",
  "email.errore.vuoto": "Enter a key and a sender, or change nothing",
  "email.errore.chiave": "The Resend key starts with re_",
  "email.errore.mittente": "The sender has to be an email address",
  "email.prova.oggetto": "Send test — back office",
  "email.prova.testo":
    "If you are reading this message, your venue's sender is set up correctly. Booking confirmations will be sent from here.",
  "email.errore.resend":
    "Resend refused to send: {errore}. Check that the sender's domain is verified.",
  "email.ok.rimosso": "Removed. Emails go back to being sent from our address.",
  "email.ok.collegato":
    "Connected. We have sent a test to {indirizzo}: check that it arrived.",

  // --- Password -----------------------------------------------------------
  "sezione.password.titolo": "Password",
  "password.attuale": "Current password",
  "password.nuova": "New password (min. 8 characters)",
  "password.ripeti": "Repeat new password",
  "password.aggiornata": "Password updated.",
  "password.cambia": "Change password",
  "password.errore.corta":
    "The new password has to be at least 8 characters",
  "password.errore.diverse": "The two passwords don't match",
  "password.errore.attuale": "Current password is not correct",

  // --- Stripe -------------------------------------------------------------
  "sezione.stripe.titolo": "Payments (Stripe)",
  "stripe.stato_ignoto":
    "The connection status can't be checked right now. Payments already active keep working.",
  "stripe.attivo": "Active — customers can pay the bill from their phone.",
  "stripe.incompleto":
    "Onboarding started but not finished — details Stripe requires are missing.",
  "stripe.completa": "Finish Stripe onboarding",
  "stripe.collega.testo":
    "Connect a Stripe account to take payments at the table. You will be asked for business details and bank details on the Stripe page.",
  "stripe.connetti": "Connect Stripe",
  "stripe.errore.avvio": "Couldn't start the Stripe connection",
  "stripe.errore.rete": "No connection — try again.",
  "stripe.errore.nessun_locale": "No venue linked to this account",
  "stripe.errore.permessi": "You don't have permission for this",
  "stripe.errore.piattaforma":
    "Payments aren't set up on the platform yet. Get in touch with support.",
  "stripe.errore.locale_non_trovato": "Venue not found",

  // --- Satispay -----------------------------------------------------------
  "sezione.satispay.titolo": "Payments (Satispay)",
  "satispay.connesso": "Connected.",
  "satispay.serve.prima": "You need an activated",
  "satispay.serve.link": "Satispay Business account",
  "satispay.serve.dopo":
    "first, with a shop created and an activation code generated from their dashboard — paste it below.",
  "satispay.codice.placeholder":
    "Activation code (from the Satispay Business Dashboard)",
  "satispay.connetti": "Connect Satispay",
  "satispay.ok": "Satispay connected.",
  "satispay.errore.codice": "Activation code missing",
  "satispay.errore.attivazione": "Satispay activation failed",

  // --- Tilby --------------------------------------------------------------
  "sezione.tilby.titolo": "Till system (Tilby)",
  "tilby.intro.prima":
    "By connecting the till you can import the menu you already have, with the right prices and VAT rates, without keying it in again. You get the token by joining the",
  "tilby.intro.link": "Tilby Developer Program",
  "tilby.intro.dopo": ", which has its own approval process and costs.",
  "tilby.collegato": "Connected to the shop \"{negozio}\".",
  "tilby.collegato.breve": "Connected to \"{negozio}\".",
  "tilby.scollega": "Disconnect Tilby",
  "tilby.token.placeholder": "Your shop's Tilby token",
  "tilby.collega": "Connect Tilby",
  "tilby.errore.token": "Enter the Tilby token",
  "tilby.errore.contatto": "Couldn't reach Tilby",

  // --- Fatturazione elettronica -------------------------------------------
  "sezione.fattura.titolo":
    "Fatturazione elettronica (Italian electronic invoicing, via the SDI exchange system)",
  "fattura.serve.prima": "You need an",
  "fattura.serve.dopo":
    "(or compatible) account with its API key. Check the tax details with your accountant before switching it on — here we handle the standard sale case (TD01) to a private customer or a company.",
  "fattura.piva.placeholder": "Partita IVA (Italian VAT number, e.g. IT01234567891)",
  "fattura.cf.placeholder": "Codice Fiscale (Italian tax code)",
  "fattura.regime.ordinario": "RF01 — Ordinario (standard tax regime)",
  "fattura.regime.forfettario": "RF19 — Forfettario (flat-rate tax regime)",
  "fattura.indirizzo.placeholder": "Address (street and number)",
  "fattura.cap.placeholder": "Postcode",
  "fattura.comune.placeholder": "Town",
  "fattura.provincia.placeholder": "Prov.",
  "fattura.chiave.impostata":
    "API key already set — leave empty to keep it",
  "fattura.chiave.placeholder":
    "Invoicetronic API key (ik_live_... or ik_test_...)",
  "fattura.salva": "Save invoicing details",

  // --- Lingua -------------------------------------------------------------
  "sezione.lingua.titolo": "Language",
  "sezione.lingua.testo":
    "They are two different things: one is how you see the back office, the other is which language the page the customer looks at from the table opens in.",
  "lingua.mia": "Your own back-office language",
  "lingua.mia.nota":
    "It counts for you only, on whatever device you sign in from. The rest of the staff pick their own.",
  "lingua.mia.auto": "Let the browser decide",
  "lingua.locale": "Starting language of the public pages",
  "lingua.locale.nota":
    "It counts for every customer of the venue: it is the language the table menu and the booking page open in. The customer can always change it.",
  "lingua.salva": "Save language",
  "lingua.errore.valore": "Invalid language",
  "lingua.ok":
    "Saved. The back office is in {mia}; the public pages start in {pubblica}.",
  "lingua.ok.auto":
    "Saved. The back office follows the browser language; the public pages start in {pubblica}.",
};

export const tImpostazioni = dizionario(IT, EN);
