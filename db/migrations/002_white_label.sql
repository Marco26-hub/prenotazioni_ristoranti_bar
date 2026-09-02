-- Personalizzazione per locale: il prodotto è white-label, il cliente finale
-- deve vedere il marchio del ristorante, non il nostro.
--
-- Il logo è salvato come data URL nella colonna invece che su un object
-- storage: evita di dipendere da un servizio esterno in più, ed è
-- sostenibile finché i loghi restano piccoli (limite applicativo 200 KB).
-- Se in futuro servono immagini grandi o gallerie, va spostato su blob
-- storage e qui resta solo l'URL.

alter table venues
  add column if not exists logo_url text,
  add column if not exists brand_color text,
  add column if not exists public_phone text,
  add column if not exists public_email text;
