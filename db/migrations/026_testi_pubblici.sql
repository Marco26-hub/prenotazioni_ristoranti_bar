-- Testi delle pagine pubbliche riscrivibili dal locale.
--
-- Nome, descrizioni e prezzi dei piatti erano già suoi; le frasi intorno no.
-- "Prenota da X", il messaggio quando le prenotazioni sono chiuse, la nota in
-- fondo alla carta: erano scritte da noi e uguali per tutti, mentre sono
-- esattamente le righe con cui un locale si presenta.
--
-- Una sola colonna jsonb invece di una colonna per frase: i testi cambiano
-- più spesso dello schema, e aggiungerne uno non deve costare una migrazione.
-- Le chiavi mancanti ricadono sul testo predefinito, quindi chi non tocca
-- niente vede quello che vedeva prima.

alter table venues
  add column if not exists public_texts jsonb not null default '{}'::jsonb;
