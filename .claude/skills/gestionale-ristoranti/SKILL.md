---
name: gestionale-ristoranti
description: Come lavorare sul gestionale QR per ristoranti e bar in questa cartella — comandi, convenzioni e le trappole che sono già costate soldi o lavoro. Usala SEMPRE prima di toccare questo codice, anche per una modifica che sembra piccola: molte delle regole qui dentro non si deducono leggendo i file, e due di esse hanno già mandato in produzione conti sbagliati. Serve anche solo per orientarsi, per capire cosa è già in produzione e cosa manca, o per riprendere il progetto dopo una pausa.
---

# Gestionale ristoranti e bar

Prodotto white-label per ristoranti italiani: il cliente inquadra un QR al
tavolo, legge il menu, ordina, paga; il locale ha un gestionale con comande,
sala, prenotazioni, fatturazione e registratore telematico.

**È in produzione e ci sono clienti veri.** Ogni cosa che tocchi può
cambiare un conto che qualcuno paga stasera.

| | |
|---|---|
| Codice | monorepo pnpm, Next.js 16 App Router, Postgres su Neon, Auth.js v5 |
| `apps/guest` | ciò che vede il cliente al tavolo (pubblico, niente login) |
| `apps/dashboard` | il gestionale e il pannello di piattaforma (`/admin`) |
| `packages/shared` | tutto ciò che le due app condividono, con export per sottopercorso |
| Lingua | codice e commenti in **italiano**; interfaccia in italiano **e inglese** |

## I primi cinque minuti

Orientati prima di scrivere. Il contesto lungo sta in `HANDOFF.md`, che è il
diario del progetto: la parte di riferimento (sezioni 1-9) descrive com'è
fatto, le sezioni datate in fondo raccontano cosa è cambiato e **perché**.
Parti dall'ultima.

```bash
git log --oneline -15          # cos'è successo di recente
sed -n '1,60p' HANDOFF.md      # indice delle sessioni
ls docs/                       # go-live, lingue, regione, GDPR
```

Le variabili d'ambiente stanno in `apps/*/.env.local` (mai committati) e su
Vercel. Per i comandi che parlano col database:

```bash
DATABASE_URL="$(grep -m1 '^DATABASE_URL=' apps/dashboard/.env.local | cut -d= -f2- | tr -d '"')" <comando>
```

## Le regole che costano, quando si violano

Ognuna di queste è già costata lavoro o soldi. Non sono preferenze di stile.

### Il conto si calcola in un posto solo

`packages/shared/conto.ts`. Lo leggono la sala, il telefono del cliente, la
cassa e il documento fiscale.

Quando l'aritmetica era scritta in quattro posti, la sala mostrava 168 € e la
cassa ne registrava 64. **Se ti viene da calcolare un totale altrove, stai per
rifare quel bug.** Passa il conto già calcolato, o chiama `contoSessione`.

### Dopo ogni modifica allo schema, `node db/confronta.mjs`

Applica `schema.sql` più tutte le migrazioni in uno schema temporaneo e lo
confronta con la produzione: **colonne, indici e vincoli**.

Due volte è stato dimenticato, e tutte e due le volte il problema non erano le
colonne ma un CHECK vecchio: un'installazione pulita rifiutava ogni
prenotazione, e più tardi ogni reparto nuovo. Si vede solo al primo cliente
installato da zero.

Va lanciato **dopo** la modifica, non prima. Esito pulito = tre righe
«IDENTICI».

### Ogni Server Action e ogni rotta API è un POST pubblico

Chi conosce l'id la chiama. Il controllo va **nella rotta**, non nel bottone:
nascondere un pulsante non protegge niente.

C'è un esempio vivo da imitare: il pagamento con carta di un tavolo a prezzo
fisso è rifiutato con 409 **dentro** `create-intent` e `create-satispay`, non
solo nascondendo il tasto.

### L'inglese è tipato sull'italiano

I dizionari stanno in `packages/shared/i18n/` (comune, email) e in
`apps/*/src/i18n/` (per area). Ognuno è `const IT = {...}` più
`const EN: Speculare<typeof IT> = {...}`: **una chiave dimenticata non
compila**. È un tipo e non un controllo a runtime apposta — deve rompere la
build, non comparire in italiano dentro una frase inglese davanti al cliente.

Non aggirarlo con `as`. Se serve una voce comune, aggiungila al dizionario
della tua area invece di toccare `comune.ts`, che usano tutti.

