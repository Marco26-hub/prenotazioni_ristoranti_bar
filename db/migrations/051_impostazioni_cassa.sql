-- Quello che era scritto nel programma e invece cambia da locale a locale.
--
-- Tre cose stavano fisse nel codice e non potevano starci:
--
-- 1. L'ora in cui finisce la giornata di servizio. Cinque del mattino va bene
--    a un ristorante, non a un bar che apre alle sei: i suoi primi caffe'
--    sarebbero finiti nella giornata precedente, e la chiusura dei
--    corrispettivi con loro.
--
-- 2. La marca della stampante fiscale. Epson, Custom e RCH parlano dialetti
--    diversi, e il locale ha quella che ha.
--
-- 3. I reparti IVA. Sulle stampanti fiscali italiane ogni aliquota sta su un
--    reparto numerato, e la numerazione la decide chi ha configurato la
--    stampante: mandare tutto sul reparto 1 vuol dire dichiarare tutto con
--    l'aliquota di quel reparto, che e' un errore fiscale silenzioso.

alter table venues
  -- Ora locale in cui si stacca la giornata di servizio.
  add column if not exists giornata_stacco_ora smallint not null default 5
    check (giornata_stacco_ora between 0 and 12),

  add column if not exists rt_marca text not null default 'epson'
    check (rt_marca in ('epson', 'custom', 'rch')),

  -- Numero dell'operatore sulla stampante: quasi sempre 1, ma non sempre.
  add column if not exists rt_operatore smallint not null default 1
    check (rt_operatore between 1 and 99),

  -- Percorso della pagina che riceve i comandi, se il modello lo cambia.
  add column if not exists rt_percorso text,

  -- Aliquota -> reparto. { "10": 1, "22": 2, "4": 3 }. Vuoto: tutto sul
  -- reparto 1, con l'avviso in interfaccia che va configurato.
  add column if not exists rt_reparti jsonb not null default '{}'::jsonb;

comment on column venues.rt_reparti is
  'Aliquota IVA -> reparto della stampante fiscale. Deve rispecchiare come e configurata la stampante.';
