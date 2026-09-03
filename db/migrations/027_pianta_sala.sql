-- Posizione del tavolo nella pianta della sala.
--
-- La sala era una griglia in ordine alfabetico: T1, T10, T2, T3… Chi lavora
-- non ragiona così. Il cameriere sa dov'è il tavolo, non che numero ha in
-- ordine di codice, e a colpo d'occhio deve riconoscere la finestra, il
-- dehors, il tavolo grande in fondo.
--
-- Coordinate su una griglia astratta (non pixel): la pianta si adatta a
-- schermi diversi senza che le posizioni salvate perdano senso. NULL
-- significa "mai posizionato", e quei tavoli restano nella griglia
-- automatica finché qualcuno non li dispone.

alter table tables
  add column if not exists pos_x smallint,
  add column if not exists pos_y smallint;

-- La forma cambia come si legge la pianta: un tondo da sei e un rettangolare
-- da sei occupano lo stesso spazio ma non si dispongono allo stesso modo.
alter table tables
  add column if not exists shape text not null default 'rettangolo';

alter table tables
  drop constraint if exists tables_shape_check;

alter table tables
  add constraint tables_shape_check
  check (shape in ('rettangolo', 'tondo', 'bancone'));
