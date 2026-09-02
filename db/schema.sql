-- ============================================================
-- SCHEMA DB — Sistema Prenotazione/Ordine/Pagamento QR ristoranti
-- Target: Neon (Postgres puro). Nessuna RLS/auth.uid() Supabase:
-- ogni accesso passa da codice server-side (Next.js Route Handlers)
-- con connessione privilegiata; l'autorizzazione (chi è staff di
-- quale venue, quale sessione tavolo è valida) è verificata in
-- applicazione, non nel DB. Vedi packages/shared/db.ts.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- UTENTI STAFF (per Auth.js, Credentials provider + JWT session,
-- niente adapter DB: questa tabella è nostra, non di Auth.js)
-- ------------------------------------------------------------

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- TENANCY
-- ------------------------------------------------------------

create table venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) not null,
  name text not null,
  slug text unique not null,             -- usato in URL QR: /v/{slug}/t/{table_code}
  -- White label: il cliente finale deve vedere il marchio del locale.
  -- Il logo è una data URL (limite applicativo 200 KB) per non dipendere
  -- da un object storage esterno; se servono immagini grandi va spostato.
  logo_url text,
  brand_color text,                      -- hex, es. "#b4451f"
  public_phone text,                     -- mostrato al cliente, obbligo trasparenza
  public_email text,
  -- La mancia è opzionale e configurabile: in Italia insistere infastidisce
  -- più di quanto aiuti, a differenza dei mercati anglosassoni.
  tips_enabled boolean default true,
  tip_percents int[] default '{5,10,15}',
  google_review_url text,                -- link "lascia recensione" del profilo Google
  -- Annuncio mostrato al cliente all'apertura del menu: piatto del giorno,
  -- serata a tema, chiusura straordinaria.
  announcement_title text,
  announcement_body text,
  announcement_image_url text,           -- data URL, come il logo (limite 500 KB)
  announcement_cta_label text,
  announcement_cta_url text,             -- solo http/https, validato in scrittura
  announcement_starts_at timestamptz,
  announcement_ends_at timestamptz,      -- senza scadenza un annuncio resta per sempre
  announcement_enabled boolean not null default false,
  announcement_version int not null default 1, -- cambia solo col contenuto: chi lo ha chiuso rivede solo il nuovo
  vat_number text,                       -- p.iva, per fattura elettronica
  fiscal_code text,                      -- codice fiscale, richiesto in FatturaPA CedentePrestatore
  sdi_code text,                         -- codice destinatario SDI
  pec text,
  address text,                          -- via/numero civico
  address_zip text,
  address_city text,
  address_province text,                 -- sigla, es. "MI"
  regime_fiscale text default 'RF01',    -- RF01 = ordinario, cambiare se forfettario/altro
  timezone text default 'Europe/Rome',
  -- Lingue del menu oltre all'italiano, che è sempre la base. Vuoto = nessun
  -- selettore mostrato al cliente, invece di uno che non cambia nulla.
  languages text[] not null default '{}',
  -- Formato del locale: pizzeria e steak house non compilano il menu allo
  -- stesso modo. Serve a proporre categorie, scelte e promemoria giusti.
  venue_type text not null default 'ristorante',
  -- Coperto a persona e servizio sull'ordinato: vanno dichiarati al cliente
  -- insieme ai prezzi (R.D. 635/1940 art. 180), non solo in fondo al conto.
  cover_charge_cents int not null default 0,
  service_percent numeric(4,1) not null default 0,
  cover_charge_label text,
  currency text default 'EUR',
  stripe_account_id text,                -- Stripe Connect account: con cui il LOCALE incassa
  -- Abbonamento alla piattaforma: con cui il locale paga NOI. Flusso opposto
  -- rispetto a stripe_account_id, e webhook distinto.
  billing_customer_id text unique,
  subscription_id text unique,
  subscription_status text not null default 'none'
    check (subscription_status in (
      'none','trialing','active','past_due','canceled','incomplete','unpaid')),
  subscription_plan text,
  subscription_period_end timestamptz,
  subscription_updated_at timestamptz,   -- gli eventi Stripe arrivano fuori ordine
  -- Moduli acquistati: il prodotto si vende a pezzi (solo ordini, solo
  -- prenotazioni, o entrambi). Popolato dal webhook leggendo i metadata
  -- del Price, così il listino resta su Stripe e non nel codice.
  modules text[] not null default '{}',
  trial_ends_at timestamptz,
  -- Mittente email proprio del locale (facoltativo): senza, si usa quello
  -- della piattaforma. Serve a chi vuole le conferme dal proprio dominio.
  resend_api_key text,                   -- cifrata a riposo
  resend_from text,
  satispay_key_id text,                  -- key_id ottenuto da /authentication_keys
  satispay_private_key text,             -- PEM, controparte della chiave pubblica registrata su Satispay
  invoice_provider text default 'invoicetronic', -- provider SDI esterno
  invoice_provider_api_key text,         -- da cifrare a livello applicativo prima di salvare
  invoice_counter int default 0,         -- numerazione progressiva fatture, azzerare a inizio anno
  created_at timestamptz default now()
);

