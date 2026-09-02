# Handoff — sistema QR ordini/pagamenti ristoranti

Stato al 2 settembre 2026. Destinatario: **peewe75**.

## In produzione adesso

| | URL |
|---|---|
| App clienti (QR al tavolo) | https://ristoranti-guest.vercel.app |
| Dashboard staff | https://ristoranti-dashboard.vercel.app |
| Repo | https://github.com/Marco26-hub/prenotazioni_ristoranti_bar |

Database: **Neon** (progetto `prenotazioni`, regione eu-central-1). Un solo database condiviso tra le due app e tra locali (multi-tenant per `venue_id`).

Deploy: due progetti Vercel (`ristoranti-guest` root `apps/guest`, `ristoranti-dashboard` root `apps/dashboard`), entrambi collegati a `main` — **ogni push in main va in produzione**.

### Account esistenti

- **Trattoria da Luca** (locale reale): owner `softipost@gmail.com` — 10 tavoli con QR, 5 categorie menu da riempire.
- **Trattoria Demo** (dati di prova, cancellabile): `demo@ristorante.test`.

⚠️ **Le password non vanno scritte qui: questo repo è pubblico.** Vanno passate a voce o via canale privato. Una password committata per errore va considerata bruciata e ruotata, perché resta nella storia git anche dopo la rimozione.

Non esiste ancora recupero password: per cambiarne una si aggiorna `users.password_hash` con un hash bcrypt.

## Cosa funziona, verificato end-to-end in produzione

Suite Playwright: `pnpm test:e2e` — 20/20 verdi.

- Cliente: scansiona QR → menu → carrello → ordine → conto aggiornato
- Cucina: board ordini live (polling 4s), avanzamento stato persistito
- Staff: login, ruoli (owner/manager/waiter/kitchen), rotte protette
- Tavoli: creazione, QR generati e scaricabili in PNG, puntano al dominio live
- Menu: CRUD categorie e piatti
- Prenotazioni: creazione e annullamento
- Pagine privacy/termini (bozze)
- White label: logo, colore e contatti del locale nella pagina cliente
- Cambio password dall'app, registrazione self-service, stampa comande
- Rigenerazione QR che invalida davvero i codici già stampati
- Chiusura conto al banco (senza, un tavolo che paga in contanti resta aperto per sempre)
- Note sul piatto ("senza glutine"), fino alla comanda stampata
- Import menu da Excel/CSV/TSV, foto piatto, calendario prenotazioni, storico ordini
- Mance in percentuale (configurabili, disattivabili) e recensione Google post-pagamento
- Menu pubblico indicizzabile `/m/{slug}` con dati strutturati Schema.org

## Cosa NON funziona ancora (e perché)

**Pagamenti — codice completo, credenziali mancanti.**
Stripe Connect (carte/Apple Pay/Google Pay) e Satispay sono implementati per intero: checkout, webhook, onboarding dei locali. Mancano solo le chiavi:
- Env da impostare su `ristoranti-guest`: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Env da impostare su `ristoranti-dashboard`: `STRIPE_SECRET_KEY`
- Il webhook Stripe va registrato su `https://ristoranti-guest.vercel.app/api/webhooks/stripe` **come Connect webhook** (gli eventi arrivano dagli account collegati dei locali, non dalla piattaforma). Senza, un pagamento riuscito non chiude mai il conto.
- Ogni locale poi fa il proprio onboarding da Impostazioni → Connetti Stripe (KYC su pagina Stripe, non istantaneo) e/o Connetti Satispay (codice attivazione dalla loro dashboard).

**Integrazione Tilby — codice completo, accesso API mancante.**
Collegamento cassa e import menu sono scritti secondo la documentazione ufficiale (`api.tilby.com/v2`, bearer token per negozio, `/sessions/me` per verificare). **Mai provata contro una cassa reale:** Tilby rilascia i token solo tramite Developer Program, con domanda soggetta ad approvazione, quota di attivazione e canone mensile. È una decisione commerciale, non tecnica.

**Fatturazione elettronica — codice completo, account mancante.**
Builder FatturaPA + invio via Invoicetronic (intermediario accreditato SDI) sono scritti e integrati. Serve che ogni locale apra un account Invoicetronic e incolli la sua API key in Impostazioni, oltre a compilare i dati fiscali (P.IVA, CF, regime, indirizzo).
⚠️ **Il tracciato copre il caso standard TD01 (vendita a privato/azienda, prezzi IVA inclusa). Numerazione progressiva, regime fiscale e casi particolari vanno validati da un commercialista prima dell'uso reale** — sono documenti fiscali, non solo JSON.

