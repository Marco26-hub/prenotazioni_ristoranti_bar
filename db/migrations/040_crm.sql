-- Quello che serve per seguire un cliente, e che il database non sa gia'.
--
-- Chi ha comprato, quanto paga e quanto lavora si ricavano dai dati che gia'
-- ci sono: locali, abbonamenti, ordini. Quello che non si ricava e' il
-- rapporto: chi e' il referente, cosa si sono detti al telefono, quando
-- risentirlo, e perche' se n'e' andato.
--
-- Sono dati personali di un contatto commerciale: restano visibili solo al
-- super amministratore, e cadono col locale.

alter table venues
  add column if not exists referente_nome text,
  add column if not exists referente_telefono text,
  add column if not exists referente_email text,
  -- Come e' arrivato: passaparola, fiera, ricerca, contatto a freddo.
  add column if not exists provenienza text,
  -- Quando risentirlo. Una data, perche' "da richiamare" senza quando non
  -- viene richiamato mai.
  add column if not exists ricontattare_il date,
  -- Perche' se n'e' andato. Compilato alla disdetta, e' l'unico dato che
  -- dice come migliorare il prodotto.
  add column if not exists motivo_abbandono text;

create table if not exists venue_notes (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  autore_id uuid references users(id) on delete set null,
  autore_label text not null,
  testo text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_venue_notes
  on venue_notes (venue_id, created_at desc);

create index if not exists idx_venues_ricontattare
  on venues (ricontattare_il) where ricontattare_il is not null;