**I commenti restano in italiano.** Sono per chi scrive il codice.

**I termini fiscali italiani non si traducono**: Partita IVA, Codice
Destinatario, SDI, documento commerciale, corrispettivi, Registratore
Telematico. Sono nomi di istituti e di portali reali: tradurli manda un
commercialista a cercare una voce che sul sito dell'Agenzia non esiste. In
inglese si lasciano, con la spiegazione fra parentesi la prima volta.

Dettagli in `docs/LINGUE.md`.

### Una risposta JSON ricopiata a mano è un tipo che non esiste

`NextResponse.json()` accetta qualunque oggetto, quindi il compilatore non
protegge niente. Ricopiando i campi uno a uno, un campo nuovo sparisce in
silenzio — è successo con `copertiDaConfermare`: il conto sapeva che i coperti
non erano dichiarati e la pagina mostrava comunque il totale di una persona
sola.

Dove il consumatore deve restare in pari con la sorgente, **manda l'oggetto e
importa il tipo**. `formulaDaConto` in `apps/guest/src/lib/balance.ts` è il
modello da copiare.

### Misura dove il codice gira, non dove lo scrivi

Una correzione che toglieva nove query per richiesta, misurata in locale,
sembrava valere zero: 330 ms prima, 325 dopo. Dove gira davvero valeva 650 ms,
perché lì un giro al database costa settanta millisecondi e non due.

Da questo è venuta la riga più redditizia del progetto — `"regions": ["fra1"]`
in `apps/*/vercel.json`, che ha portato il conto da 1450 ms a 140. Se una
modifica riguarda il **numero di query**, va misurata in produzione o non è
stata misurata. La storia sta in `docs/REGIONE.md`.

### Non dichiarare fatto quello che non hai visto funzionare

Vale per te come valeva per chi è venuto prima. Compilare non è funzionare, e
un ragionamento non è una misura. Se non l'hai eseguito, dillo.

## Come si prova

Un centinaio di test end-to-end, che girano contro un database vero creando
un locale isolato per test e cancellandolo alla fine. Per sapere quanti sono
adesso — il numero cresce, scriverlo qui lo farebbe invecchiare:

```bash
grep -h '^test(' e2e/*.spec.ts | wc -l
```

```bash
pnpm build                      # entrambe le app
pnpm --filter dashboard exec tsc --noEmit
pnpm --filter guest exec tsc --noEmit
pnpm --filter dashboard exec eslint src
```

**I test puntano al locale**, non alla produzione: `localhost:3010` (guest) e
`localhost:3011` (dashboard), e non c'è nessun `webServer` che li avvii. Senza
server accesi si raccolgono un centinaio di fallimenti di connessione che
sembrano un codice rotto.

```bash
# i due server, con gli stessi comandi che usa il rilascio
(cd apps/guest && pnpm exec next start -p 3010 &)
(cd apps/dashboard && AUTH_TRUST_HOST=true NEXTAUTH_URL=http://localhost:3011 \
   pnpm exec next start -p 3011 &)

DATABASE_URL="…" npx playwright test
```

Contro la produzione:

```bash
DATABASE_URL="…" \
E2E_GUEST_URL=https://ristoranti-guest.vercel.app \
E2E_DASHBOARD_URL=https://ristoranti-dashboard.vercel.app \
npx playwright test
```

Due cose della configurazione che sembrano dettagli e non lo sono:

- **`locale: "it-IT"` è fissato.** Playwright lancia il suo Chromium in
  inglese a prescindere dal computer, e da quando l'interfaccia parla due
  lingue le prove scritte contro l'italiano cercavano parole che la pagina non
  scriveva più. Chi prova il cambio di lingua si apre il suo contesto
  (`browser.newContext({ locale: "en-GB" })`), come fa `e2e/lingue.spec.ts`.
- **`expect` ha quindici secondi**, non i cinque di partenza. Queste
  asserzioni aspettano un giro di rete più un ciclo di aggiornamento: contro
  la produzione cinque non bastano. Un rosso che dipende da dove lo lanci
  insegna a rilanciare invece che a guardare.

I test creano locali con slug `e2e-*`, nome «E2E Test Venue» ed email
`@test.local`. **La pulizia tocca solo quelli**: i locali dimostrativi
(`trattoria-da-luca`, `trattoria-demo`) servono come cicli d'esempio e non si
cancellano.

