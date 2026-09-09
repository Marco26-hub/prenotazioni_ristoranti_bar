# Passaggio di consegne

Destinatario operativo: `peewwe75`. Questo documento e versionato nella
radice della repository GitHub e va letto insieme al codice sul branch `main`.

Per chi prende in mano il progetto. Descrive cosa fa il sistema, cosa è
stato verificato, e — soprattutto — **cosa manca ancora**, perché è quella
la parte che serve davvero a chi arriva dopo.

Ultimo aggiornamento: 6 settembre 2026.

---

## 0. Le ultime sessioni, in ordine

Le sessioni recenti stanno in fondo al documento, dalla più vecchia alla più
nuova. **Parti dall'ultima**: è quella che cambia di più il lavoro di chi
riprende adesso.

| Quando | Cosa |
|---|---|
| [4 settembre](#4-settembre-2026--formula-a-prezzo-fisso-banco-prenotazioni-complete) | Formula a prezzo fisso, numeri di ritiro al banco, prenotazioni complete, recensioni dal tavolo |
| [5 settembre](#5-settembre-2026--postazioni-formati-registratore) | Postazioni scelte dal locale, formati che portano il modo di lavorare, registratore telematico |
| [6 settembre](#6-settembre-2026--italiano-e-inglese-e-cinque-buchi-dellall-you-can-eat) | **Italiano e inglese ovunque**, cinque difetti dell'all you can eat, i coperti chiesti al tavolo |

Quello che segue qui sotto è il dettaglio della sessione del **4 settembre**,
tenuto perché descrive per esteso la formula a prezzo fisso — che è la cosa
su cui poggia tutto il resto.

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

Impostate su Vercel, non nei file.

**Quella che rompe tutto, e va messa per prima:**

| Variabile | Progetto | Se manca |
|---|---|---|
| `ENCRYPTION_KEY` | entrambi | **Non degrada: lancia.** È la chiave AES-256-GCM con cui sono cifrati tutti i segreti dei locali — chiave privata Satispay, credenziali fatture, token Tilby, OpenRouter, la Resend del locale. `key()` in `packages/shared/crypto.ts` fa `throw new Error("ENCRYPTION_KEY mancante")`, quindi saltano il pagamento Satispay, l'emissione della fattura elettronica, l'import del menu da Tilby e ogni salvataggio di segreto in Impostazioni. Come effetto secondario i rate limit diventano globali invece che per chiamante. **Non è in nessuno dei due `.env.example`**: chi si tira su l'ambiente locale copiandoli non ce l'ha. |

**Quelle che, mancando, non danno errore ma spengono qualcosa in silenzio:**

| Variabile | Progetto | Se manca |
|---|---|---|
| `CRON_SECRET` | guest | Il promemoria del giorno prima non parte. **Impostata il 4 settembre 2026.** L'endpoint rifiuta e lo scrive nei log. |
| `NEXT_PUBLIC_APP_URL` | guest | I link di disdetta nelle email puntano altrove. Impostata. |
| `APP_URL` | dashboard | Ripiega **in silenzio** su `http://localhost:3011`, anche in produzione. Finisce nei `return_url`/`refresh_url` dell'onboarding Stripe Connect e negli indirizzi di ritorno dell'abbonamento: il ristoratore completa la procedura su Stripe e viene rimandato su un indirizzo che dal suo computer non esiste. È la stessa trappola di `GUEST_APP_URL`, senza la protezione che `GUEST_APP_URL` ha guadagnato a settembre. |
| `GUEST_APP_URL` | dashboard | I QR per la tipografia punterebbero a `localhost`. Da settembre 2026 la pagina si rifiuta di generarli e lo dice — è l'unica delle tre a difendersi. Serve **anche in locale**: senza, la pagina QR non si può provare. |
| `RESEND_API_KEY`, `RESEND_FROM` | entrambi | Nessuna email parte. **Ancora da impostare.** |
| `INVOICETRONIC_WEBHOOK_SECRET` | guest | Le fatture restano su «Inviata a SDI» per sempre. La lista ora segnala quelle ferme da oltre due giorni. |

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

**Modelli per formato di locale.** Dodici formati — ristorante, pizzeria,
pizza al trancio, **sushi / all you can eat**, piadineria, steak house,
paninoteca, hamburgeria, bar, gintoneria, birreria, tisaneria — ognuno con
le proprie categorie e i
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
coperto e servizio mostrati **su tutte e due le carte** — quella del tavolo e
quella pubblica `/m/[slug]`, che a un controllo è il listino esposto — e non
solo in fondo al conto, come vuole il R.D. 635/1940 art. 180: la norma mette
il coperto alla pari di un piatto, quindi va scritto dove il cliente sceglie.

Le tre frasi stanno in `packages/shared/i18n/comune.ts` e non nel dizionario
di una pagina sola: devono dire la stessa cosa nei due posti, e due copie
sono il modo più semplice di ritrovarsi con una delle due sbagliata.

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

I test end-to-end creano un locale isolato, ordinano, pagano, chiudono e si
ripuliscono. Vanno eseguiti con `DATABASE_URL` nell'ambiente — e, se si
lavora in locale, con i due server già avviati.

**Di default puntano al locale**, non alla produzione: `localhost:3010` e
`localhost:3011`, e non c'è nessun `webServer` che li avvii al posto tuo.
Lanciando `pnpm test:e2e` senza server accesi si raccolgono ottanta
fallimenti di connessione, che sembrano un codice rotto e non lo sono.

Per puntare alla produzione:

```bash
E2E_GUEST_URL=https://ristoranti-guest.vercel.app E2E_DASHBOARD_URL=https://ristoranti-dashboard.vercel.app pnpm test:e2e
```

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
2. **Scontrino fiscale e corrispettivi telematici — non più del tutto.**
   Dal 5 settembre 2026 il collegamento al registratore esiste ed è cablato
   da un capo all'altro: alla chiusura del conto — dallo staff, da Stripe e
   da Satispay — viene accodato un documento commerciale
   (`accodaDocumento` in `packages/shared/fiscale.ts`), che l'agente di
   cassa ritira da `/api/rt/coda`, stampa e riporta su `/api/rt/esito`.
   C'è anche la via manuale, per chi la stampante non la collega: la pagina
   Corrispettivi mostra il riepilogo da battere a mano.

   **Quello che manca è la prova su hardware vero.** I tre tracciati XML
   (Epson, Custom, RCH) non hanno mai toccato una stampante, e l'agente
   stesso lo dice in testa al file. Finché non è provato, in vendita va
   detto che il locale continua a battere sulla propria cassa: **è vero
   oggi, e prometterlo diversamente è la cosa che fa perdere un cliente al
   primo controllo.**
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
- **Suite E2E: 80 test su 14 file**, con un locale per test — ayce 3, conto
  11, coperti 5, dashboard 8, fatturapa 2, formati 7, formula 4, gestione 5,
  guest 9, lingue 7, permessi 6, piattaforma 5, promemoria 3, servizio 5.
  Nessuno saltato, nessuno isolato. Coprono ordine e pagamento, permessi di
  ruolo e di reparto, trattenute, chiamate dal tavolo, formula a prezzo
  fisso, coperti dichiarati e confermati, intervallo fra le ordinazioni,
  rifiuto dell'incasso con carta in volo, disdetta, promemoria, formati di
  locale, lingue, pannello di piattaforma, assistenza andata e ritorno.
  **Non** coprono: numeri di ritiro al banco, recensioni, e il tracciato XML
  del registratore su hardware vero.
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
- **Le recensioni non si possono rispondere né esportare.** E il link a
  Google, *dentro il modulo di recensione*, è offerto ai soli cinque stelle
  per scelta del committente: è una posizione da rivedere se Google dovesse
  contestarla. Attenzione a non confonderla con l'altro bottone: sul conto
  saldato il link compare a **tutti** quelli che hanno pagato, senza filtro.
- **`pickup_metodi` non ha effetto sul cercapersone.** Il software dice quale
  numero far vibrare; non parla con l'hardware dei cercapersone, e non
  esiste uno standard per farlo.
- ~~La formula a prezzo fisso è scritta due volte~~ — **risolto il 4
  settembre 2026.** L'aritmetica sta in un posto solo, `contoSessione()` in
  `packages/shared/conto.ts`. `balance.ts` non calcola più niente: le sue
  quattro funzioni sono firme sottili che chiamano tutte lì, tenute perché
  mezza applicazione le chiama per nome. Chi tocca il conto tocca un file.

  La regola che resta, ed è quella che conta: **se scrivi un secondo posto
  dove si calcola il conto, i due divergeranno.** È già successo — la sala
  diceva centosessantotto euro e la cassa ne registrava sessantaquattro.

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

- **Il denaro non passa da noi.** I pagamenti con carta sono *direct charges*
  sull'account Stripe del locale: l'incasso è suo dal primo istante, e se
  domani ci spegniamo il suo conto non si blocca.
- **Ma tratteniamo l'1,5%** su ogni pagamento con carta. Va detto, perché è
  scritto nel codice e comparirà sul suo estratto conto Stripe:
  `application_fee_amount: Math.round(amountCents * 0.015)` in
  `apps/guest/src/app/api/payments/create-intent/route.ts`, sia sul conto
  intero sia alla romana. Su Satispay non tratteniamo niente — quella via non
  ha nessuna commissione di piattaforma. Nel codice il numero è marcato
  «provvisorio»: **è una decisione commerciale mai presa davvero**, e va
  presa prima del primo cliente vero, non dopo.
- **Il fornitore di pagamento è del locale.** Può negoziare la tariffa,
  cambiarlo, o tenere il POS che ha già: nessun vincolo.
- **White-label vero**, che sul mercato italiano quasi nessuno offre.
- **Moduli separati**: si compra solo il pezzo che serve.
- **Fattura elettronica dal tavolo**, che i concorrenti non hanno.

Con volumi bassi la percentuale altrui può convenire. Dirlo in fase di
vendita costa un cliente ogni tanto; non dirlo costa la fiducia di tutti al
primo estratto conto. Vale per il canone e vale, allo stesso modo, per
l'1,5%.

**Il confronto qui sopra va rifatto con quell'1,5% dentro.** Su trentamila
euro al mese sono 450 € di commissione nostra, che vanno sommati ai 139 € di
canone: siamo intorno ai 589 € più quello che il locale paga a Stripe,
contro i 459 € attribuiti al concorrente. Il paragrafo si intitola «Come si
posiziona, onestamente» e quel numero, come sta scritto sopra, onesto non è.

I moduli **stanno anche nel codice**, e questo limita quanto si può cambiare
senza un rilascio. `packages/shared/plans.ts` definisce il tipo `Modulo` e
l'array `PLANS`, e `startSubscription` accetta solo le chiavi che ci trova
dentro: un piano nuovo inventato su Stripe non si può sottoscrivere finché
`PLANS` non lo conosce. I metadata del Price servono al webhook per sapere
quali moduli concedere a un abbonamento già acceso — sono la seconda metà del
meccanismo, non tutto il meccanismo.

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

I moduli che un abbonamento concede stanno nei **metadata del prezzo**
(`moduli`), letti dal webhook degli abbonamenti: un prezzo senza metadata non
concede niente. Ma i piani *acquistabili* restano quelli di
`packages/shared/plans.ts`, quindi aggiungerne uno nuovo richiede comunque un
rilascio — cambiare *prezzo* a un piano esistente no.

**Non documentato altrove, e va documentato: la commissione di piattaforma
dell'1,5%** applicata in `create-intent` su ogni pagamento con carta, e solo
su quelli — Satispay ne è fuori. Nel codice è marcata «provvisorio»: nessuno
ha mai deciso quel numero, ed è il margine su cui poggia tutto il modello
oltre al canone.

---

## 7. Attivare un locale nuovo

**Prima di seguire questa lista, apri il gestionale su *Primi passi***
(`/dashboard/avvio`). Legge lo stato vero di quel locale e dice cosa manca,
in che ordine, e cosa può aspettare: cinque voci sotto «Senza queste non si
apre» — dati, menu, allergeni, tavoli, come incassi — e quattro sotto «Poi,
appena puoi». La lista qui sotto è il promemoria di chi vende; quella è la
verità su quel locale.

1. Registrazione da `/registrati` — crea locale, tavoli e categorie, e fa
   accettare l'accordo art. 28.
2. **Dagli l'abbonamento dal pannello di piattaforma** (`/admin`), oppure
   fallo abbonare. **Senza questo passo non si va avanti**: un locale appena
   registrato nasce con `subscription_status = 'none'` e nessun modulo,
   quindi la navigazione non mostra Menu, QR e tavoli, Ordini, Tavoli,
   Analisi, Fatture — cioè quasi tutti i passi che seguono. Da lì si sceglie
   anche il **tipo di locale**, che decide il modello di menu proposto.
3. **Impostazioni**: dati fiscali completi (senza, l'informativa privacy
   mostrata ai clienti è incompleta e il gestionale lo segnala), logo,
   colori, coperto e servizio se applicati. E la **lingua**: quella con cui
   il ristoratore vede il gestionale, e quella con cui si aprono le sue
   pagine pubbliche quando il telefono del cliente non dice niente di utile.
4. **Menu**: parti dal modello del tuo formato in fondo alla pagina Menu —
   crea categorie e scelte tipiche e ti elenca gli obblighi di quel
   formato. Poi import da file o inserimento. Allergeni su ogni piatto:
   sono obbligatori. Conservazione diversa da "fresco" dove serve.
5. **Come incassa.** Due vie, e valgono uguale — «Primi passi» considera il
   passo fatto con l'una o con l'altra:
   - **Stripe**: *Impostazioni → Connetti Stripe*. Serve documentazione
     dell'attività e IBAN; la verifica non è immediata. È l'unica via su cui
     tratteniamo l'1,5% (vedi §6).
   - **Satispay**: *Impostazioni → Satispay*, una sezione più sotto. Serve
     solo un account Satispay Business e un codice di attivazione, senza
     istruttoria. **Per un locale che apre fra tre giorni è spesso l'unica
     via percorribile**, e nessuna commissione di piattaforma.
6. **QR**: da *QR e tavoli*, una locandina A6 per tavolo, pronta per la
   tipografia.
7. **Prenotazioni**, se acquistate: indirizzo che riceve le richieste e
   capienza. Senza capienza la conferma automatica resta disattivabile,
   di proposito.
8. **Orari**, sempre: compaiono sulle pagine pubbliche e sono la prima cosa
   che le persone cercano.
9. **Formula a prezzo fisso**, se il locale lavora ad all you can eat:
   *Impostazioni → Formula a prezzo fisso*. Prezzo di pranzo e di cena, da
   che ora vale la cena, tariffa bambini, supplemento per l'avanzato. Poi
   spunta **Fuori formula** sulle voci che restano a pagamento — dolci,
   caffè, amari, bevande, premium — o finiranno comprese. Applicando il
   modello «Sushi / All you can eat» le spunte su Dolci e Bevande arrivano
   già fatte.

   Due cose stanno **altrove**, e vanno dette al ristoratore lo stesso:
   - l'**attesa fra le ordinazioni** è in *Impostazioni → Coperto e
     servizio*, sempre visibile e slegata dalla formula. Senza, un tavolo da
     sei manda ottanta piatti in tre minuti.
   - **quando un tavolo riparte da zero** (`sessione_max_ore`, sei ore di
     partenza). Chi fa due turni deve metterlo sotto la distanza fra l'uno e
     l'altro, o il secondo turno eredita il conto del primo — e a prezzo
     fisso paga una formula per dodici persone.

   E la cosa che cambia il lavoro di sala: **su un tavolo a formula i coperti
   vanno confermati**, o quel tavolo non può pagare con carta. Vedi «Cosa
   cambia nel lavoro di sala» nella sessione del 6 settembre.
10. **Numeri di ritiro**, se consegna al bancone e non al tavolo:
   *Impostazioni → Numeri di ritiro*. Accendili e scegli come avvisi —
   segnaposto, cercapersone, telefono, anche più d'uno. Compare la pagina
   **Banco** per lo schermo dietro al bancone. Accenderli senza scegliere un
   modo viene rifiutato: il cliente avrebbe un numero che nessuno chiama.
11. **Link recensioni**: *Impostazioni → Marchio*, il campo del profilo
    pubblico. Compare **a tutti** i clienti che hanno pagato, sul conto
    saldato. Il filtro a cinque stelle è un'altra cosa: vale nel modulo di
    recensione interno, dove il link a Google si offre solo a chi ha dato
    cinque stelle e agli altri si chiede il perché. Chi vende deve tenerle
    distinte, perché sono due comportamenti diversi sulla stessa pagina.
12. Facoltativi e a consumo, su chiave OpenRouter del locale: **schede vino
    da foto** e **assistente**. Entrambi spenti finché non li accende lui.

---

## 8. Documenti

- [`docs/GDPR.md`](docs/GDPR.md) — registro dei trattamenti, misure di
  sicurezza, cosa manca alla conformità
- [`docs/CHECKLIST-LANCIO.md`](docs/CHECKLIST-LANCIO.md) — cosa fare prima
  di far provare il sistema a un ristoratore
- [`docs/Presentazione-ristoratori.pdf`](docs/Presentazione-ristoratori.pdf)
  — spiegazione per chi acquista
- [`docs/GO-LIVE.md`](docs/GO-LIVE.md) — **leggilo per primo se qualcosa non
  incassa o non manda email.** È l'elenco dei collegamenti che passano da
  chiavi del titolare, con lo stato verificato: al 6 settembre 2026 le chiavi
  Stripe sono **ancora in test** (nessun euro si muove, e il conto risulta
  saldato lo stesso) e **`RESEND_API_KEY` non esiste** su nessuno dei due
  progetti (nessuna email parte, e non lo dice nessuno a schermo).
- [`docs/LINGUE.md`](docs/LINGUE.md) — come si sceglie la lingua, cosa non si
  traduce e perché, e la differenza fra le due traduzioni

---

## 9. Se il locale ha già il suo POS

È il caso più comune in Italia, e il sistema **funziona lo stesso**: il
locale tiene la propria cassa e il proprio acquirer, noi aggiungiamo menu,
ordine al tavolo e conto.

Il conto si chiude segnando l'incasso avvenuto sul terminale del locale, e
il tavolo si libera. Quello che il locale continua a fare da sé è battere
lo scontrino fiscale: è la **doppia battuta**, ed è la prima obiezione che
farà. Va detta in fase di vendita, non scoperta dopo.

Per il pagamento *dal telefono del cliente* servono Stripe **oppure**
Satispay: sono due vie complete e indipendenti, ognuna con la sua rotta, il
suo webhook e il suo bottone nel conto. Un locale che non vuole
l'istruttoria di Stripe Connect può incassare da telefono con la sola
Satispay — e senza la nostra commissione dell'1,5%, che si applica solo alla
via Stripe. Chi non vuole né l'una né l'altra compra comunque menu, ordine e
prenotazioni, e incassa come ha sempre fatto.

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


---

## 5 settembre 2026 — postazioni, formati, registratore

### Le postazioni le decide il locale

`venue_reparti` (venue_id, chiave, etichetta). Chi non ne definisce usa le sei
di partenza — cucina, bar, pizzeria, pasticceria, banco sushi, griglia — e non
si accorge che la tabella esiste. Chi ne definisce usa le sue: due cucine, il
forno separato dalla friggitoria, il «pass» da cui la sala ritira.

**Non è un campo libero al momento dell'uso**, ed è deliberato: scrivendo il
nome ogni volta si finisce con «Cucina», «cucina» e «CUCINA» come tre
postazioni, e chi ha il permesso su una non ce l'ha sulle altre. Si crea una
volta e si sceglie da una tendina ovunque — categorie, permessi, dispositivi,
board, stampa comande.

**La chiave non cambia mai**, l'etichetta sì: rinominare non toglie il
permesso a nessuno. E una postazione con ancora categorie sopra non si può
togliere: le sue comande finirebbero su uno schermo che non esiste.

`menu_categories.reparto` ha un vincolo **di forma** (`^[a-z0-9_-]{1,32}$`) e
non un elenco chiuso. Era chiuso, e aggiungere due postazioni faceva fallire
ogni inserimento con un errore che non spiegava niente.

### I formati portano il modo di lavorare, non solo il menu

Ogni categoria di modello ha reparto, aliquota, genere e `fuoriFormula`. Prima
portava solo il nome, e questo rompeva cose costruite altrove: i cocktail di
una gintoneria finivano in cucina e il barista non poteva muoverli; una carta
di vini nasceva al 10%; un all-you-can-eat comprendeva gli amari.

Otto formati portano anche un **listino di partenza**, con gli allergeni già
compilati. Nasce **spento** (`available = false`): i prezzi sono indicativi e
sbagliati per definizione, e un listino inventato pubblicato per sbaglio è
peggio di un menu vuoto.

Piadineria, pizza al trancio e paninoteca accendono il **servizio al banco**:
ogni cliente il proprio conto, numero di ritiro, e la home che diventa Banco.

### Il registratore telematico

Coda in `fiscal_documents`, agente in `agente-cassa/` che gira sul computer
della cassa — la stampante sta sulla rete del locale e da Vercel non si
raggiunge. Tre dialetti (Epson, Custom, RCH), **nessuno provato su hardware
vero**. Reparti IVA, marca, operatore e ora di stacco della giornata sono
impostazioni del locale.

Chi non installa niente resta in **manuale** e ha il riepilogo di giornata per
metodo di pagamento, da battere in cassa. I conti chiusi senza documento si
vedono in Corrispettivi: l'accodamento avviene **dopo** la chiusura e fuori
dalla transazione, perché fermare la sala è peggio di un documento mancante.

### Come si confrontano i due database

Non bastano le colonne. Vanno confrontati **colonne, indici e vincoli**, e
vanno confrontati **dopo** ogni modifica allo schema — non prima. Due derive
sono passate proprio così: gli stati `pending`/`declined` delle prenotazioni
(un'installazione nuova rifiutava ogni richiesta) e il vincolo sul reparto.

---

## 6 settembre 2026 — italiano e inglese, e cinque buchi dell'all you can eat

### Il software parla due lingue

Interfaccia in **italiano e inglese**, tutta: la pagina che il cliente apre
al tavolo, il menu pubblico, le prenotazioni, il gestionale, le email, la
ricevuta.

Da non confondere con le traduzioni del **menu**, che già c'erano: quelle
sono dieci lingue e le scrive il ristoratore sui nomi dei piatti. Questa è
l'interfaccia, due lingue, e la scriviamo noi. Sono cose separate perché
cambiano per ragioni diverse e le scrive gente diversa. Il ponte fra i due
sistemi sta in `linguaContenuto()` e `linguaUIPerContenuto()`: chi legge
"Add to order" non deve trovarci sotto "Tagliata di manzo", e chi chiede il
menu in tedesco ha l'interfaccia in inglese, che è il meglio che abbiamo.

Il motore è `packages/shared/i18n/`. L'inglese è tipato `Speculare<typeof
IT>`: **una chiave dimenticata non compila**. È un tipo e non un controllo a
runtime apposta — deve rompere la build, non comparire in italiano dentro una
frase inglese davanti al cliente.

Come si sceglie la lingua, in ordine di precedenza:

| Dove | Ordine |
|---|---|
| Al tavolo | `?lang=` → cookie → lingua del telefono → italiano |
| Nel gestionale | `users.lingua_ui` → cookie → browser |
| Nelle email | dalla richiesta se il cliente è collegato, da `reservations.lingua` per il promemoria del giorno dopo |

Quel terzo caso è il motivo della migrazione 062: il promemoria lo manda un
cron alle nove del mattino, quando header e cookie non esistono più. Senza
quella colonna, chi prenota in inglese riceve in italiano proprio il
messaggio che contiene il link per disdire.

**Cosa non si traduce**, e va lasciato stare: i termini fiscali italiani
(Partita IVA, Codice Destinatario, SDI, documento commerciale, corrispettivi,
Registratore Telematico) — sono nomi di istituti e di portali reali, e
tradurli manda un commercialista a cercare una voce che sul sito
dell'Agenzia non esiste. E i testi scritti dal ristoratore
(`TESTI_PUBBLICI`): quelli sono la sua voce, traduciamo solo il nostro
ripiego. Gli allergeni inglesi seguono l'**Allegato II del Reg. UE 1169/2011
nella versione inglese ufficiale** — "Cereals containing gluten", non
"Gluten": è la formula che chi è allergico cerca, ed è quella che regge a un
controllo.

Dettagli in `docs/LINGUE.md`. Collaudo in `e2e/lingue.spec.ts`.

### Cinque cose che si rompevano solo in un all you can eat

Trovate mettendo il prodotto contro un profilo preciso — sushi a prezzo
fisso, quaranta coperti, due turni, ottanta piatti a tavolo, due reparti che
lavorano lo stesso tavolo — invece che contro il codice in astratto. Nessuna
delle cinque si presenta in una trattoria da venti coperti, ed è per questo
che erano rimaste lì.

**1. La stampa comande accumulava per sempre.** Chiudere il conto chiude la
sessione ma non porta le righe a `served`, e in tutto il progetto nessuno le
porta a `served` in blocco. In un all you can eat nessuno picchietta
"servito" ottanta volte a tavolo. Al secondo giorno la pagina di stampa
mostrava le comande di ieri insieme a quelle di stasera — e chi la usa come
ripiego quando lo schermo si pianta preparava roba già mangiata e pagata.
Ora ha `ts.status = 'open'` e un limite di ventiquattro ore, come la board.

**2. «Tutto pronto» dal banco crudo mandava fuori anche i fritti.** Il filtro
di reparto viveva solo nella pagina; l'azione in blocco restringeva al
reparto soltanto se l'account aveva `venue_staff.reparti` valorizzati. Due
schermi sullo stesso account padrone — il caso normale in un locale a
gestione familiare — e il filtro spariva: il bottone diceva 4 e ne spostava
9. Ora il reparto **dello schermo** viaggia fino alla query, e resta separato
da `venue_staff.reparti`, che è autorizzazione. Sono due domande diverse.

**3. I coperti nascevano a uno, e a prezzo fisso i coperti sono il conto.**
Nascono a uno perché la sessione la apre il cliente inquadrando il QR, prima
che qualcuno del personale la guardi. Alla carta muovono il solo coperto; a
formula sono *tutto* il conto — un tavolo da sei pagava venticinque euro
invece di centocinquanta. E un tavolo da uno esiste davvero, quindi
`guest_count = 1` non distingue il non dichiarato dal reale: serve
`coperti_confermati`. Finché la sala non conferma, il cliente non vede un
totale e non può pagare con carta — legge che lo conferma il personale, e il
tasto contanti resta, perché quello chiama il cameriere, che è proprio
quello che serve. Il blocco è **anche nelle rotte di pagamento**, non solo
nel bottone: sono POST pubblici come tutti gli altri.

**4. La fascia pranzo/cena si decideva dall'ora di apertura, senza appello.**
Il tavolo seduto alle 18:30 dove la cena parte alle 19 pagava il pranzo per
tutta la sera: su quattro persone, con dieci euro di differenza fra le due
fasce, sono quaranta euro a tavolo. L'orario resta il predefinito ed è
giusto quasi sempre, ma ora `table_sessions.fascia` lo corregge dalla card
del tavolo.

Il 3 e il 4 stanno nella migrazione 063, e sono stati provati sul codice
vero e sul database vero, non a memoria.

**5. E una decisione presa da noi al posto del cliente.**
`venues.sessione_max_ore` diceva da sempre sei ore e non c'era modo di
cambiarlo da nessuna schermata. Un tavolo lasciato aperto resta lo stesso
conto: chi inquadra il QR dopo si aggiunge a quello di prima. Sei ore vanno
bene a una trattoria e sono sbagliate per due turni — chi si siede alle 21:30
si attaccava alla sessione delle 19:00, e a prezzo fisso sono dodici persone
su una formula sola. Ora sta in **Impostazioni → Quando un tavolo riparte da
zero**, con scritto in chiaro che chi fa due turni deve metterlo sotto la
distanza fra l'uno e l'altro.

### «In quanti siete?», chiesto al tavolo

Il seguito naturale del punto 3: i coperti servono, e chiederli a chi è
seduto è più veloce che farli contare da lontano. Appena inquadra il QR, un
tavolo a prezzo fisso trova la domanda in cima alla pagina — non in una
finestra sopra, perché al telefono un pop-up è la cosa che si chiude senza
leggerla per arrivare al menu.

**È una proposta, non una decisione.** Scrive `guest_count` e segna
`coperti_dal_tavolo`, ma non tocca `coperti_confermati`: la conferma resta
un gesto del personale, ed è quella che sblocca il pagamento con carta. Un
tavolo da sei che ne dichiara quattro risparmia cinquantadue euro e nessun
programma può accorgersene — la decisione sui soldi resta al locale.

In sala la card mostra «Il tavolo dice: 6 coperti» con un bottone
**Accetta**: un tocco, non un modulo. E compare **solo se nessuno ha messo i
coperti sedendo il tavolo** — se il locale lavora come lavorano le casse del
mestiere, cioè segnando i coperti quando fa sedere la gente, quel bottone non
si vede mai e al cliente la domanda non compare nemmeno. È il recupero di una
dimenticanza, non un passaggio del flusso normale.

Migrazione 064. Collaudo in `e2e/coperti.spec.ts`, cinque casi, compreso
quello che conta: chi conosce l'id di una sessione **non** può riabbassare a
uno un tavolo che il personale aveva già confermato a sei.

### Un difetto trovato scrivendo quel collaudo, e la lezione

`api/bill/route.ts` costruiva la risposta ricopiando la formula **campo per
campo**. `copertiDaConfermare` non era nell'elenco: il conto sapeva
benissimo che i coperti non erano dichiarati, e la pagina mostrava lo stesso
il totale di una persona sola. Nessun errore, da nessuna parte —
`NextResponse.json()` accetta qualunque oggetto, quindi il tipo non
proteggeva niente, e il componente riscriveva il tipo a mano invece di
derivarlo.

Il guardiano sui soldi ha retto lo stesso, perché le rotte di pagamento
chiamano `contoSessione` per conto loro invece di fidarsi di quel JSON. Ma
per due ore la schermata ha detto una cosa falsa a chi mangiava.

**Una risposta JSON ricopiata a mano è un tipo che non esiste.** Dove il
consumatore deve stare in pari con la sorgente, si manda l'oggetto e si
importa il tipo — come fa ora `formula`.

### Cosa cambia nel lavoro di sala, a prezzo fisso

Vale la pena dirlo perché è l'unico attrito nuovo: **su un tavolo a formula
qualcuno deve scrivere i coperti**, altrimenti quel tavolo non vede un totale
e non può pagare con carta. È un tocco sulla card del tavolo. In cima alla
sala compare quanti tavoli lo stanno aspettando, così non lo si scopre dal
cliente che chiama.

Non è pignoleria: a prezzo fisso i coperti *sono* il conto, e chiuso il conto
quel numero entra nel documento commerciale e non torna più indietro. Il tasto
contanti resta sempre attivo, perché quello chiama il cameriere — che è
esattamente quello che serve.

### Questo è online, non solo scritto

Commit `908dfbb` su `main`, 223 file. Le due applicazioni sono state
ricostruite e rilasciate su Vercel, e **gli 80 test end-to-end sono stati
rifatti contro la produzione**, non contro il locale: 80 su 80, nove minuti
e mezzo.

Le migrazioni **061-064 sono già applicate** al database di produzione:
`node db/migrate.mjs` non ha più niente da fare, e `node db/confronta.mjs`
dice identici su colonne, indici e vincoli. Chi riprende non deve applicare
niente.

Verificato sugli indirizzi veri:

| Richiesta | Cosa risponde la produzione |
|---|---|
| `Accept-Language: en-GB` | `<html lang="en">`, «Terms of service», «Sign in» |
| `Accept-Language: it-IT` | `<html lang="it">`, «Termini di servizio», «Accedi» |

**Quello che NON è cambiato, ed è ancora quello che separa dal primo euro:**
le chiavi Stripe sono ancora quelle di **test** su tutti e due i progetti, e
`RESEND_API_KEY` **non esiste** su nessuno dei due. Quindi: chi paga al
tavolo non muove un euro e il conto risulta saldato lo stesso, e non parte
nessuna email — né conferma prenotazione, né promemoria, né copia fattura.
Sono due valori da incollare su Vercel, e stanno in `docs/GO-LIVE.md` con i
passaggi e le verifiche.

### Il documento riletto contro il codice, e cosa ne è uscito

Dopo i 223 file di questa sessione la parte di riferimento (sezioni 1-9) è
stata riletta riga per riga contro il codice, non a memoria. Venti
affermazioni sono risultate false o scadute e sono state corrette qui dentro:
il numero dei formati (dodici, non undici, e mancava proprio il sushi), il
numero dei test (ottanta, non quarantasei), il registratore telematico
elencato fra le cose che non abbiamo, la formula «scritta due volte» che è
scritta una sola da settembre, i test dati per «contro la produzione» quando
di default puntano al locale, e la procedura di attivazione a cui mancava il
passo senza il quale non se ne fa nessun altro — dare l'abbonamento, perché
un locale appena registrato non vede nemmeno la voce Menu.

**Ma la cosa più importante che è uscita non è un refuso, ed è una decisione
che aspetta il committente.**

Il documento diceva, fra gli argomenti di vendita: «Non tratteniamo nulla
sull'incassato». Non è vero. Il codice trattiene **l'1,5% su ogni pagamento
con carta** — `application_fee_amount: Math.round(amountCents * 0.015)` in
`apps/guest/src/app/api/payments/create-intent/route.ts`, sia sul conto
intero sia alla romana — e nel codice quel numero è marcato «provvisorio».

Quindi: nessuno l'ha mai deciso davvero, e nel frattempo era diventato una
frase da dire ai clienti che il codice smentiva. Su trentamila euro al mese
sono 450 € che il ristoratore vede sul suo estratto conto Stripe senza che
gliel'abbia detto nessuno.

**Va deciso prima del primo cliente vero**: o si tiene e si mette nel
listino, o si toglie dal codice. Le due cose che non si possono fare sono
lasciarlo lì senza dirlo, e dire che non c'è.

### L'ultimo buco di conformità chiuso

La verifica del documento aveva trovato che l'obbligo sui prezzi era
soddisfatto solo a metà: coperto e servizio comparivano sul menu del tavolo
e **non** sulla carta pubblica `/m/[slug]`, che non li leggeva nemmeno dal
database. È la carta che conta di più, perché è quella esposta e indicizzata.

Ora ci sono, subito sotto i prezzi e non nel piè di pagina, in italiano e in
inglese, con il nome che il locale ha dato al coperto se ne ha dato uno. Le
frasi sono le stesse della pagina del tavolo, prese dallo stesso dizionario:
`packages/shared/i18n/comune.ts`. Quattro casi in
`e2e/coperto-carta.spec.ts`, compreso quello che conta al contrario — chi non
applica né coperto né servizio non deve vedersi comparire una riga che dice
zero.

### I quarantadue reperti mai verificati, chiusi

Il controllo sul profilo all you can eat aveva sollevato cinquantadue reperti
e ne aveva verificati solo due: gli altri erano rimasti lì, senza che nessuno
sapesse se fossero veri. Ora sono stati letti tutti contro il codice.

**Trentuno confermati, undici scartati.** Gli scartati erano letture
affrettate — comportamenti che il codice documenta come voluti, numeri di
riga sfasati di una versione, e cose corrette nel frattempo. Uno per tutti:
«la board non toglie mai i piatti serviti» è scartato perché il commento
nella query spiega la scelta e i conti non tornavano, seicento righe con
l'indice al posto giusto non sono un carico.

I sette che fermavano una vendita:

| Difetto | Cosa costava |
|---|---|
| L'import CSV non porta reparto né fuori formula | Le bevande importate risultavano **comprese nel prezzo fisso**: il cliente le vedeva incluse e a fine serata non erano nel conto |
| Ogni conto chiuso in sala certificato contante | Anche col bancomat, cento volte al giorno — è lo scostamento che l'Agenzia incrocia con i dati dell'acquirer da gennaio 2026 |
| Il modello sushi senza listino di partenza | Centoventi voci a mano il primo giorno, unico grande formato senza |
| Bevande e dolci caricati dopo il formato | Restavano dentro il prezzo fisso e non lo diceva nessuno |
| Cinque tentativi in quindici secondi | Finita la carta, ogni documento in coda si bruciava i tentativi e **non tornava più** |
| La coda ignorava la giornata di servizio | Computer spento sabato: domenica uscivano cento scontrini di sabato dentro la giornata di domenica |
| Il riepilogo senza divisione per aliquota | Chi batte a mano non aveva i numeri: 10% e 22% non separati da nessuna parte |

Il listino sushi ha richiesto una cosa che i reperti non chiedevano.
`PiattoModello` non aveva un campo per la conservazione, quindi un listino
regalato sarebbe nato **«fresco» sul pesce crudo** — cioè un menu che a un
controllo è sbagliato, perché il crudo va abbattuto a −20 °C e dichiarato
(Reg. CE 853/2004). Il campo si aggiunge insieme al listino: trenta voci,
dieci dichiarate abbattute, birre e sake al 22% in categorie loro.
**Un regalo che nasce sbagliato è peggio di nessun regalo**, perché chi lo
riceve si fida e non ricontrolla. Collaudo in `e2e/listino-sushi.spec.ts`.

Le altre ventiquattro sono più piccole ma della stessa famiglia: il limite
anti-abuso che sul wifi del locale valeva per tutta la sala insieme, il conto
alla rovescia che si fermava a schermo bloccato, due pillole identiche sulla
board dove una è irreversibile, il cronometro che misurava la serata invece
dell'ondata, le foto che non rispondevano mai 304, e le analisi che a prezzo
fisso mostravano come incasso delle righe che nessuno paga.

**88 test, tutti verdi contro la produzione.**

### Aggiornamento 9 settembre 2026: sale grandi, ritiro e WhatsApp

- I codici tavolo usano ora un ordinamento naturale condiviso: `T2` precede
  `T10` in sala, QR, personale e prenotazioni.
- La pianta lavora per sala, con griglia ampliata, disposizione indipendente e
  comando `Riordina T1, T2, T3`. Il salvataggio di fino a 400 posizioni avviene
  con un solo aggiornamento SQL invece di una query per tavolo.
- Le schede operative partono dai soli tavoli occupati; la vista di tutti i
  tavoli resta disponibile. È stato aggiunto un collaudo da 200 tavoli in tre
  sale.
- `ritiro` è un modulo separato. Il piano `ritiro-mensile` costa 129 euro e
  quello annuale 1.290 euro; il piano completo include il modulo. La migrazione
  `066_modulo_ritiro.sql` conserva il diritto ai clienti completi esistenti.
- I Price Stripe test del ritiro sono `price_1UDmXjGlajKIILdU1R9JhEM1`
  (mensile) e `price_1UDmXjGlajKIILdUcmzBUglH` (annuale). Non sono ancora stati
  aggiunti a `STRIPE_PRICES` in produzione: quella modifica del listino richiede
  autorizzazione esplicita.
- Il pulsante WhatsApp della landing resta un contatto `wa.me`, non un canale
  automatico. Architettura proposta e confronto verificato con Aurora AI:
  `docs/WHATSAPP-AURORA.md`.

### Una trappola per chi scriverà i prossimi test

`playwright.config.ts` ora dichiara `locale: "it-IT"`, e non è un dettaglio.
Playwright lancia il suo Chromium **in inglese a prescindere da come è
impostato il computer**: da quando l'applicazione parla due lingue, le prove
scritte contro l'italiano — "Accedi", "Il conto", "Compreso nella formula" —
cercavano parole che la pagina non scriveva più. Fallivano in blocco, e
accusavano il codice di qualcosa che non aveva fatto.

Chi scrive una prova sulla lingua si apre il suo contesto
(`browser.newContext({ locale: "en-GB" })`), come fa `e2e/lingue.spec.ts`.

E una seconda, della stessa famiglia: `expect` ha ora quindici secondi, non i
cinque di partenza. Le asserzioni di questa suite non guardano dei calcoli:
aspettano un giro di rete più un ciclo di aggiornamento della pagina. Contro
i server locali cinque bastano, contro la produzione no — e cadevano sempre
gli stessi due, che rifatti da soli passavano. **Un rosso che dipende da dove
lo si lancia insegna a rilanciare invece che a guardare**, ed è il modo più
rapido di rendere inutile una suite.

### Uno strumento nuovo: `node db/confronta.mjs`

Applica `schema.sql` più tutte le migrazioni dentro uno schema temporaneo e
lo confronta con la produzione: **colonne, indici e vincoli**. Esisteva come
procedura a mano ed è per questo che due volte è passata inosservata — il
CHECK vecchio sulle prenotazioni e quello sui reparti. Ora è un comando, e
ignora `schema_migrations` apposta: una differenza che c'è sempre è una
differenza che si impara a ignorare.

Va rilanciato **dopo** ogni modifica allo schema, non prima.
