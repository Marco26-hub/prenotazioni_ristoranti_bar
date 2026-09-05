-- Il banco senza tavoli.
--
-- Il gestionale e' nato per il ristorante: si inquadra il QR del tavolo, e
-- chi si siede a quel tavolo condivide un conto. In una piadineria non
-- funziona: la gente si siede dove capita, o non si siede affatto, e ogni
-- cliente e' il proprio conto.
--
-- Con un QR solo al bancone, il secondo cliente che inquadrava si univa alla
-- sessione aperta del primo: la sua piadina finiva sul conto di uno
-- sconosciuto. Al banco ogni scansione apre una sessione nuova.
--
-- Il vincolo "una sola sessione aperta per tavolo" resta dov'e' utile -- e'
-- quello che impedisce a due scansioni simultanee dello stesso tavolo di
-- creare due conti -- ma smette di valere per il banco, dove sessioni aperte
-- contemporaneamente sullo stesso QR sono la normalita': sono le persone in
-- fila.

alter table venues
  add column if not exists servizio_al_banco boolean not null default false;

comment on column venues.servizio_al_banco is
  'Si consegna al bancone: ogni scansione del QR apre un conto suo, non condiviso.';

alter table table_sessions
  add column if not exists banco boolean not null default false;

drop index if exists uq_table_open_session;
create unique index uq_table_open_session
  on table_sessions (table_id) where status = 'open' and banco = false;
