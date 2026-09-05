-- Gli indici che servono quando le tabelle non sono piu' piccole.
--
-- Oggi ogni tabella ha poche centinaia di righe e Postgres sceglie
-- giustamente la scansione: i piani non dicono niente e tutto sembra veloce.
-- Ma un locale da cento coperti al giorno scrive circa trecento righe di
-- comanda al giorno, centomila l'anno, e i locali sono molti: le stesse
-- query cominciano a costare senza che nessuno cambi una riga di codice.
--
-- E' il modo peggiore di degradare, perche' non da' errori: la pagina della
-- sala -- quella che il titolare tiene aperta tutta la sera e che si
-- ricarica da sola -- diventa lenta un mese alla volta, e quando qualcuno se
-- ne accorge e' in mezzo al servizio.

-- La sala chiede i tavoli aperti di un locale, di continuo. Esisteva solo
-- l'indice unico su (table_id) per la sessione aperta, che non serve a
-- questa domanda.
create index if not exists idx_sessioni_venue_stato
  on table_sessions (venue_id, status);

-- Le analisi guardano indietro di giorni o mesi sui conti chiusi.
create index if not exists idx_sessioni_chiuse
  on table_sessions (venue_id, closed_at desc)
  where status = 'closed';

-- Lo storico di giornata e le analisi per periodo.
create index if not exists idx_orders_venue_data
  on orders (venue_id, created_at desc);

-- Il saldo di una sessione somma i soli pagamenti riusciti: senza lo stato
-- nell'indice si leggono anche tutti i tentativi falliti, che su un tavolo
-- con qualche carta rifiutata sono la maggioranza delle righe.
create index if not exists idx_pagamenti_sessione_stato
  on payments (table_session_id, status);

-- La board di cucina esclude le righe annullate a ogni giro, ogni quattro
-- secondi, per ogni schermo acceso nel locale.
create index if not exists idx_order_items_stato
  on order_items (order_id, status);

-- Le foto dei piatti passano da qui e sono la richiesta piu' pesante del
-- menu: una per piatto, a ogni cliente che apre il QR.
create index if not exists idx_menu_items_venue_disponibili
  on menu_items (venue_id, category_id)
  where available = true;
