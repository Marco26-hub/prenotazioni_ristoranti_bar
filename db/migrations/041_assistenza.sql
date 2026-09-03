-- Richieste di assistenza dai locali.
--
-- Oggi un locale che ha un problema scrive su WhatsApp, e la richiesta vive
-- nel telefono di chi l'ha ricevuta: non si sa quante ne arrivano, quali
-- restano aperte, ne' quali locali stanno soffrendo. Un cliente che chiede
-- aiuto tre volte in una settimana sta per disdire, ed e' un dato che si
-- vede solo se le richieste stanno tutte nello stesso posto.

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  -- Chi ha scritto, dal lato del locale.
  aperto_da uuid references users(id) on delete set null,
  aperto_da_label text not null,
  oggetto text not null,
  messaggio text not null,
  urgenza text not null default 'normale'
    check (urgenza in ('normale', 'blocca_servizio')),
  stato text not null default 'aperto'
    check (stato in ('aperto', 'in_corso', 'risolto')),
  risposta text,
  -- Chi ha risposto, dal lato piattaforma.
  gestito_da uuid references users(id) on delete set null,
  gestito_da_label text,
  created_at timestamptz not null default now(),
  risolto_at timestamptz
);

create index if not exists idx_ticket_aperti
  on support_tickets (stato, created_at desc);

create index if not exists idx_ticket_venue
  on support_tickets (venue_id, created_at desc);
