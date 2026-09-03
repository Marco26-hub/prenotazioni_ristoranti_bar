-- Fino a che eta' vale la tariffa bambino.
--
-- Serve al cliente, non al conto: lo staff conta i bambini a occhio, ma la
-- soglia va scritta sul menu ("gratis fino a 4 anni", "ridotto fino a 10")
-- o due tavoli identici pagano diverso a seconda di chi li serve.
alter table venues
  add column if not exists formula_bambino_eta_max smallint;

comment on column venues.formula_bambino_eta_max is
  'Eta massima per la tariffa bambino, mostrata al cliente. NULL = non dichiarata.';
