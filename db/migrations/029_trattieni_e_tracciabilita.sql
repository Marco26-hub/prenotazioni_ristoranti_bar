-- Trattenere un piatto, e sapere chi lo ha mosso.
--
-- 1) TRATTENUTA. In sala si dice "ritarda i secondi": il tavolo è ancora sugli
--    antipasti e le bistecche non devono partire. Finora l'unico movimento
--    possibile era in avanti, quindi il cameriere non aveva modo di dirlo alla
--    cucina se non a voce — e a voce, con la sala piena, non arriva.
--
--    Trattenere non è uno stato del flusso ma una condizione sopra di esso: un
--    piatto trattenuto resta dov'è (da preparare, in preparazione) e riparte da
--    lì quando viene liberato. Metterlo come stato avrebbe fatto perdere il
--    punto a cui era arrivato.
--
-- 2) TRACCIABILITÀ. Con più camerieri sui palmari, ognuno col suo accesso,
--    "servito" senza un nome accanto non vale niente: quando un piatto risulta
--    servito e il cliente dice che non è arrivato, serve sapere chi lo ha
--    segnato e quando. Registro separato e non solo ultimo autore: la sequenza
--    dei passaggi è la cosa che si guarda quando qualcosa è andato storto.

alter table order_items
  add column if not exists held_at timestamptz,
  add column if not exists held_by uuid references users(id),
  add column if not exists held_note text;

create index if not exists idx_order_items_held
  on order_items (held_at) where held_at is not null;

create table if not exists order_item_events (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid references order_items(id) on delete cascade not null,
  venue_id uuid references venues(id) on delete cascade not null,
  -- Chi ha agito. Resta anche se l'addetto viene rimosso dal locale: un
  -- registro che si svuota quando qualcuno se ne va non è un registro.
  user_id uuid references users(id),
  user_label text not null,
  azione text not null check (azione in ('stato', 'trattenuto', 'liberato')),
  da_stato text,
  a_stato text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_item_events_item
  on order_item_events (order_item_id, created_at);

create index if not exists idx_order_item_events_venue
  on order_item_events (venue_id, created_at desc);
