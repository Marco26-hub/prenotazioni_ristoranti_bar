-- Promemoria il giorno prima e disdetta dal cliente.
--
-- Sono le due cose che i portali di prenotazione fanno e noi no, e servono
-- alla stessa ferita: il tavolo prenotato che resta vuoto. Il promemoria
-- riduce chi si dimentica; il link di disdetta trasforma chi non puo' piu'
-- venire da un no-show in un tavolo che si libera in tempo per darlo a
-- qualcun altro.
--
-- Senza il link, disdire vuol dire telefonare in orario di servizio: molti
-- non lo fanno, e il locale scopre alle nove che quel tavolo non arriva.

alter table reservations
  -- Segreto per disdire senza account ne' password: chi ha il link e' chi
  -- ha ricevuto l'email di conferma, e non da' accesso a nient'altro.
  add column if not exists cancel_token text,
  add column if not exists promemoria_inviato_at timestamptz,
  add column if not exists promemoria_errore text,
  -- Disdetta dal cliente e disdetta dal locale sono due cose diverse: la
  -- prima non e' un rifiuto e non va contata come tale nelle analisi.
  add column if not exists disdetta_dal_cliente_at timestamptz;

create unique index if not exists uq_reservation_cancel_token
  on reservations (cancel_token) where cancel_token is not null;

-- Le prenotazioni gia' in essere restano senza link: non si puo' mandare
-- loro un token che non era nell'email che hanno ricevuto.
