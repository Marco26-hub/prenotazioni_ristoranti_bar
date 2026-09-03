-- Dopo quante ore una sessione tavolo lasciata aperta smette di valere.
--
-- L'unica chiusura automatica era il webhook di pagamento a saldo zero: un
-- conto saldato in contanti, o un tavolo che se ne va senza pagare, restava
-- aperto per sempre. Il turno del giorno dopo inquadrava lo stesso QR e si
-- trovava davanti il conto di sconosciuti — e premendo "paga tutto" lo
-- pagava davvero.
--
-- Il valore giusto dipende dal locale: un ristorante chiude ogni sera, un
-- bar con tavoli tutto il giorno no. Zero disattiva la scadenza per chi
-- preferisce gestirla a mano.

alter table venues
  add column if not exists sessione_max_ore smallint not null default 6;

alter table venues
  drop constraint if exists venues_sessione_max_ore_check;

alter table venues
  add constraint venues_sessione_max_ore_check
  check (sessione_max_ore between 0 and 72);
