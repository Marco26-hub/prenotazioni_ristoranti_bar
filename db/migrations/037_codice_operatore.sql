-- Codice operatore: entrare in fretta da un dispositivo condiviso.
--
-- In sala il tablet è uno e lo usano in cinque. Digitare email e password a
-- ogni cambio è il motivo per cui, in pratica, nessuno esce mai e tutte le
-- comande risultano fatte dalla stessa persona — cioè il motivo per cui il
-- registro di chi ha fatto cosa perde valore.
--
-- Resta una credenziale: viene salvato con lo stesso hash della password, mai
-- in chiaro, e vale solo per sala e cucina. Titolare e responsabile toccano
-- dati fiscali e incassi e continuano a entrare con la password: quattro
-- cifre non difendono un pannello che vede il fatturato.

alter table venue_staff
  add column if not exists codice_hash text,
  add column if not exists codice_suffisso text;

-- Due persone con lo stesso codice nello stesso locale renderebbero il
-- registro ambiguo, che è esattamente ciò che il codice deve evitare.
create unique index if not exists uq_codice_operatore
  on venue_staff (venue_id, codice_suffisso)
  where codice_suffisso is not null;
