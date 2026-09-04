# Passaggio di consegne

Destinatario operativo: `peewwe75`. Questo documento e versionato nella
radice della repository GitHub e va letto insieme al codice sul branch `main`.

Per chi prende in mano il progetto. Descrive cosa fa il sistema, cosa è
stato verificato, e — soprattutto — **cosa manca ancora**, perché è quella
la parte che serve davvero a chi arriva dopo.

Ultimo aggiornamento: 4 settembre 2026.

---

## 0. Cosa è cambiato in quest'ultima sessione

Elencato qui perché è la parte che cambia il lavoro di chi riprende in mano
il progetto. Il resto del documento è già aggiornato di conseguenza.

### Formule di vendita nuove

- **Formula a prezzo fisso (all you can eat).** Il conto si paga a persona e
  i piatti compresi valgono zero. Due prezzi, pranzo e cena, con la fascia
  decisa dall'ora in cui il tavolo **si è seduto**, non da quando chiede il
  conto. Bambini gratis, ridotti o pieni, con l'età dichiarabile per
  scriverla sul menu. Supplemento per l'avanzato aggiunto da una persona che
  guarda il tavolo. Le voci che restano a pagamento — dolci, caffè, amari,
  bevande, premium — si spuntano una a una nel menu con **Fuori formula** e
  il cliente le vede segnate mentre ordina. Formula o carta si decide **per
  tavolo**, non per locale. Migrazioni 046, 047.
- **Attesa fra un'ordinazione e la successiva**, il metodo degli
  all-you-can-eat: applicata nell'endpoint e non solo nel bottone, col conto
  alla rovescia che arriva dal server. Legata alla formula, non al formato.
  Migrazione 045.
- **Numero di ritiro al banco**, per chi consegna al bancone e non al tavolo.
  Riparte da uno a ogni **giornata di servizio** — non a mezzanotte, o un
  locale che chiude alle due avrebbe due numeri 7 nella stessa serata.
  Assegnato dentro la transazione dell'ordine. Tre modi di avvisare, anche
  più d'uno insieme: **segnaposto numerato**, **cercapersone**, **avviso sul
  telefono** di chi ha ordinato dal QR. Nuova pagina **Banco** coi numeri
  grandi, che si aggiorna da sola e compare solo a chi l'ha accesa.
  Migrazioni 044, 049.
- **Formato «Sushi / All you can eat»**, dodicesimo modello di menu, coi
  promemoria che contano: l'abbattimento a −20 °C per 24 ore **va dichiarato
  in carta** (Reg. CE 853/2004), e su una carta sushi gli allergeni toccano
  quasi ogni riga.

### Prenotazioni

- **Promemoria automatico il giorno prima.** Gira ogni ora su Vercel Cron e
  prende le prenotazioni fra 23 e 25 ore. Si prende le righe **scrivendo**,
  non leggendo: un'esecuzione interrotta non rimanda tutto una seconda volta.
  Richiede `CRON_SECRET` (già impostata in produzione sul progetto guest).
- **Disdetta dal cliente**, con un link segreto nell'email che apre quella
  prenotazione e nient'altro. **Chiede conferma invece di agire
  all'apertura**: un link che disdice da solo verrebbe attivato dalle
  anteprime di WhatsApp e dagli antivirus delle caselle aziendali. Disdire
  libera davvero il tavolo e avvisa subito il locale. La disdetta del cliente
  è registrata **separatamente** dal rifiuto del locale. Migrazione 048.
- **La mail di richiesta ricevuta parte anche con l'approvazione manuale.**
  Prima chi finiva in un locale che approva a mano non riceveva niente,
  anche per ore.

### Recensioni

- **Chieste al tavolo**, appena finito di mangiare. Il voto resta al locale,
  in una pagina che mette in cima i voti bassi non ancora letti. Il **link
  pubblico è proposto solo a chi dà cinque stelle**; sotto le cinque si
  chiede cosa non è andato. *Scelta del committente, presa sapendo il
  rischio: le regole di Google non permettono di indirizzare alla loro
  piattaforma i soli clienti soddisfatti, e le recensioni raccolte così
  possono essere rimosse.* Sta scritto anche nel codice, in
  `apps/guest/src/app/api/recensioni/route.ts`, perché non venga «sistemato»
  da chi lo prende per una svista. Migrazione 043.

### Piattaforma e assistenza

- **Pannello super amministratore** con CRM: scheda cliente (referente, come
  è arrivato, quando risentirlo, perché ha lasciato) e note non modificabili
  né cancellabili. Scadenze piani, moduli, creazione del titolare.
  Migrazioni 039, 040.
- **Assistenza dentro il gestionale.** Il locale scrive da lì e ritrova la
  risposta lì. Una richiesta ripetuta sullo stesso oggetto **si accoda** a
  quella aperta e ne alza l'urgenza, invece di rispondere in verde senza
  scrivere niente. Migrazione 041.

### Difetti chiusi, e vale la pena leggerli

Erano tutti *silenziosi*: nessun errore, un numero plausibile e sbagliato.

