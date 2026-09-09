-- Il ritiro diventa un modulo autonomo. I clienti che hanno gia comprato
-- il piano completo non devono perdere una funzione che era inclusa.
update venues
   set modules = array_append(coalesce(modules, array[]::text[]), 'ritiro')
 where subscription_plan like 'completo-%'
   and not ('ritiro' = any(coalesce(modules, array[]::text[])));
