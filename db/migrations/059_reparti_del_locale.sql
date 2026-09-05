-- Le postazioni le decide il locale, non il programma.
--
-- Erano un elenco fisso di sei: cucina, bar, pizzeria, pasticceria, banco
-- sushi, griglia. Ma ogni locale e' fatto a modo suo -- c'e' chi ha due
-- cucine, chi ha il forno separato dalla friggitoria, chi chiama "pass" il
-- punto in cui la sala ritira. Un elenco scritto nel programma costringe
-- tutti a incastrarsi in sei parole che non sono le loro.
--
-- Non e' pero' un campo libero al momento dell'uso: scrivendo il nome ogni
-- volta si finisce con "Cucina", "cucina" e "CUCINA" come tre postazioni
-- diverse, e chi ha il permesso su una non ce l'ha sulle altre. E' un elenco
-- che il locale crea una volta e poi sceglie da una tendina, ovunque.
--
-- Chi non ne crea nessuna continua a usare i sei di partenza: nessun locale
-- gia' avviato deve accorgersi di questa migrazione.

create table if not exists venue_reparti (
  venue_id uuid references venues(id) on delete cascade not null,
  -- La chiave finisce nelle comande e nei permessi: non cambia quando si
  -- rinomina l'etichetta, o rinominare "Cucina" in "Cucina 1" toglierebbe
  -- il permesso a chi ce l'aveva.
  chiave text not null check (chiave ~ '^[a-z0-9_-]{1,32}$'),
  etichetta text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  primary key (venue_id, chiave)
);

create index if not exists idx_venue_reparti
  on venue_reparti (venue_id, sort_order);