- **Doppio addebito su Stripe.** Un `catch` nudo attorno a una lettura
  Stripe prendeva anche i timeout: archiviava il pagamento come fallito
  mentre l'intent restava confermabile, il saldo tornava pieno e nasceva un
  secondo intent sull'intero conto. Il ciclo di scadenza aveva la stessa
  forma al contrario. Ora si annulla **prima** e si archivia dopo.
- **Doppio incasso su Satispay.** Al webhook mancava la guardia
  `status = 'pending'`. E l'endpoint carta scadeva anche le righe Satispay,
  che non sa annullare.
- **Incasso al banco con una carta in corso.** Il totale pagato contava solo
  i pagamenti riusciti, quindi uno in volo valeva zero: si registrava tutto
  in contanti e la carta andava a buon fine pochi secondi dopo. Ora è
  rifiutato, e un tavolo che ha pagato in più lo dice.
- **Abbonamento concesso a mano che non scadeva mai**: la data si leggeva
  solo per le prove.
- **Il campo «Giorni» del pannello riscriveva la scadenza vera**: partiva
  sempre da 30, e cambiare solo lo stato azzerava un anno pagato per
  bonifico. Vuoto significa «non toccarla».
- **Price Stripe senza metadata `moduli`**: l'abbonamento risultava «Attivo»
  con zero moduli. Il locale paga e non ha niente. Ora i moduli restano
  quelli che erano e l'anomalia va nei log — **ma il metadata va messo su
  ogni Price**.
- **Fattura elettronica senza coperto e servizio**: dichiarava meno di
  quanto incassato. Ora sono righe di fattura, con l'aliquota impostabile dal
  locale (migrazione 042) perché la decide il commercialista.
- **QR che puntavano a `localhost`** quando mancava `GUEST_APP_URL`: quella
  pagina produce il file per la tipografia.
- **La board di cucina taceva.** Tre gesti su quattro senza `catch`, e il
  polling che falliva in silenzio lasciando l'ultimo dato buono: un monitor
  che ha smesso di parlare col server risponde «non manca niente».
- **Import Tilby che sovrascriveva al buio**: IVA assente → 10% sopra il 22%
  messo a mano, e descrizione vuota in cassa che cancellava quella scritta
  nel gestionale.
- **`requireModulo` scritta e mai chiamata**: chi paga solo le prenotazioni
  usava tutto. Ora il modulo si chiede insieme al ruolo su menu, tavoli e QR
  — non sulle azioni che chiudono lavoro già cominciato.
- **Rate limit contati per solo indirizzo**: prenotare cinque volte bruciava
  il diritto di prenotare *ovunque*, e cinque colleghi dietro lo stesso wifi
  si bloccavano a vicenda. Ora contano per locale, o per tavolo.
- **Analisi falsate dai tavoli mai usati**: un QR inquadrato per curiosità
  si chiudeva da solo dopo sei ore ed entrava come servizio a incasso zero.

### Test

**46 test end-to-end contro la produzione**, e ora dicono la verità: prima
ogni file condivideva un locale e i test si passavano tavoli aperti, quindi
fallivano in fila e passavano da soli. Adesso **un locale per test**. Coperti:
formula, intervallo fra ordini, disdetta, promemoria, permessi di ruolo e
reparto, rifiuto dell'incasso con carta in volo, giro completo
dell'assistenza.

---

## 1. Cos'è

Sistema white-label per ristoranti e bar italiani, venduto a canone. Due
moduli acquistabili separatamente:

- **Ordini e pagamenti al tavolo** — il cliente inquadra il QR, vede il
  menu, ordina, paga e può chiedere la fattura elettronica.
- **Prenotazioni online** — pagina pubblica che il locale mette sul proprio
  sito, con controllo capienza e conferma via email.

Il locale può comprarne uno solo. Un ristorante che ha già la sua cassa
prende gli ordini; uno che riempie a telefono prende le prenotazioni.

### Due applicazioni

| | Cosa | Chi la usa |
|---|---|---|
| `apps/guest` | Pagine cliente: menu, ordine, conto, prenotazione | Il cliente del locale, senza account |
| `apps/dashboard` | Gestionale e pagina commerciale | Lo staff del locale, con account |

Indirizzi di produzione:

```
https://ristoranti-guest.vercel.app        pagine cliente
https://ristoranti-dashboard.vercel.app    gestionale e landing
```

---

## 2. Accessi

⚠️ **Nessuna password va scritta qui: questo repo è pubblico.** Vanno
passate a voce o via canale privato. Una password committata per errore va
considerata bruciata e ruotata: resta nella storia git anche dopo la
rimozione, ed è già successo una volta in questo progetto.

Non esiste recupero password via email (manca il provider). Per sbloccare
un utente si aggiorna `users.password_hash` con un hash bcrypt.

L'account amministratore e il locale dimostrativo *Trattoria da Luca* sono
già configurati in produzione: chiedi le credenziali a chi ti passa il
progetto.

Esiste anche un **super amministratore di piattaforma**, separato dai
gestionali dei locali: entra dalla stessa maschera di accesso e viene
portato su `/admin`, dove vede tutti i clienti, i moduli, le scadenze e le
richieste di assistenza. Al primo accesso **la password va cambiata per
forza**: quella iniziale è stata comunicata a voce, quindi da quel momento
non è più un segreto. Anche queste credenziali si chiedono a voce.

