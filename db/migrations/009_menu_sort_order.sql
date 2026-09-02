-- Il riordino del menu scambia due sort_order adiacenti. Finché le righe
-- importate valgono tutte 0 non esiste un "vicino" con cui scambiarsi e i
-- pulsanti non fanno nulla: vanno numerate prima di renderle ordinabili.

with numerato as (
  select id,
         row_number() over (
           partition by venue_id, category_id
           order by sort_order, name
         ) - 1 as nuovo
  from menu_items
)
update menu_items m set sort_order = n.nuovo
from numerato n where n.id = m.id;

with numerato as (
  select id,
         row_number() over (partition by venue_id order by sort_order, name) - 1 as nuovo
  from menu_categories
)
update menu_categories c set sort_order = n.nuovo
from numerato n where n.id = c.id;
