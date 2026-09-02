-- Mance in percentuale e richiesta recensione dopo il pagamento.
--
-- La mancia è configurabile per locale, non imposta: in Italia la cultura
-- della mancia è molto più debole che nei mercati anglosassoni dove questi
-- prodotti sono nati, e una richiesta insistente infastidisce il cliente
-- invece di aiutare il personale. Il locale decide se mostrarla e con quali
-- percentuali.

alter table venues
  add column if not exists tips_enabled boolean default true,
  add column if not exists tip_percents int[] default '{5,10,15}',
  add column if not exists google_review_url text;
