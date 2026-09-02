-- Scheda delle bevande.
--
-- Il formato — calice, 0,375, 0,75, magnum — è già coperto dalle varianti:
-- sono scelte con un supplemento, e l'esaurito vale per singolo formato.
-- Quello che manca è ciò che una carta dei vini scrive accanto al nome, e
-- che un cliente cerca prima di ordinare una bottiglia da quaranta euro.

alter table menu_items
  -- Distingue come si presenta la voce: una bottiglia non si descrive come
  -- un piatto, e senza questo l'interfaccia non sa quali campi mostrare.
  add column if not exists kind text not null default 'food'
    check (kind in ('food', 'wine', 'beer', 'drink')),
  add column if not exists producer text,          -- cantina o birrificio
  add column if not exists vintage int,            -- annata
  add column if not exists denomination text,      -- DOCG, DOC, IGT, DOP
  add column if not exists origin text,            -- zona o paese
  add column if not exists abv numeric(4,1),       -- gradazione alcolica
  add column if not exists serving_note text;      -- temperatura, decantazione

-- Un'annata plausibile: fuori da questa finestra è quasi sempre un errore
-- di battitura, e in carta farebbe una figura peggiore di un campo vuoto.
alter table menu_items drop constraint if exists annata_plausibile;
alter table menu_items add constraint annata_plausibile
  check (vintage is null or (vintage >= 1900 and vintage <= 2100));

alter table menu_items drop constraint if exists gradazione_plausibile;
alter table menu_items add constraint gradazione_plausibile
  check (abv is null or (abv >= 0 and abv <= 80));
