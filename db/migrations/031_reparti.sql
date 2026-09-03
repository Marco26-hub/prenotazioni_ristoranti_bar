-- Reparto di produzione della categoria: dove si prepara davvero.
--
-- Una comanda unica manda il vino in cucina e la pasta al bar. In un locale
-- con due postazioni la carta stampata va divisa, e lo schermo del bar non
-- deve riempirsi di primi che non lo riguardano.
--
-- Sta sulla categoria e non sul singolo piatto: è così che un ristoratore
-- ragiona — "le bevande le fa il bar" — e mettere il campo su ogni voce
-- significherebbe compilarlo duecento volte.
--
-- Default 'cucina': chi non tocca niente continua a stampare tutto insieme
-- come prima, su un foglio solo.

alter table menu_categories
  add column if not exists reparto text not null default 'cucina';

alter table menu_categories
  drop constraint if exists menu_categories_reparto_check;

alter table menu_categories
  add constraint menu_categories_reparto_check
  check (reparto in ('cucina', 'bar', 'pizzeria', 'pasticceria'));
