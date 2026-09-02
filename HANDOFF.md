# Passaggio di consegne

Per chi prende in mano il progetto. Descrive cosa fa il sistema, cosa è
stato verificato, e — soprattutto — **cosa manca ancora**, perché è quella
la parte che serve davvero a chi arriva dopo.

Ultimo aggiornamento: settembre 2026.

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

**Varianti e aggiunte.** Gruppi di scelte con minimo, massimo e
supplemento per opzione, anche negativo. Coprono i tre casi reali: formati
(sushi 6/12/24, calice/bottiglia/magnum), scelte obbligatorie (cottura), e
aggiunte multiple a pagamento. Il carrello è indicizzato per piatto **più**
opzioni: due sushi da 6 e uno da 12 non collassano in una riga sola.

**Bevande.** Produttore, annata, denominazione, zona, gradazione, nota di
servizio. Avviso quando un vino non dichiara i solfiti.

**Obblighi di legge sul menu.** Allergeni per piatto; stato di
conservazione (fresco/congelato/surgelato/abbattuto) con asterisco e nota
costruita su ciò che c'è davvero in carta; origine per la carne bovina;
coperto e servizio mostrati **sul menu** e non solo in fondo al conto.

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

**Prenotazioni.** Pagina pubblica indicizzabile con dati strutturati
`ReserveAction`. Capienza controllata su fascia sovrapposta, non sull'ora
esatta: contare solo gli orari identici lascerebbe entrare venti coperti
alle 20:00, venti alle 20:15 e venti alle 20:30 in una sala da trenta.
Quando non c'è posto il cliente riceve gli orari vicini in cui c'è davvero.
Conferma e rifiuto con email; gli errori di invio restano scritti accanto
alla prenotazione e visibili in gestionale.

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
| **Foto reali dei piatti.** Oggi sono segnaposto. Il credito per generarle è a zero. | Il locale, o una ricarica |
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
- **`db/seed.sql` è solo per lo sviluppo.** Non applicarlo in produzione.
- **Il repo GitHub è pubblico.** Non contiene segreti, ma va valutato se
  renderlo privato prima della vendita.

---

## 6. Listino

| | Mensile | Annuale |
|---|---|---|
| Ordini e pagamenti | 109 € | 1.090 € |
| Solo prenotazioni | 49 € | 490 € |
| Tutto | 139 € | 1.390 € |
| **Attivazione** | **649 € una tantum, su tutti i piani** | |

Prova di 14 giorni, tutti i moduli aperti. Prezzi IVA esclusa.

L'argomento di vendita non è il canone ma il **costo totale**: i
concorrenti prendono l'1,2–2% sugli incassi con carta, noi zero. A 30.000 €
al mese di incassi un concorrente all'1,2% costa 459 € contro i nostri 139.
Il pareggio è intorno a 3.300 € al mese: sopra, costiamo meno, e la
distanza cresce col fatturato del locale invece di stringersi.

I moduli non stanno nel codice: arrivano dai metadata del Price su Stripe,
letti dal webhook. Cambiare listino non richiede un deploy.

---

## 7. Attivare un locale nuovo

1. Registrazione da `/registrati` — crea locale, tavoli e categorie, e fa
   accettare l'accordo art. 28.
2. **Impostazioni**: dati fiscali completi (senza, l'informativa privacy
   mostrata ai clienti è incompleta e il gestionale lo segnala), logo,
   colori, coperto e servizio se applicati.
3. **Menu**: import da file o inserimento. Allergeni su ogni piatto —
   sono obbligatori. Conservazione diversa da "fresco" dove serve.
4. **Stripe**: *Impostazioni → Connetti Stripe*. Serve documentazione
   dell'attività e IBAN; la verifica non è immediata.
5. **QR**: da *QR e tavoli*, una locandina A6 per tavolo, pronta per la
   tipografia.
6. **Prenotazioni**, se acquistate: indirizzo che riceve le richieste e
   capienza. Senza capienza la conferma automatica resta disattivabile,
   di proposito.

---

## 8. Documenti

- [`docs/GDPR.md`](docs/GDPR.md) — registro dei trattamenti, misure di
  sicurezza, cosa manca alla conformità
- [`docs/CHECKLIST-LANCIO.md`](docs/CHECKLIST-LANCIO.md) — cosa fare prima
  di far provare il sistema a un ristoratore
- [`docs/Presentazione-ristoratori.pdf`](docs/Presentazione-ristoratori.pdf)
  — spiegazione per chi acquista
