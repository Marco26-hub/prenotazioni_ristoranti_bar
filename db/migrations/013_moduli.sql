-- Moduli attivi sul locale.
--
-- Il prodotto si vende a pezzi: c'è chi vuole solo ordini e pagamento al
-- tavolo, e chi ha già la sala piena e vuole solo la pagina di prenotazione.
-- Senza questa colonna un abbonamento qualunque aprirebbe tutto, e i due
-- prezzi separati non avrebbero senso.
--
-- Popolata dal webhook degli abbonamenti leggendo i metadata del Price:
-- il listino sta su Stripe, non nel codice.

alter table venues
  add column if not exists modules text[] not null default '{}';

-- I locali già attivi avevano accesso a tutto: toglierlo adesso spegnerebbe
-- un servizio che stanno usando. Restano con entrambi i moduli.
update venues
   set modules = array['ordini','prenotazioni']
 where modules = '{}'
   and subscription_status in ('active','past_due');
