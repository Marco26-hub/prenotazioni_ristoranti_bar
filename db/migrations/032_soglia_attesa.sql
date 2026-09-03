-- Dopo quanti minuti una comanda è in ritardo, deciso dal locale.
--
-- Era fissa a venti minuti nel codice. Venti minuti sono un'eternità per una
-- piadineria e niente per un ristorante con la brace: una soglia sola dice il
-- falso a quasi tutti, e una soglia che dice il falso viene ignorata, che è
-- il modo peggiore di far fallire un allarme.
--
-- Zero disattiva l'allarme, per chi non lo vuole addosso tutta la sera.

alter table venues
  add column if not exists soglia_attesa_min smallint not null default 20;

alter table venues
  drop constraint if exists venues_soglia_attesa_check;

alter table venues
  add constraint venues_soglia_attesa_check
  check (soglia_attesa_min between 0 and 240);
