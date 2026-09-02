-- Collegamento al gestionale di cassa Tilby (Zucchetti).
--
-- Il token è per singolo negozio e va cifrato come gli altri segreti: chi
-- legge il database non deve poter interrogare la cassa del locale.
-- tilby_shop_name serve solo a mostrare al gestore a quale negozio è
-- collegato, così si accorge subito di un token sbagliato.

alter table venues
  add column if not exists tilby_token text,
  add column if not exists tilby_shop_name text;
