-- In che lingua scrivere a chi ha prenotato.
--
-- Serve perché non tutte le email partono mentre il cliente è collegato: la
-- conferma sì, ma il promemoria del giorno prima lo manda un cron alle nove
-- del mattino, quando dell'inglese che aveva scelto non resta traccia — né
-- header né cookie. Senza questa colonna un tedesco prenota in inglese e
-- l'indomani riceve un promemoria in italiano, con dentro il link per
-- disdire.
--
-- Il valore si prende dalla pagina in cui ha compilato il modulo.
alter table reservations add column if not exists lingua text not null default 'it'
  check (lingua in ('it', 'en'));
