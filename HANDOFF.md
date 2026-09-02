# Passaggio di consegne

Per chi prende in mano il progetto. Descrive cosa fa il sistema, cosa è
stato verificato, e — soprattutto — **cosa manca ancora**, perché è quella
la parte che serve davvero a chi arriva dopo.

Ultimo aggiornamento: settembre 2026.

Gestione menu estesa: l'admin puo modificare manualmente anche
sottocategoria (naturale/frizzante, bionda/rossa, bianco/rosso), formato,
servizio (bottiglia/spina/calice/lattina), stile birra e vitigno. La nuova
migrazione e `db/migrations/023_menu_beverage_details.sql`. L'import CSV/TSV/XLSX
legge gli stessi campi, oltre a foto, produttore, annata, gradazione,
allergeni ed etichette; il template aggiornato e scaricabile dalla pagina Menu.

Il template pubblico del menu ora usa una grafica premium editoriale: fondo
avorio materico, superfici calde, ombre leggere, gerarchia tipografica serif
per nome locale e sezioni, e card fotografiche coerenti.

Aggiornamento menu demo: la pagina pubblica del menu ha ora una griglia
responsive più curata, immagini locali con dimensioni stabili e focus
accessibile. Il seed demo include foto coerenti per bruschetta, carbonara,
bevande e Chianti in `apps/guest/public/piatti/`. Sono immagini fotografiche
generate per la demo; per un locale reale vanno sostituite con gli scatti
autentici del ristorante.

Il menu pubblico `/m/[slug]` apre ora una scheda dettagli cliccando una voce:
foto ingrandita, descrizione e prezzo, con chiusura tramite pulsante o tasto
Escape. Se una voce non ha ancora una foto nel database, usa un fallback locale
coerente con la categoria.

Il gestionale ha ora `/dashboard/invoices`: elenco delle fatture del locale,
stato, numero, data, importo, identificativo SDI/Invoicetronic e stampa della
lista. Il download XML compare quando `xml_url` è disponibile; il recupero
automatico del documento dal provider e la sincronizzazione webhook degli
stati restano da completare.

La gestione fatture è stata completata lato codice: il dettaglio sincronizza
lo stato con Invoicetronic, `/dashboard/invoices/[id]/document` scarica l'XML
dal provider e `/api/webhooks/invoicetronic` aggiorna gli stati con firma HMAC.
Il webhook va registrato nel pannello Invoicetronic con l'URL pubblico e il
segreto in `INVOICETRONIC_WEBHOOK_SECRET`. La richiesta fattura raccoglie
anche l'email del cliente e invia una copia tramite Resend quando configurato.

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
rinomina, disattivazione. Import da CSV/TSV e dal listino Tilby.

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
del locale — menu, orari, indirizzo, informazioni pratiche — e li porta a
prenotare. Il link di prenotazione lo mette il codice, non il modello, così
è sempre quello giusto. Sugli allergeni non decide mai: riporta ciò che è
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

**Pagamenti.** Carta, Apple Pay, Google Pay via Stripe Connect; Satispay;
contanti registrati dallo staff. Conto alla romana per piatto. Mance
percentuali configurabili.

**Fatturazione elettronica.** Il cliente inserisce i dati dal tavolo, la
fattura parte allo SDI tramite intermediario accreditato.

**Varianti, aggiunte e rimozioni.** Gruppi di scelte con minimo, massimo e
supplemento per opzione, anche negativo. Coprono formati (sushi 6/12/24,
calice/bottiglia/magnum), scelte obbligatorie (cottura) e aggiunte
multiple. Le **rimozioni** sono un tipo a sé perché si leggono al
contrario: "Cipolla" stampato in comanda direbbe al cuoco di aggiungerla,
quindi l'etichetta si risolve una volta sola sul server e la cucina legge
sempre "Senza cipolla".

Il carrello è indicizzato per piatto **più** opzioni ordinate: due sushi da
6 e uno da 12 non collassano in una riga sola col prezzo sbagliato.

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

20 test end-to-end che girano **contro la produzione**: creano un locale
isolato, ordinano, pagano, chiudono e si ripuliscono. Vanno eseguiti con
`DATABASE_URL` nell'ambiente.

---

## 5. Cosa manca

La parte importante di questo documento.

### 5.1 Bloccato da terzi

| Cosa | Chi lo sblocca |
|---|---|
| **Sandbox Stripe da rivendicare.** Finché non lo è, Connect non funziona e nessun pagamento reale è possibile: la chiave provvisoria non ha i permessi. | Titolare dell'account Stripe |
| **Chiave Resend** (`RESEND_API_KEY`, `RESEND_FROM`). Senza, nessuna email parte: le prenotazioni arrivano solo in gestionale e il cliente non riceve conferme. Il gestionale lo dichiara invece di fingere. | Chi vende |
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
   di scoprirla dopo.
3. **Comanda presa dal cameriere.** Oggi ordina solo il cliente. Non tutti
   scansionano il QR.
4. **Asporto e delivery.** Richiesta frequentissima.
5. **Caparra anti no-show** sulle prenotazioni. È l'argomento di punta di
   TheFork. La colonna esiste in `reservations`, la logica no.
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
- **Il repo GitHub è pubblico.** Non contiene segreti, ma va valutato se
  renderlo privato prima della vendita.

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
8. Facoltativi e a consumo, su chiave OpenRouter del locale: **schede vino
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
