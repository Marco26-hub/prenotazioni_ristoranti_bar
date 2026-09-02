-- Menu in più lingue.
--
-- In una città turistica è la prima domanda del ristoratore, e oggi la
-- risposta è no. I concorrenti la vendono come titolo di testa: MyCIA
-- dichiara sessanta lingue.
--
-- Le traduzioni stanno in jsonb sulla riga del piatto e non in una tabella
-- a parte: si leggono sempre insieme al piatto, mai da sole, e una join in
-- più su ogni menu servito non porta nulla. Forma:
--   {"en": {"name": "...", "description": "...", "ingredients": "..."}}

alter table menu_items
  add column if not exists translations jsonb not null default '{}'::jsonb;

alter table menu_categories
  add column if not exists translations jsonb not null default '{}'::jsonb;

-- Lingue offerte dal locale, oltre all'italiano che è sempre la base.
-- Vuoto significa menu solo in italiano: nessun selettore mostrato al
-- cliente, invece di un selettore che non cambia nulla.
alter table venues
  add column if not exists languages text[] not null default '{}';