### Variabili d'ambiente da non dimenticare

Impostate su Vercel, non nei file. Quelle che, mancando, non danno errore
ma spengono qualcosa in silenzio:

| Variabile | Progetto | Se manca |
|---|---|---|
| `CRON_SECRET` | guest | Il promemoria del giorno prima non parte. **Impostata il 4 settembre 2026.** L'endpoint rifiuta e lo scrive nei log. |
| `NEXT_PUBLIC_APP_URL` | guest | I link di disdetta nelle email puntano altrove. Impostata. |
| `GUEST_APP_URL` | dashboard | I QR per la tipografia punterebbero a `localhost`. Da settembre 2026 la pagina si rifiuta di generarli e lo dice. |
| `RESEND_API_KEY`, `RESEND_FROM` | entrambi | Nessuna email parte. **Ancora da impostare.** |
| `INVOICETRONIC_WEBHOOK_SECRET` | guest | Le fatture restano su «Inviata a SDI» per sempre. La lista ora segnala quelle ferme da oltre due giorni. |
| `ENCRYPTION_KEY` | entrambi | I rate limit diventano globali invece che per chiamante, e lo scrive nei log. |

---

## 3. Come è fatto

Monorepo pnpm, Next.js 16 (App Router, Server Actions), Postgres su Neon,
Auth.js v5 con JWT.

Scelte che conviene conoscere prima di toccare il codice:

- **Nessun SDK proprietario per il database.** Si usa `postgres.js` su SQL
  puro, così Neon si sostituisce con qualunque altro Postgres senza
  riscrivere le query. `prepare: false` perché il pooler è in modalità
  transazione.
- **Autorizzazione a livello applicativo, non RLS.** Ogni Server Action è
  un endpoint POST pubblico per chi ne conosce l'id: il controllo sta
  dentro l'azione (`requireVenue`, `requireRole` in
  `apps/dashboard/src/lib/authz.ts`), mai solo nell'interfaccia.
- **`packages/shared` ha export separati per sottopercorso.** `./db` non è
  mai riesportato dall'indice: trascinerebbe moduli Node nel bundle del
  browser e il build fallirebbe su `tls`.
- **I prezzi si calcolano sempre sul server.** Il browser manda gli id
  delle opzioni scelte, mai gli importi. Un prezzo che arriva dal browser è
  un prezzo che chiunque può riscrivere.
- **Le migrazioni sono versionate** in `db/migrations/`, applicate da
  `node db/migrate.mjs` (idempotente). `db/schema.sql` è la fotografia per
  un'installazione nuova e va tenuto allineato a mano.
- **I segreti dei fornitori sono cifrati a riposo** con AES-256-GCM
  (`packages/shared/crypto.ts`), formato `v1:iv:tag:ciphertext`.

---

## 4. Cosa fa, verificato

Tutto quanto segue esiste, è in produzione e passa i test.

**Menu.** Categorie e piatti con foto, descrizione, ingredienti, allergeni,
diciture dietetiche, abbinamento suggerito, IVA per voce. Riordino,
rinomina, disattivazione. Il prezzo si modifica direttamente dalla riga;
`Duplica` copia scheda, foto, traduzioni e varianti e crea una voce pronta da
ritoccare. L'inserimento rapido distingue chiaramente nome, prezzo e categoria.
Import da CSV/TSV e dal listino Tilby.

**Modelli per formato di locale.** Undici formati — ristorante, pizzeria,
pizza al trancio, piadineria, steak house, paninoteca, hamburgeria, bar,
gintoneria, birreria, tisaneria — ognuno con le proprie categorie e i
propri gruppi di scelte. Applicarne uno aggiunge solo ciò che manca: le
categorie esistenti restano e un gruppo con lo stesso nome non viene
sovrascritto, così cambiare idea sul formato non costa il lavoro fatto.

Ogni formato porta i propri **promemoria**: le cose per cui quel tipo di
locale prende una sanzione o perde un cliente. L'impasto senza glutine
vuole forno separato; l'origine del bovino è obbligatoria; la cottura al
sangue su carne trita va sconsigliata per iscritto. È la parte che nessun
concorrente ha.

**Bevande.** Produttore, annata, denominazione, zona, gradazione, nota di
servizio. Avviso quando un vino non dichiara i solfiti.

**Schede vino da foto.** Si fotografa l'etichetta o la scheda tecnica e la
scheda si compila da sé, usando la chiave OpenRouter del locale — le
chiamate sono addebitate a lui. Quello che torna è una **proposta**, mai un
salvataggio: viene scritta nei campi del modulo, dove una persona la
rilegge e la corregge. Il modello riceve istruzione di omettere ciò che non
riesce a leggere invece di dedurlo, e ogni numero viene ricontrollato lato
nostro — un'annata 3024 o una gradazione al 130% sono errori del modello
che altrimenti finirebbero in carta.

