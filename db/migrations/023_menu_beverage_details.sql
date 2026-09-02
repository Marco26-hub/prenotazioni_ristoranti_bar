-- Dettagli strutturati per una carta reale di piatti e bevande.
-- I campi restano opzionali per non rompere i menu gia caricati.
alter table menu_items
  add column if not exists subcategory text,
  add column if not exists product_style text,
  add column if not exists format text,
  add column if not exists grape_variety text,
  add column if not exists service_type text;