create table venue_staff (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  user_id uuid references users(id) not null,
  role text not null check (role in ('owner','manager','waiter','kitchen')),
  created_at timestamptz default now(),
  unique(venue_id, user_id)
);

-- ------------------------------------------------------------
-- TAVOLI / QR
-- ------------------------------------------------------------

create table tables (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  code text not null,                    -- es. "T12", stampato nel QR
  seats int default 2,
  zone text,                             -- sala/dehors/piano
  qr_token text unique not null default encode(gen_random_bytes(16), 'hex'), -- token non indovinabile in URL
  active boolean default true,
  created_at timestamptz default now(),
  unique(venue_id, code)
);

-- Sessione tavolo: apre quando primo cliente scansiona, chiude a conto saldato
create table table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references tables(id) not null,
  venue_id uuid references venues(id) not null,
  status text not null default 'open' check (status in ('open','billing','closed','cancelled')),
  guest_count int default 1,
  opened_at timestamptz default now(),
  closed_at timestamptz
);

-- Una sola sessione aperta per tavolo: previene lo split ordini quando due
-- scansioni dello stesso QR arrivano quasi simultanee (due ospiti allo stesso tavolo).
create unique index uq_table_open_session on table_sessions (table_id) where status = 'open';

-- ------------------------------------------------------------
-- MENU
-- ------------------------------------------------------------

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  name text not null,
  sort_order int default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  category_id uuid references menu_categories(id),
  name text not null,
  description text,
  price_cents int not null,              -- sempre interi, mai float su denaro
  vat_rate numeric(4,2) not null default 10.00, -- aliquota IVA ristorazione
  image_url text,
  -- Gli allergeni sono obbligatori per legge (Reg. UE 1169/2011): un menu
  -- digitale che non li riporta mette il locale fuori norma.
  allergens text[],
  dietary_tags text[],                   -- vegetariano, vegano, senza_glutine, piccante
  ingredients text,
  -- Come si presenta la voce: una bottiglia non si descrive come un piatto.
  kind text not null default 'food' check (kind in ('food','wine','beer','drink')),
  producer text,                         -- cantina o birrificio
  vintage int,                           -- annata
  denomination text,                     -- DOCG, DOC, IGT, DOP
  origin text,                           -- zona o paese
  abv numeric(4,1),                      -- gradazione
  serving_note text,                     -- temperatura, decantazione
  -- Il congelato va dichiarato (Reg. UE 1169/2011, D.Lgs. 109/1992);
  -- l'abbattuto riguarda il pesce crudo (Reg. CE 853/2004). Ometterlo è
  -- frode in commercio, non una svista di stile.
  conservation text not null default 'fresco'
    check (conservation in ('fresco','congelato','surgelato','abbattuto')),
  origin_note text,                      -- origine, obbligatoria per il bovino
  -- Traduzioni parziali per lingua: {"en": {"name": ..., "description": ...}}.
  -- Un campo non tradotto ricade sull'italiano invece di sparire.
  translations jsonb not null default '{}'::jsonb,
  pairing_item_id uuid references menu_items(id) on delete set null, -- abbinamento suggerito (anche upselling)
  available boolean default true,
  sort_order int default 0
);

