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

### Credenziali già create

- **Trattoria da Luca** (locale reale): login `softipost@gmail.com`, password `LBfW6B7FU+JN9EJS` — 10 tavoli con QR, 5 categorie menu vuote. **Cambiare la password al primo accesso** (non c'è ancora una UI: va fatto aggiornando `users.password_hash` con un hash bcrypt).
- **Trattoria Demo** (dati di prova, cancellabile): `demo@ristorante.test` / `demo1234`.

## Cosa funziona, verificato end-to-end in produzione

Suite Playwright: `pnpm test:e2e` — 12/12 verdi contro produzione.

- Cliente: scansiona QR → menu → carrello → ordine → conto aggiornato
- Cucina: board ordini live (polling 4s), avanzamento stato persistito
- Staff: login, ruoli (owner/manager/waiter/kitchen), rotte protette
- Tavoli: creazione, QR generati e scaricabili in PNG, puntano al dominio live
- Menu: CRUD categorie e piatti
- Prenotazioni: creazione e annullamento
- Pagine privacy/termini (bozze)

## Cosa NON funziona ancora (e perché)

**Pagamenti — codice completo, credenziali mancanti.**
Stripe Connect (carte/Apple Pay/Google Pay) e Satispay sono implementati per intero: checkout, webhook, onboarding dei locali. Mancano solo le chiavi:
- Env da impostare su `ristoranti-guest`: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Env da impostare su `ristoranti-dashboard`: `STRIPE_SECRET_KEY`
- Il webhook Stripe va registrato su `https://ristoranti-guest.vercel.app/api/webhooks/stripe` **come Connect webhook** (gli eventi arrivano dagli account collegati dei locali, non dalla piattaforma). Senza, un pagamento riuscito non chiude mai il conto.
- Ogni locale poi fa il proprio onboarding da Impostazioni → Connetti Stripe (KYC su pagina Stripe, non istantaneo) e/o Connetti Satispay (codice attivazione dalla loro dashboard).

**Fatturazione elettronica — codice completo, account mancante.**
Builder FatturaPA + invio via Invoicetronic (intermediario accreditato SDI) sono scritti e integrati. Serve che ogni locale apra un account Invoicetronic e incolli la sua API key in Impostazioni, oltre a compilare i dati fiscali (P.IVA, CF, regime, indirizzo).
⚠️ **Il tracciato copre il caso standard TD01 (vendita a privato/azienda, prezzi IVA inclusa). Numerazione progressiva, regime fiscale e casi particolari vanno validati da un commercialista prima dell'uso reale** — sono documenti fiscali, non solo JSON.

## Debito tecnico noto (da audit, non ancora risolto)

1. **Sessione JWT non rivalidata contro il DB.** Uno staff rimosso da `venue_staff` resta operativo finché il token non scade (default 30 giorni). Serve un check server-side o `maxAge` più corto.
2. **Staff multi-locale**: si opera sempre su `session.venues[0]`, non c'è selettore del locale in UI. L'ordine è deterministico (`order by created_at`) ma se un utente lavora in due locali non può scegliere.
3. **Nessun signup self-service**: i locali si creano solo via SQL. Per il secondo cliente serve una UI di onboarding.
4. **Nessun logging strutturato / observability.** Ci sono `console.error` solo sui rami critici (webhook, fatture). In produzione non c'è Sentry né alert.
5. **`rate_limits`** cresce senza pulizia — va aggiunto un job che cancella le righe con `window_start` vecchio.
6. **Split conto per persona/piatto**: schema pronto (`payment_order_items`), UI e logica non implementate. Oggi si paga solo a saldo pieno.
7. **Stampa comande ESC/POS**: non implementata. La cucina usa la board a schermo.
8. **Modifica tavolo** (rinomina/posti) e rigenerazione QR: non implementate, solo creazione e attiva/disattiva.
9. **`satispay_private_key` e `invoice_provider_api_key` sono in chiaro nel DB.** Vanno cifrate a livello applicativo prima di avere clienti veri.

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

Schema e dati demo: `db/schema.sql`, `db/seed.sql`. Le migrazioni finora sono state applicate a mano sul DB Neon — **non esiste ancora un sistema di migrazioni versionate**, `schema.sql` è la fonte di verità per installazioni nuove.
