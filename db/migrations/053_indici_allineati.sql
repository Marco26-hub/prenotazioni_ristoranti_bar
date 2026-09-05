-- Allinea gli indici a quelli che la produzione ha davvero.
--
-- Confrontando schema e produzione ne sono emersi tre applicati a mano e mai
-- passati da una migrazione. Due sono migliori di quelli che avevo appena
-- aggiunto io, e uno garantisce una cosa su cui il codice conta senza dirlo.

-- Parziale sugli stati vivi: piu' piccolo e piu' veloce di uno su tutti gli
-- stati, e la board di cucina cerca solo quelli. Il mio, generico, e' di
-- troppo: ogni indice in piu' e' lavoro a ogni scrittura di comanda.
drop index if exists idx_order_items_stato;
create index if not exists idx_order_items_live
  on order_items (order_id, status)
  where status in ('pending', 'sent_to_kitchen', 'preparing', 'ready');

-- Due ordini non possono prendere lo stesso numero di ritiro nella stessa
-- giornata di servizio. Il contatore in transazione lo evita, ma un indice
-- unico e' cio' che lo rende vero anche se un giorno qualcuno scrive un
-- ordine per un'altra strada: due clienti col numero 7 allo stesso bancone
-- non sono un fastidio, sono il panino dato alla persona sbagliata.
create unique index if not exists idx_orders_pickup_number
  on orders (venue_id, pickup_service_date, pickup_number)
  where pickup_number is not null;

-- Parziale sui tavoli aperti, che e' la domanda che la sala fa di continuo.
-- Il mio su (venue_id, status) copriva anche i chiusi, ma per quelli c'e'
-- gia' idx_sessioni_chiuse: tenerli tutti e due significa pagare due
-- scritture per ogni apertura e chiusura di tavolo.
drop index if exists idx_sessioni_venue_stato;
create index if not exists idx_table_sessions_venue_open
  on table_sessions (venue_id, table_id) where status = 'open';
