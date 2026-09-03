-- Numero di ritiro per l'asporto: allineamento, non funzione nuova.
--
-- Queste tre colonne e questa tabella esistono gia' in produzione, applicate
-- a mano e mai passate da una migrazione: db/schema.sql non le conosceva e
-- un'installazione nuova non le avrebbe create. Nessun codice le usa ancora,
-- quindi oggi la differenza non rompe niente -- ma il giorno in cui il
-- numero di ritiro viene collegato, funzionerebbe in produzione e andrebbe
-- in errore su ogni locale installato dopo, che e' il modo peggiore di
-- scoprire una deriva.
--
-- Sono la base del banco senza tavoli (piadineria, pizza al taglio): il
-- cliente non ha un tavolo a cui riportare l'ordine, quindi si chiama un
-- numero, e il numero riparte da uno ogni giorno di servizio.

create table if not exists order_number_counters (
  venue_id uuid references venues(id) on delete cascade not null,
  -- Giornata di servizio, non data civile: la numerazione riparte
  -- all'apertura, non a mezzanotte, o un locale che chiude alle due
  -- avrebbe due serie nella stessa serata.
  service_date date not null,
  last_number int not null check (last_number > 0),
  primary key (venue_id, service_date)
);

alter table orders
  add column if not exists pickup_number int,
  add column if not exists pickup_service_date date;

alter table venues
  add column if not exists pickup_numbering_enabled boolean not null default false;
