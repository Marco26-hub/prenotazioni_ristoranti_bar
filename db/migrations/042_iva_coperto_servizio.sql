-- Aliquota IVA di coperto e servizio.
--
-- La fattura elettronica si costruiva dalle sole righe dei piatti, mentre il
-- conto incassa anche coperto e servizio: il documento dichiarava meno di
-- quanto il cliente aveva pagato. Su un tavolo da quattro con due euro di
-- coperto e il dieci per cento di servizio non e' un arrotondamento.
--
-- L'aliquota sta qui e non nel codice perche' non e' una decisione nostra.
-- Il coperto segue di norma l'aliquota della somministrazione, ma il caso
-- concreto lo stabilisce il commercialista del locale, e un valore scritto
-- nel programma non si puo' correggere quando serve.
alter table venues
  add column if not exists service_vat_rate numeric(4,2) not null default 10.00;

comment on column venues.service_vat_rate is
  'Aliquota IVA applicata a coperto e servizio in fattura elettronica.';