**Assistente sulle pagine pubbliche.** Risponde ai clienti con i soli dati
del locale — menu, orari, indirizzo, informazioni pratiche. Nel menu non
mostra collegamenti alla prenotazione; chi chiede di prenotare viene indirizzato
alla pagina principale del locale. Sugli allergeni non decide mai: riporta ciò che è
dichiarato e rimanda al personale, perché un modello che dice "no, non
contiene glutine" può mandare qualcuno in ospedale. **Spento di default**:
ogni domanda è una chiamata addebitata al locale, e va acceso da chi la
paga. Accenderlo senza aver indicato gli orari viene rifiutato.

**Obblighi di legge sul menu.** Allergeni per piatto; stato di
conservazione (fresco/congelato/surgelato/abbattuto) con asterisco e nota
costruita su ciò che c'è davvero in carta; origine per la carne bovina;
coperto e servizio mostrati **sul menu** e non solo in fondo al conto.

**Orari e informazioni pratiche.** Testo libero, non una griglia di fasce:
gli orari veri sono pieni di eccezioni che una struttura rigida
costringerebbe a dichiarare male. Compaiono sulle pagine pubbliche anche
senza assistente.

**Multilingua.** Italiano come base, altre lingue come sovrascritture
parziali con ricaduta sull'italiano campo per campo. La lingua si sceglie
da un click, poi dal browser, poi italiano — solo fra quelle davvero
tradotte. Il gestionale conta quante traduzioni mancano per lingua.

**Sala.** Card per tavolo con orario di apertura, permanenza, coperti,
comande con stato, ordinato/pagato/da incassare. Si apre il dettaglio
raggruppato per dove sta il cibo: in cucina, fermo al passe, già in tavola.

**Cucina.** Board raggruppata per tavolo con tempi di attesa e azioni di
gruppo. Comando vocale ("tavolo 3 pronto"), spento di default e con avviso
esplicito che l'audio va al servizio di trascrizione del browser.
La pagina di stampa ha un ritorno esplicito agli ordini, riepilogo di comande,
pezzi e reparti e genera un foglio separato per ordine e reparto. Ogni foglio
riporta tavolo, identificativo, orario, stato, varianti, note e totale pezzi.

**Pagamenti.** Carta, Apple Pay, Google Pay via Stripe Connect; Satispay;
contanti registrati dallo staff. Conto alla romana per piatto. Mance
percentuali configurabili.

**Fatturazione elettronica.** Dopo il pagamento il cliente inserisce i dati
dal tavolo. Sono gestiti privato italiano, azienda italiana con codice
destinatario o PEC e cliente estero; la fattura parte allo SDI tramite
intermediario accreditato. L'admin vede stato, identificativi, destinatario,
sede e può scaricare l'XML. Se Resend è attivo, il cliente riceve anche una
copia via email con XML allegato quando subito disponibile.

**Varianti, aggiunte e rimozioni.** Gruppi di scelte con minimo, massimo e
supplemento per opzione, anche negativo. Coprono formati (sushi 6/12/24,
calice/bottiglia/magnum), scelte obbligatorie (cottura) e aggiunte
multiple. Le **rimozioni** sono un tipo a sé perché si leggono al
contrario: "Cipolla" stampato in comanda direbbe al cuoco di aggiungerla,
quindi l'etichetta si risolve una volta sola sul server e la cucina legge
sempre "Senza cipolla".

Il carrello è indicizzato per piatto **più** opzioni ordinate: due sushi da
6 e uno da 12 non collassano in una riga sola col prezzo sbagliato.
L'endpoint ordini deduplica gli id soltanto per la verifica di esistenza:
più righe dello stesso piatto con varianti diverse vengono accettate e
restano separate in comanda.

Il prezzo si calcola **sempre sul server** dagli id delle opzioni. Il
browser manda cosa ha scelto, mai quanto costa. Gli id che non
appartengono a quel piatto vengono rifiutati, non ignorati.

**Prenotazioni.** Pagina pubblica indicizzabile con dati strutturati
`ReserveAction`. Capienza controllata su fascia sovrapposta, non sull'ora
esatta: contare solo gli orari identici lascerebbe entrare venti coperti
alle 20:00, venti alle 20:15 e venti alle 20:30 in una sala da trenta.
Quando non c'è posto il cliente riceve gli orari vicini in cui c'è davvero.
Conferma e rifiuto con email; gli errori di invio restano scritti accanto
alla prenotazione e visibili in gestionale.

Ogni richiesta occupa subito uno o piu tavoli nel calendario. Il sistema
sceglie il tavolo piu piccolo sufficiente oppure la combinazione con meno
tavoli e meno posti sprecati, escludendo quelli gia impegnati nella fascia
di 105 minuti. L'assegnazione e visibile nella card admin; annullamento,
rifiuto e no-show liberano automaticamente la disponibilita perche non
rientrano negli stati occupanti. La relazione multipla vive in
`reservation_tables`; `reservations.table_id` conserva il tavolo principale.

**Il calendario è la fonte di verità, l'email è solo la notifica.** Una
prenotazione entra in calendario anche se l'email non parte o non è
configurata: il gestionale segnala "questa richiesta non ti è arrivata per
email" invece di perderla. Anche con l'assistente spento la pagina di
prenotazione funziona: sono due cose indipendenti.

Gli orari senza fuso — quelli che produce un campo `datetime-local` —
vengono letti nel fuso del locale, non del server. Interpretarli come UTC
spostava ogni prenotazione estiva di due ore, ed è un errore che è già
costato una correzione.