## Debito tecnico ancora aperto

0. **Logo e foto piatto sono data URL nel DB** (200 KB e 300 KB). Funziona, ma con molti locali conviene spostarlo su object storage e tenere in colonna solo l'URL.
1. **Staff multi-locale**: si opera sempre su `session.venues[0]`, non c'è selettore del locale in UI. L'ordine è deterministico (`order by vs.created_at`) ma chi lavora in due locali non può scegliere.
2. **Nessun logging strutturato / observability.** Ci sono `console.error` sui rami critici (webhook, fatture, signup), ma niente Sentry né alert in produzione.
3. **Stampa comande ESC/POS**: non implementata. Si stampa dal dialogo del browser, che funziona con qualsiasi stampante già in cucina.
3b. **Nessun controllo di capienza sulle prenotazioni**: si possono prenotare più coperti dei posti disponibili.
3c. **Nessuna prenotazione online per il cliente**: prenota per telefono, lo staff inserisce a mano.
3d. **Mancano fidelizzazione, upselling e analytics di conversione** — i concorrenti li hanno.
4. **Satispay non supporta lo split**: paga solo l'intero conto. Con carta lo split per piatto funziona.
5. **`ENCRYPTION_KEY` non ha rotazione.** Il formato dei segreti cifrati è versionato (`v1:`) proprio per permetterla, ma la procedura non esiste ancora.
6. **Recupero password via email**: non implementato (manca un provider email). Chi è dentro può però cambiarsi la password da Impostazioni; chi l'ha dimenticata va sbloccato aggiornando `users.password_hash`.

## Debito già chiuso (per contesto)

- Segreti dei locali cifrati a riposo (AES-256-GCM, `packages/shared/crypto.ts`)
- Sessioni staff rivalidate contro il DB ogni 5 minuti, scadenza 12h
- Pulizia opportunistica di `rate_limits`
- Split conto per piatto (con lock transazionale sulle righe)
- Modifica tavolo, rigenerazione QR, eliminazione con degrado a disattivazione
- Signup self-service dei locali (`/registrati`, con rate limit)
- Migrazioni versionate (`pnpm db:migrate`, `db/migrations/`)
- Redesign mobile-first di entrambe le app, palette condivisa
- Cambio password in autonomia, stampa comande via dialogo di stampa del browser

## Architettura in breve

Monorepo pnpm. `packages/shared` espone subpath separati per non far finire codice server nel bundle browser:
- `@repo/shared` → tipi e util pure (client-safe)
- `@repo/shared/db` → client Postgres (`postgres.js`)
- `@repo/shared/rate-limit` → rate limiting DB-backed (serverless: niente memoria condivisa)
- `@repo/shared/satispay` → firma RSA richieste + client

Scelte non ovvie, con il perché:
- **Nessun SDK proprietario per il DB** (niente `@supabase/supabase-js` né driver Neon): solo SQL su `DATABASE_URL`, così Neon e Supabase sono intercambiabili.
- **`prepare: false`** sul client Postgres: i pooler di Neon e Supabase girano in transaction mode e non reggono i prepared statement persistenti.
- **Firma Satispay scritta a mano** su `node:crypto`: non esiste SDK Node ufficiale e le librerie community hanno adozione trascurabile — troppo rischioso per firmare richieste di pagamento.
- **Autorizzazione in applicazione, non RLS**: ogni accesso passa da codice server-side; le Server Action riverificano sempre venue e ruolo (`requireVenue` / `requireRole` in `apps/dashboard/src/lib/authz.ts`).
- **Vincoli unique parziali** su `table_sessions` (una sessione aperta per tavolo), `payments` (un pending per sessione) e `invoices.payment_id`: prevengono a livello DB doppie sessioni da scansioni simultanee, doppi addebiti da doppio tap, e doppia trasmissione della stessa fattura a SDI.

## Comandi

```bash
pnpm install
pnpm --filter guest dev -- --port 3010
pnpm --filter dashboard dev -- --port 3011
pnpm test:e2e     # locale; per la produzione vedi playwright.config.ts
pnpm -r build
pnpm -r lint
```

Materiale commerciale: `docs/Presentazione-ristoratori.pdf` (rigenerabile, lo script è nello scratchpad di sessione).

Schema e dati demo: `db/schema.sql`, `db/seed.sql`. Le migrazioni ora sono versionate in `db/migrations/` e si applicano con `pnpm db:migrate` (idempotente, registra in `schema_migrations`). `db/schema.sql` resta la fonte di verità per installazioni da zero.
