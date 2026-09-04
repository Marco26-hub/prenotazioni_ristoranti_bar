-- Come si avvisa chi aspetta al banco.
--
-- Tre modi, e il locale sceglie quelli che usa davvero -- anche piu' di uno:
-- chi consegna un segnaposto numerato spesso avvisa anche sul telefono, per
-- chi si e' seduto fuori e il numero sul tavolo non lo vede nessuno.
--
--   segnaposto     un cavalierino numerato che il cliente porta al tavolo
--   cercapersone   il disco che vibra quando l'ordine e' pronto
--   telefono       il numero e lo stato sulla pagina da cui ha ordinato
--
-- Il terzo e' l'unico che il programma puo' fare da solo: gli altri due
-- dicono a chi sta al banco cosa consegnare e chi chiamare.
alter table venues
  add column if not exists pickup_metodi text[] not null default '{}';

-- Quando l'ordine e' stato chiamato: serve al banco per non chiamare due
-- volte lo stesso numero, e al cliente per sapere che tocca a lui.
alter table orders
  add column if not exists pickup_chiamato_at timestamptz,
  add column if not exists pickup_ritirato_at timestamptz;

comment on column venues.pickup_metodi is
  'segnaposto, cercapersone, telefono. Vuoto: nessun avviso, si serve al tavolo.';