**Analisi.** Spesa per coperto e per tavolo, piatti per persona,
permanenza media, rotazione, cosa vende, come pagano, fasce orarie. Il
grafico orario si rifiuta di comparire sotto venti tavoli chiusi e dice
quanti ne mancano, invece di disegnare due barre che sembrano un dato.

**Amministrazione.** Ruoli separati (titolare, responsabile, sala, cucina).
Marchio, colori e dati del locale su tutte le pagine cliente. Annuncio
promozionale con validità a scadenza. QR stampabile in A6 a 300 dpi con
logo e colori.

**Conformità.** Informativa privacy per locale compilata con i dati reali
del titolare; informativa cookie; accordo art. 28 versionato e accettato
alla registrazione; IP pseudonimizzati con HMAC e conservati due ore.
Dettaglio in [`docs/GDPR.md`](docs/GDPR.md).

### Test

```bash
pnpm test:e2e
```

I test end-to-end girano **contro la produzione**: creano un locale
isolato, ordinano, pagano, chiudono e si ripuliscono. Vanno eseguiti con
`DATABASE_URL` nell'ambiente.

### Percorsi cliente

- `/m/[slug]`: carta pubblica indicizzabile, filtro reale per categoria, foto,
  popup dei piatti e informazioni del locale. Nessun ordine, pagamento o
  prenotazione.
- `/p/[slug]`: pagina pubblica per prenotare il tavolo, separata dal menu e
  collegata al menu del locale.
- `/dashboard/reservations`: gestione admin delle richieste con calendario,
  conferma o rifiuto, coperti, arrivo e no-show.
- `/v/[slug]/t/[token]`: applicazione privata aperta dal QR del tavolo. Mostra
  in modo permanente il codice tavolo; qui il cliente ordina, vede il conto e
  usa `Paga ora`. Dopo il saldo compaiono ricevuta di pagamento e richiesta
  fattura elettronica.
- `/api/receipts/[sessionId]`: ricevuta di cortesia stampabile o salvabile
  in PDF; non è uno scontrino fiscale.

---

## 5. Cosa manca

La parte importante di questo documento.

### 5.1 Bloccato da terzi

| Cosa | Chi lo sblocca |
|---|---|
| **Sandbox Stripe da rivendicare.** Finché non lo è, Connect non funziona e nessun pagamento reale è possibile: verificato il 3 settembre 2026, gli account collegati sono **zero**. Prodotti, prezzi e webhook invece **sono già a posto** (vedi 6.1). | Titolare dell'account Stripe |
| **Chiave Resend** (`RESEND_API_KEY`, `RESEND_FROM`). Senza, **nessuna email parte**, e adesso pesa di più di prima: oltre a conferme, rifiuti e fatture restano a terra anche la **richiesta ricevuta**, il **promemoria del giorno prima** e l'**avviso di disdetta al locale**. Il promemoria è l'unico che fallisce in silenzio dal punto di vista del cliente — l'errore finisce sulla riga della prenotazione, non a schermo. Serve creare l'account, **verificare il dominio** con i record DKIM/SPF — senza, Gmail manda le conferme in spam — e generare la chiave. Il codice è già collegato. | Chi vende |
| **Metadata `moduli` su ogni Price Stripe** (`ordini`, `prenotazioni`, o entrambi separati da virgola). Senza, il locale risulta «Attivo» e non ha nessun modulo: paga e al primo QR inquadrato legge che l'ordine al tavolo non è disponibile. Da settembre 2026 i moduli **non vengono più azzerati** in quel caso e l'anomalia va nei log, ma il metadata va messo lo stesso. | Chi vende |
| **Foto autentiche del locale.** La demo ha ora immagini fotografiche locali coerenti; per la produzione servono gli scatti reali dei piatti e delle bevande. | Il locale |
| **Account intermediario SDI** per la fatturazione | Il locale |
| **Developer Program Tilby** per il collegamento cassa | Chi vende |

### 5.2 Funzioni che i concorrenti hanno e noi no

In ordine di quanto bloccano una vendita in Italia:

1. **Buoni pasto** (Pellegrini, Edenred, Ticket). Blocca il pranzo, che in
   Italia è un mercato enorme. Ce l'hanno Nexi e Qromo.
2. **Scontrino fiscale e corrispettivi telematici.** Il locale deve
   continuare a battere sulla propria cassa: doppia battuta. È la prima
   obiezione che farà un ristoratore, e va detta in fase di vendita invece
   di scoprirla dopo. Non esiste un collegamento universale: va integrato
   un produttore o middleware fiscale certificato alla volta.
3. **Comanda presa dal cameriere.** Oggi ordina solo il cliente. Non tutti
   scansionano il QR.
4. **Asporto e delivery.** Richiesta frequentissima.
5. **Caparra anti no-show** sulle prenotazioni. La colonna esiste in
   `reservations`, la logica no. Da settembre 2026 il no-show è però
   attaccato da due lati che prima mancavano: il **promemoria il giorno
   prima** e il **link per disdire** senza telefonare. Restano il pezzo di
   TheFork che non abbiamo.