-- ------------------------------------------------------------
-- ORDINI
-- ------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) not null,
  table_session_id uuid references table_sessions(id) not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','served','cancelled')),
  guest_label text,                      -- "Mario", "Posto 3" — per split per persona
  notes text,
  created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  menu_item_id uuid references menu_items(id) not null,
  quantity int not null default 1,
  unit_price_cents int not null,         -- snapshot prezzo al momento ordine
  notes text,                            -- "senza cipolla"
  status text not null default 'pending'
    check (status in ('pending','sent_to_kitchen','preparing','ready','served','cancelled')),
  -- Varianti scelte dal cliente. Restano scritte qui: il menu cambia, la
  -- comanda già passata in cucina no. unit_price_cents comprende già i
  -- supplementi, così i totali storici non vanno ricalcolati.
  selected_options jsonb not null default '[]'::jsonb
);

-- ------------------------------------------------------------
-- PRENOTAZIONI
-- ------------------------------------------------------------

create table reservations (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) not null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  party_size int not null,
  reserved_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed','seated','no_show','cancelled')),
  deposit_amount_cents int default 0,
  deposit_payment_id uuid,               -- fk a payments, aggiunta dopo
  table_id uuid references tables(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- PAGAMENTI
-- ------------------------------------------------------------

create table payments (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) not null,
  table_session_id uuid references table_sessions(id),
  reservation_id uuid references reservations(id),
  amount_cents int not null,
  tip_cents int default 0,
  currency text default 'EUR',
  method text not null check (method in ('card','apple_pay','google_pay','satispay','cash')),
  provider text not null default 'stripe' check (provider in ('stripe','satispay','manual')), -- 'manual' = incassato al banco
  provider_payment_id text,              -- id transazione lato Stripe/Satispay
  split_type text check (split_type in ('full','per_person','per_item','custom')),
  status text not null default 'pending'
    check (status in ('pending','succeeded','failed','refunded')),
  paid_by_label text,                    -- chi ha pagato in uno split
  created_at timestamptz default now()
);

-- Un solo pagamento a saldo pieno pending per sessione: previene due
-- PaymentIntent paralleli da doppio tap sul bottone Paga. Limitato a
-- split_type='full' perché con lo split più commensali pagano davvero in
-- contemporanea; lì la protezione è il lock sulle righe in payment_order_items.
create unique index uq_session_pending_full_payment
  on payments (table_session_id) where status = 'pending' and split_type = 'full';

alter table reservations
  add constraint fk_deposit_payment
  foreign key (deposit_payment_id) references payments(id);

-- Collega quali order_items sono coperti da quale pagamento (split per piatto)
create table payment_order_items (
  payment_id uuid references payments(id) on delete cascade not null,
  order_item_id uuid references order_items(id) not null,
  amount_cents int not null,
  primary key (payment_id, order_item_id)
);

create index idx_payment_order_items_item on payment_order_items (order_item_id);

-- ------------------------------------------------------------
-- FATTURAZIONE ELETTRONICA (via provider esterno, no nodo SDI proprio)
-- ------------------------------------------------------------

create table invoices (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) not null,
  payment_id uuid references payments(id) not null unique, -- 1 fattura per pagamento: previene doppia trasmissione SDI
  invoice_number int,                    -- progressivo usato nell'XML, per retry coerenti
  customer_fiscal_code text,
  customer_vat_number text,
  customer_sdi_code text,
  customer_pec text,
  xml_url text,                          -- copia XML conservata (storage)
  provider_invoice_id text,              -- id lato Invoicetronic/OpenAPI
  status text not null default 'pending'
    check (status in ('pending','sent','delivered','rejected')),
  sdi_identifier text,                   -- identificativo SDI di ricezione
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- INDICI
-- ------------------------------------------------------------

create index idx_venue_staff_user on venue_staff(user_id);
create index idx_tables_venue on tables(venue_id);
create index idx_menu_items_venue on menu_items(venue_id);
create index idx_orders_session on orders(table_session_id);
create index idx_order_items_order on order_items(order_id);
create index idx_payments_session on payments(table_session_id);
create index idx_reservations_venue_date on reservations(venue_id, reserved_at);

-- ------------------------------------------------------------
-- RATE LIMITING (DB-backed: serverless/Vercel non ha memoria condivisa
-- tra istanze, quindi un limiter in-process non funzionerebbe)
-- ------------------------------------------------------------

create table rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);
