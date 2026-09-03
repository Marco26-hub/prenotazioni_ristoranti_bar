-- I dispositivi in servizio: gli schermi accesi nel locale.
--
-- Il reparto di uno schermo viveva solo nel suo localStorage: nessuno, dalla
-- dashboard, poteva sapere quanti monitor fossero accesi né su cosa fossero
-- impostati. Un titolare che vede "il bar non riceve le comande" non aveva
-- modo di controllare se il tablet del bar fosse acceso e sul reparto giusto.
--
-- Il dispositivo si presenta da solo con un identificativo che genera lui:
-- non è un'autenticazione — quella resta l'account — è un'etichetta per
-- riconoscere lo schermo e poterlo nominare.

create table if not exists venue_devices (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  -- Generato dal browser e conservato lì: identifica lo schermo, non la persona.
  device_key text not null,
  nome text,
  reparto text,
  ultimo_utente uuid references users(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (venue_id, device_key)
);

create index if not exists idx_venue_devices_visti
  on venue_devices (venue_id, last_seen_at desc);