6. **Stampa comande su termica ESC/POS.** La cucina vuole la carta.
7. **Fidelity e gift card.** Fidelizzazione.
8. **Multi-locale.** Chiude i gruppi e le catene.

### 5.3 Debiti tecnici e di conformità

- **Nessun monitoraggio degli errori in produzione.** Una violazione
  andrebbe scoperta a mano, e l'accordo art. 28 promette notifica entro 48
  ore: quella promessa oggi è fragile.
- **Nessuna esportazione dei dati** per le richieste degli interessati.
- **La conservazione dichiarata per le prenotazioni (24 mesi) non è
  applicata** da nessun job.
- **Nessuna procedura scritta di risposta alle violazioni.**
- **Il collegamento Tilby legge soltanto** il listino. Non invia comande,
  non invia incassi, non emette documenti fiscali.
- **Vendita a peso non supportata.** Fiorentina al chilo, pizza al trancio a
  peso, pesce al chilo: si possono caricare solo prezzi fissi per formato.
  Il modello del formato lo dice al ristoratore invece di lasciarglielo
  scoprire.
- **Menu combinati assenti.** Panino più patatine più bibita a prezzo fisso
  va caricato come voce a sé.
- **`db/seed.sql` è solo per lo sviluppo.** Non applicarlo in produzione.
- **Il repo GitHub è pubblico** (`Marco26-hub/prenotazioni_ristoranti_bar`),
  e resta tale finché il lavoro è in corso. Il 3 settembre 2026 è stato reso
  privato per una prova e riportato pubblico subito dopo: la prova ha
  confermato che Vercel continua a costruire da un repo privato, quindi il
  passaggio si può fare quando serve, senza sorprese sul deploy. Al momento
  della prova non c'erano né fork né stelle.
  **Finché è pubblico vale la regola di sempre: nessuna password, nessuna
  chiave, nessun segreto nei file committati.** Un segreto finito qui per
  sbaglio va considerato bruciato e ruotato, non solo rimosso.
- **Suite E2E: 46 test contro la produzione**, con un locale per test. Coprono
  ordine e pagamento, permessi di ruolo e di reparto, trattenute, chiamate dal
  tavolo, formula a prezzo fisso, intervallo fra le ordinazioni, rifiuto
  dell'incasso con carta in volo, disdetta, promemoria, assistenza andata e
  ritorno. **Non** coprono: numeri di ritiro al banco, recensioni, pannello di
  piattaforma oltre le guardie di accesso.
