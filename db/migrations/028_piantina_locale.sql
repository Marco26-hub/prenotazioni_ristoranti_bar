-- Piantina della sala caricata dal locale, come sfondo su cui disporre i tavoli.
--
-- Data URL come il logo e l'immagine dell'annuncio: la piantina si carica una
-- volta e non cambia quasi mai, e tenerla in riga evita di introdurre uno
-- storage esterno solo per questa.
--
-- I PDF vengono convertiti in immagine dal browser prima dell'invio: qui
-- arriva sempre un raster o un SVG, mai un PDF da interpretare a runtime.

alter table venues
  add column if not exists floor_plan_url text,
  add column if not exists floor_plan_opacity smallint not null default 35;

alter table venues
  drop constraint if exists venues_floor_plan_opacity_check;

alter table venues
  add constraint venues_floor_plan_opacity_check
  check (floor_plan_opacity between 0 and 100);
