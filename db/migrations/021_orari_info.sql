-- Orari e informazioni pratiche.
--
-- "A che ora aprite?" è la domanda più frequente che riceve un locale, e
-- finora il sistema non sapeva rispondere. Senza questo dato un assistente
-- che risponde ai clienti è inutile, e la scheda pubblica è incompleta
-- proprio nel punto che le persone cercano per primo.
--
-- Testo libero e non una tabella di fasce: gli orari veri sono pieni di
-- eccezioni — "chiuso il lunedì tranne agosto", "cucina fino alle 23, bar
-- fino a mezzanotte" — che una griglia rigida costringerebbe a mentire.

alter table venues
  add column if not exists opening_hours text,
  -- Parcheggio, dehors, animali, accessibilità, wi-fi: le domande che
  -- arrivano al telefono e fanno perdere tempo al personale.
  add column if not exists practical_info text,
  -- Assistente attivo sulle pagine pubbliche. Spento di default: costa
  -- chiamate al modello e va acceso da chi le paga.
  add column if not exists assistant_enabled boolean not null default false;
