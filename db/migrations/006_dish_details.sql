-- Scheda piatto completa.
--
-- Gli allergeni non sono un abbellimento: il Reg. UE 1169/2011 impone di
-- indicarli. Un menu digitale che non li mostra mette il locale fuori norma,
-- e il campo esisteva già inutilizzato.
--
-- L'abbinamento consigliato serve due scopi: arricchisce la scheda e
-- introduce l'upselling, che oggi manca del tutto.

alter table menu_items
  add column if not exists dietary_tags text[],
  add column if not exists ingredients text,
  add column if not exists pairing_item_id uuid references menu_items(id) on delete set null;

create index if not exists idx_menu_items_pairing on menu_items (pairing_item_id);
