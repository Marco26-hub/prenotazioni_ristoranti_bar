-- Annuncio mostrato al cliente all'apertura del menu: piatto del giorno,
-- serata a tema, chiusura straordinaria.
--
-- Le date di validità servono perché un annuncio dimenticato è peggio di
-- nessun annuncio: "Menu di San Valentino" ancora a marzo dice al cliente
-- che il locale non cura il proprio menu digitale. Con una scadenza sparisce
-- da solo.

alter table venues
  add column if not exists announcement_title text,
  add column if not exists announcement_body text,
  add column if not exists announcement_image_url text,
  add column if not exists announcement_cta_label text,
  add column if not exists announcement_cta_url text,
  add column if not exists announcement_starts_at timestamptz,
  add column if not exists announcement_ends_at timestamptz,
  add column if not exists announcement_enabled boolean not null default false,
  -- Cambiando testo o immagine si incrementa: il cliente che ha già chiuso
  -- l'annuncio precedente deve rivedere quello nuovo, non restare zitto
  -- perché aveva chiuso un annuncio diverso settimane prima.
  add column if not exists announcement_version int not null default 1;
