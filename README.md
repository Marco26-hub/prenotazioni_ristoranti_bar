# Sistema prenotazione, ordine e pagamento al tavolo via QR

Monorepo con due app Next.js e un pacchetto condiviso:

| Cartella | Cosa fa |
|---|---|
| `apps/guest` | App cliente (PWA): scansiona QR → menu → ordine → pagamento → fattura |
| `apps/dashboard` | Backoffice staff: tavoli+QR, menu, ordini live, prenotazioni, impostazioni |
| `packages/shared` | Client Postgres, tipi, rate limiting, client Satispay |
| `db/` | `schema.sql` (schema completo) e `seed.sql` (dati demo) |

## Stack

- **Next.js 16** (App Router, Server Actions, `proxy.ts` per la protezione route)
- **Postgres** via `postgres.js` — funziona identico su **Neon** o **Supabase**: nessun SDK proprietario, basta cambiare `DATABASE_URL`
- **Auth.js** (Credentials + JWT) per lo staff
- **Stripe Connect** (carte, Apple/Google Pay) e **Satispay** come rail di pagamento
- **Invoicetronic** come intermediario accreditato SDI per la fattura elettronica

## Setup locale

```bash
pnpm install
```

Crea `apps/guest/.env.local` e `apps/dashboard/.env.local` copiando i rispettivi `.env.example` e compilando i valori (vedi sotto).

Applica lo schema al database:

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

Avvia:

```bash
pnpm --filter guest dev -- --port 3010
pnpm --filter dashboard dev -- --port 3011
```

Utente demo dashboard: `demo@ristorante.test` / `demo1234`
Pagina tavolo demo: `http://localhost:3010/v/trattoria-demo/t/demo-qr-token-t1`

## Variabili d'ambiente

**Entrambe le app**
- `DATABASE_URL` — connection string Postgres (Neon o Supabase), con `sslmode=require`

**`apps/guest`**
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — chiavi piattaforma Stripe
- `STRIPE_WEBHOOK_SECRET` — dal webhook Stripe, che deve essere registrato come **Connect webhook** (gli eventi arrivano dagli account collegati dei locali, non dalla piattaforma)
- `SATISPAY_ENV` — `staging` per la sandbox, altrimenti produzione

**`apps/dashboard`**
- `AUTH_SECRET` — `openssl rand -base64 32`
- `STRIPE_SECRET_KEY` — serve per creare gli account Connect dei locali
- `APP_URL` — URL pubblico della dashboard (redirect di ritorno da Stripe)
- `GUEST_APP_URL` — URL pubblico dell'app guest (per generare i QR dei tavoli)

## Deploy (Vercel)

Il monorepo richiede **due progetti Vercel separati**, entrambi collegati a questo repo:

1. Progetto guest → **Root Directory** `apps/guest`
2. Progetto dashboard → **Root Directory** `apps/dashboard`

Per ciascuno: Settings → Environment Variables, inserisci le variabili elencate sopra. Poi imposta `APP_URL`/`GUEST_APP_URL` con i domini reali assegnati.

Dopo il primo deploy, registra il webhook Stripe (`https://<guest>/api/webhooks/stripe`, tipo **Connect**) e copia il signing secret in `STRIPE_WEBHOOK_SECRET`.

## Note su fisco e pagamenti

- La fattura elettronica passa da **Invoicetronic** (intermediario accreditato SDI): non gestiamo un nodo SDI proprio. Ogni locale inserisce la propria API key in Impostazioni.
- Il builder FatturaPA (`apps/guest/src/lib/invoice/fatturapa.ts`) copre il caso standard TD01 (vendita a privato o azienda, prezzi IVA inclusa). **Numerazione, regime fiscale e casistiche particolari vanno validate con un commercialista prima dell'uso reale.**
- Stripe e Satispay richiedono che sia il **titolare reale del locale** a completare KYC e attivazione dai rispettivi portali: il sistema genera le credenziali tecniche, non sostituisce quella verifica.