- **La suite ha bisogno di rete stabile verso Neon.** Su una linea che perde
  colpi i fallimenti si presentano come difetti dell'applicazione
  (`getaddrinfo ENOTFOUND`, o un'asserzione che scade): prima di indagare un
  rosso, rilanciare il test da solo.
- **Le soglie di ritardo e recupero tavolo non generano storico.** Si vede
  che un tavolo è in ritardo adesso, non quante volte lo è stato: non c'è
  ancora un dato su cui ragionare a fine mese.
- **Il numero di ritiro non ha un display pubblico.** La pagina Banco è dentro
  il gestionale e vuole un accesso: per metterla su uno schermo rivolto ai
  clienti serve una pagina pubblica in sola lettura, che oggi non c'è.
- **Le recensioni non si possono rispondere né esportare**, e il link
  pubblico è proposto ai soli cinque stelle per scelta del committente (vedi
  sezione 0): è una posizione da rivedere se Google dovesse contestarla.
- **`pickup_metodi` non ha effetto sul cercapersone.** Il software dice quale
  numero far vibrare; non parla con l'hardware dei cercapersone, e non
  esiste uno standard per farlo.
- **La formula a prezzo fisso è scritta due volte**: una nel conto del
  cliente (`apps/guest/src/lib/balance.ts`), una dentro la transazione che
  chiude il tavolo (`close-table-actions.ts`). Devono restare allineate: se
  la seconda calcola meno, il tavolo non si chiude mai; se calcola di più, si
  incassa più di quanto mostrato. Tre test E2E le tengono insieme, ma chi
  tocca una deve toccare l'altra.

---

## 6. Listino

| | Mensile | Annuale | Attivazione |
|---|---|---|---|
| Ordini e pagamenti | 109 € | 1.090 € | 649 € |
| Solo prenotazioni | 89 € | 890 € | 449 € |
| Tutto | 139 € | 1.390 € | 649 € |

L'attivazione è una tantum e dovuta su ogni piano, anche l'annuale: il
lavoro di avviamento è lo stesso comunque si paghi il canone, e regalarlo
insegnerebbe che è trattabile. Costa meno per le sole prenotazioni perché è
meno lavoro: capienza, orari e pagina pubblica, senza menu da caricare, QR
da stampare e Stripe da collegare.

Prova di 14 giorni, tutti i moduli aperti. Prezzi IVA esclusa.

### Come si posiziona, onestamente

**Non siamo più economici sul costo totale, e non va detto.** La percentuale
che prendono i concorrenti — Qromo 1,2%, MyCIA 1,9% — è la loro tariffa di
incasso, non un ricarico sopra Stripe: incassano loro e girano il resto. Su
30.000 € al mese Qromo costa 99 € di canone più 360 € di commissioni = 459 €;
noi costiamo 139 € più quello che il locale paga al proprio fornitore, che
con Stripe standard è di più.

Una versione precedente di questo documento e della landing sosteneva il
contrario, sommando la loro percentuale a quella di Stripe. Era sbagliato.

Quello che vendiamo davvero:

- **Non tratteniamo nulla sull'incassato.** Il denaro non passa da noi.
- **Il fornitore di pagamento è del locale.** Può negoziare la tariffa,
  cambiarlo, o tenere il POS che ha già: nessun vincolo.
- **White-label vero**, che sul mercato italiano quasi nessuno offre.
- **Moduli separati**: si compra solo il pezzo che serve.
- **Fattura elettronica dal tavolo**, che i concorrenti non hanno.

Con volumi bassi la percentuale altrui può convenire. Dirlo in fase di
vendita costa un cliente ogni tanto; non dirlo costa la fiducia di tutti al
primo estratto conto.

I moduli non stanno nel codice: arrivano dai metadata del Price su Stripe,
letti dal webhook. Cambiare listino non richiede un deploy.

### 6.1 Stripe: cosa c'è già

Account **ristorazione**, separato dagli altri, in ambiente test. Verificato
e ripulito il 3 settembre 2026: **4 prodotti, 8 prezzi, nessun doppione**.
Erano rimasti 23 prezzi attivi dei giri precedenti (29, 39, 49, 59, 79,
119 €) e un prodotto duplicato: archiviati, dopo aver controllato che
nessun abbonamento vi fosse agganciato. L'archiviazione è reversibile.

I due webhook sono registrati e attivi, correttamente separati: incassi dei
locali su `guest`, abbonamenti su `dashboard`. Sono **due segreti diversi**
e scambiarli è un errore silenzioso — le firme non verificano e gli eventi
vengono scartati senza dirlo.

Questo è il valore di `STRIPE_PRICES` da mettere fra le variabili d'ambiente,
generato dai dati reali dell'account:

```
{"ordini-mensile":"price_1UBKQgGlajKIILdUKWYC9O8B","ordini-annuale":"price_1UBKQhGlajKIILdU9K2HuvM7","prenotazioni-mensile":"price_1UBLC4GlajKIILdUrycQZjo4","prenotazioni-annuale":"price_1UBLC4GlajKIILdUxIllwjEd","completo-mensile":"price_1UBKQjGlajKIILdUjkKrWC8P","completo-annuale":"price_1UBKQjGlajKIILdUkuZSfQus","setup":"price_1UBKP1GlajKIILdUNJl7eGQ5","setup-prenotazioni":"price_1UBLBsGlajKIILdUlDxDXtn0"}
```

I moduli che un piano concede stanno nei **metadata del prezzo** (`moduli`),
letti dal webhook degli abbonamenti: cambiando il listino su Stripe non
serve toccare il codice, ma un prezzo senza metadata non concede niente.

---

## 7. Attivare un locale nuovo

1. Registrazione da `/registrati` — crea locale, tavoli e categorie, e fa
   accettare l'accordo art. 28.
2. **Impostazioni**: dati fiscali completi (senza, l'informativa privacy
   mostrata ai clienti è incompleta e il gestionale lo segnala), logo,
   colori, coperto e servizio se applicati.
3. **Menu**: parti dal modello del tuo formato in fondo alla pagina Menu —
   crea categorie e scelte tipiche e ti elenca gli obblighi di quel
   formato. Poi import da file o inserimento. Allergeni su ogni piatto:
   sono obbligatori. Conservazione diversa da "fresco" dove serve.
4. **Stripe**: *Impostazioni → Connetti Stripe*. Serve documentazione
   dell'attività e IBAN; la verifica non è immediata.
5. **QR**: da *QR e tavoli*, una locandina A6 per tavolo, pronta per la
   tipografia.
6. **Prenotazioni**, se acquistate: indirizzo che riceve le richieste e
   capienza. Senza capienza la conferma automatica resta disattivabile,
   di proposito.
7. **Orari**, sempre: compaiono sulle pagine pubbliche e sono la prima cosa
   che le persone cercano.
8. **Formula a prezzo fisso**, se il locale lavora ad all you can eat:
   *Impostazioni → Formula a prezzo fisso*. Prezzo di pranzo e di cena, da
   che ora vale la cena, tariffa bambini, supplemento per l'avanzato. Poi
   spunta **Fuori formula** sulle voci che restano a pagamento — dolci,
   caffè, amari, bevande, premium — o finiranno comprese. Con la formula
   accesa compare anche l'**attesa fra le ordinazioni**: senza, un tavolo da
   sei manda ottanta piatti in tre minuti.
9. **Numeri di ritiro**, se consegna al bancone e non al tavolo:
   *Impostazioni → Numeri di ritiro*. Accendili e scegli come avvisi —
   segnaposto, cercapersone, telefono, anche più d'uno. Compare la pagina
   **Banco** per lo schermo dietro al bancone. Accenderli senza scegliere un
   modo viene rifiutato: il cliente avrebbe un numero che nessuno chiama.
10. **Link recensioni**: *Impostazioni → Marchio*, il campo del profilo
    pubblico. Viene proposto a fine pasto a chi lascia cinque stelle.
11. Facoltativi e a consumo, su chiave OpenRouter del locale: **schede vino
    da foto** e **assistente**. Entrambi spenti finché non li accende lui.

---

## 8. Documenti

- [`docs/GDPR.md`](docs/GDPR.md) — registro dei trattamenti, misure di
  sicurezza, cosa manca alla conformità
- [`docs/CHECKLIST-LANCIO.md`](docs/CHECKLIST-LANCIO.md) — cosa fare prima
  di far provare il sistema a un ristoratore
- [`docs/Presentazione-ristoratori.pdf`](docs/Presentazione-ristoratori.pdf)
  — spiegazione per chi acquista

---

## 9. Se il locale ha già il suo POS

È il caso più comune in Italia, e il sistema **funziona lo stesso**: il
locale tiene la propria cassa e il proprio acquirer, noi aggiungiamo menu,
ordine al tavolo e conto.

Il conto si chiude segnando l'incasso avvenuto sul terminale del locale, e
il tavolo si libera. Quello che il locale continua a fare da sé è battere
lo scontrino fiscale: è la **doppia battuta**, ed è la prima obiezione che
farà. Va detta in fase di vendita, non scoperta dopo.

Stripe Connect resta necessario solo per il pagamento *dal telefono del
cliente*. Un locale che non lo vuole compra comunque menu, ordine e
prenotazioni.

---

## 4 settembre 2026 — formula a prezzo fisso, banco, prenotazioni complete

### Il conto si calcola in un posto solo

`packages/shared/conto.ts` → `contoSessione(sql, sessionId)`. Prende il gestore
SQL invece di aprirselo, così la transazione che chiude il tavolo lo chiama e
legge gli stessi dati che sta per scrivere.

**Perché è nato**: l'aritmetica viveva in quattro punti — conto sul telefono,
chiusura in cassa, residuo in sala, righe della fattura. Finché il conto era
"somma dei piatti" le quattro copie davano lo stesso numero per caso. Con la
formula hanno smesso: la sala diceva 168 € e la cassa ne registrava 64; il
servizio si calcolava su basi diverse a seconda di come si pagava; la fattura
dichiarava allo SDI un imponibile che il cliente non aveva mai pagato.

**Se tocchi il conto, tocca solo quel file.** Chi lo chiama:
`apps/guest/src/lib/balance.ts` (che ora delega), `close-table-actions.ts`,
`dashboard/page.tsx`, `api/invoices/route.ts`.

Regole che ci stanno dentro e che non sono ovvie:
- il servizio si calcola su **formula + fuori formula**, non sull'ordinato
  pieno: a formula sarebbe una percentuale su piatti che nessuno paga
- coperto e servizio solo **se il tavolo ha ordinato**: un QR inquadrato per
  curiosità apre una sessione e non deve risultare a debito
- la formula vale solo se **la fascia in corso ha un prezzo**: senza, si torna
  alla carta invece di incassare zero

### Formula a prezzo fisso (all you can eat)

Prezzo a persona, fasce pranzo/cena decise dall'**ora in cui il tavolo si è
seduto** (non da quando chiede il conto). Formula o carta **per tavolo**, non
per locale. Bambini gratis / ridotti / pieni, con la soglia d'età dichiarabile
al cliente. Supplemento avanzo aggiunto da una persona alla chiusura.
`menu_items.fuori_formula` marca dolci, caffè, amari, bevande e premium.

### Numeri di ritiro al banco

Numero per ordine, riparte da uno a ogni **giornata di servizio** (stacco a
-5 ore: un locale che chiude alle due avrebbe altrimenti due numeri 7 nella
stessa serata). Tre metodi cumulabili: segnaposto, cercapersone, telefono.
Pagina `/dashboard/banco`, visibile solo a chi li ha accesi.

### Prenotazioni: giro completo

- mail al cliente **anche con approvazione manuale** (prima non riceveva nulla)
- promemoria il giorno prima, cron orario su `vercel.json`, `CRON_SECRET`
  già impostato in produzione — prende **50 righe per giro** perché la funzione
  ha 60 secondi
- link di disdetta in tutte le mail; chiede conferma invece di agire
  all'apertura (le anteprime dei messaggi aprono i link)
- disdetta del cliente registrata **separatamente** dal rifiuto del locale

### Recensioni dal tavolo

Voto e commento restano al locale. Link pubblico proposto **a chi dà cinque
stelle**; sotto si chiede cosa non è andato. Scelta del committente, presa
sapendo che Google può rimuovere le recensioni raccolte così — sta scritto in
`api/recensioni/route.ts` perché non venga "sistemato" per svista.

### Cosa manca

- **Resend**: nessuna email parte finché non ci sono `RESEND_API_KEY` e
  `RESEND_FROM` su entrambi i progetti Vercel. Serve un dominio verificato.
- **Stripe live**: chiavi di produzione e i due webhook con i due signing
  secret distinti. Ogni Price deve avere il metadata `moduli`.
- I test E2E girano contro la produzione: `pnpm test:e2e` con
  `E2E_DASHBOARD_URL` / `E2E_GUEST_URL`. Un locale per test, sempre.