## Il database

```bash
DATABASE_URL="…" node db/migrate.mjs      # applica le migrazioni mancanti
DATABASE_URL="…" node db/confronta.mjs    # colonne, indici e vincoli
```

Una migrazione nuova va in `db/migrations/NNN_nome.sql` **e** riportata a mano
in `db/schema.sql`, che è l'installazione pulita. Sono due descrizioni dello
stesso database e divergono in silenzio: per questo esiste `confronta.mjs`.

`postgres.js` con `prepare: false`, perché la connessione passa dal pooler in
modalità transazione.

## Il repository è pubblico

`github.com/Marco26-hub/prenotazioni_ristoranti_bar`, e resta tale finché il
lavoro è in corso.

**Nessuna password, nessuna chiave, nessun segreto nei file committati.** Un
segreto finito lì per sbaglio va considerato bruciato e ruotato, non solo
rimosso. Prima di un commit vale la pena una scorsa:

```bash
git diff | grep -inE "sk_(live|test)_|whsec_|re_[A-Za-z0-9]{12,}|postgres(ql)?://[^ ]*:[^@ ]*@"
```

Gli unici `.env` tracciati sono i due `.env.example`, che contengono nomi di
variabili e mai valori.

## Variabili che, mancando, non danno errore

- **`ENCRYPTION_KEY`** non degrada: **lancia**. È la chiave con cui sono
  cifrati tutti i segreti dei locali, quindi senza saltano Satispay, la
  fattura elettronica e ogni salvataggio in Impostazioni. Dev'essere la
  **stessa** sulle due app.
- **`APP_URL`** (dashboard) ripiega in silenzio su `localhost:3011` anche in
  produzione, e finisce negli indirizzi di ritorno di Stripe Connect.
- **`GUEST_APP_URL`** (dashboard) serve anche in locale: senza, la pagina QR
  si rifiuta di generare codici — ed è l'unica delle tre che si difende.

## Cosa manca, e non è codice

Da verificare prima di prometterlo a qualcuno, perché cambia:

```bash
npx vercel env ls production          # dentro una cartella collegata al progetto
```

Alla fine della sessione del 6 settembre 2026 mancavano: le **chiavi Stripe in
Live** (in test: chi paga al tavolo non muove un euro e il conto risulta
saldato lo stesso) e **`RESEND_API_KEY`** su entrambi i progetti (nessuna
email parte — né conferma, né promemoria, né copia fattura). I passi stanno in
`docs/GO-LIVE.md`.

Il **registratore telematico** è cablato da un capo all'altro, ma i tracciati
XML (Epson, Custom, RCH) non hanno mai toccato una stampante vera. In vendita
va detto che il locale continua a battere sulla propria cassa.

## La commissione di piattaforma

`venues.commissione_percent`, impostabile per locale dal pannello `/admin`.
**Parte da zero**, e c'è una ragione: finché il prodotto scrive al ristoratore
che non tratteniamo nulla sul suo incassato, quella frase deve essere vera.

Prima era una costante `0.015` marcata «provvisorio», mentre la pagina
Abbonamento diceva il contrario. Se la tocchi, **la pagina Abbonamento e la
vetrina devono restare d'accordo col codice**: a zero dicono una cosa, sopra
zero ne dicono un'altra, e sopra zero devono dire anche come si chiamerà sullo
estratto conto Stripe («application fee»).

E la paga il **ristoratore**, non il cliente al tavolo: si calcola *da*
l'importo, non si aggiunge *a* l'importo. C'è un test che lo difende.

## La lente che trova i difetti veri

I difetti più costosi di questo prodotto non si vedono leggendo il codice in
astratto: si vedono mettendolo contro **un locale preciso**. Quello che ha
funzionato è un all you can eat di sushi — quaranta coperti, due turni,
ottanta piatti a tavolo, banco del crudo e cucina come postazioni separate,
prezzo fisso a persona.

Contro quel profilo sono usciti difetti che una trattoria da venti coperti non
mostra mai: la stampa comande che accumulava per sempre perché nessuno segna
«servito» ottanta volte, le bevande importate da CSV che risultavano comprese
nel prezzo fisso, il conto che partiva da un coperto solo.

Quando devi giudicare se qualcosa è un problema, **scegli un locale e provaci
contro**. «Sembra lento» non è un reperto; «con quaranta coperti e venti
telefoni diventa N richieste al minuto» lo è.
