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
  currency text default 'EUR',
  stripe_account_id text,                -- Stripe Connect account
  satispay_shop_id text,                 -- opzionale
  invoice_provider text default 'invoicetronic', -- provider SDI esterno
  invoice_provider_api_key text,         -- da cifrare a livello applicativo prima di salvare
  invoice_counter int default 0,         -- numerazione progressiva fatture, azzerare a inizio anno
  subscription_plan text default 'starter', -- starter/pro/enterprise
  subscription_status text default 'trialing',
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
  allergens text[],                      -- array allergeni
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
    check (status in ('pending','sent_to_kitchen','preparing','ready','served','cancelled'))
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
  method text not null check (method in ('card','apple_pay','google_pay','satispay')),
  provider text not null default 'stripe' check (provider in ('stripe','satispay')),
  provider_payment_id text,              -- id transazione lato Stripe/Satispay
  split_type text check (split_type in ('full','per_person','per_item','custom')),
  status text not null default 'pending'
    check (status in ('pending','succeeded','failed','refunded')),
  paid_by_label text,                    -- chi ha pagato in uno split
  created_at timestamptz default now()
);

-- Un solo pagamento pending per sessione: previene due PaymentIntent
-- Stripe paralleli da doppio tap sul bottone Paga.
create unique index uq_session_pending_payment on payments (table_session_id) where status = 'pending';

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
