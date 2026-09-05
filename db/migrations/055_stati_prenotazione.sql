-- Allinea il vincolo degli stati prenotazione a quello che la produzione ha.
--
-- schema.sql ammetteva solo confirmed/seated/no_show/cancelled, mentre la
-- conferma manuale scrive 'pending' e il rifiuto scrive 'declined'. In
-- produzione il vincolo era gia' stato allargato a mano; su un'installazione
-- fatta seguendo il README, invece, ogni richiesta di prenotazione veniva
-- rifiutata dal database -- e il cliente leggeva solo "non siamo riusciti a
-- registrare la prenotazione", senza che nessun log dicesse perche'.
--
-- E' la seconda deriva della stessa specie: confrontavo colonne e indici, non
-- i vincoli.
do $$
begin
  alter table reservations drop constraint if exists reservations_status_check;
  alter table reservations add constraint reservations_status_check
    check (status in ('pending','confirmed','declined','seated','no_show','cancelled'));
end $$;
