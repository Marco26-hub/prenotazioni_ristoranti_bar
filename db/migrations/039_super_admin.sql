-- Il super amministratore della piattaforma: chi vende il servizio.
--
-- E' una persona diversa dal titolare di un locale. Il titolare amministra il
-- suo locale; il super admin vede tutti i locali e decide chi ha comprato
-- cosa. Non e' un ruolo dentro venue_staff, perche' non appartiene a nessun
-- locale: sta un livello sopra.
--
-- Il cambio password obbligatorio al primo accesso non e' burocrazia: la
-- prima password di un account così la si comunica per forza in chiaro da
-- qualche parte — a voce, in chat, in un messaggio — e da quel momento non e'
-- piu' un segreto. Deve valere per un accesso solo.

alter table users
  add column if not exists is_super_admin boolean not null default false,
  add column if not exists must_change_password boolean not null default false;

-- Le attivazioni fatte a mano dal super admin lasciano traccia: quando un
-- locale contesta la fattura o l'accesso a un modulo, serve sapere chi
-- gliel'ha dato e quando.
create table if not exists platform_events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  admin_id uuid references users(id) on delete set null,
  admin_label text not null,
  azione text not null,
  dettaglio text,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_events_venue
  on platform_events (venue_id, created_at desc);
