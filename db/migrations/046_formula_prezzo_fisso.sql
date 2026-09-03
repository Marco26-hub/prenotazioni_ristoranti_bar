-- Formula a prezzo fisso: si paga a persona, non a piatto.
--
-- Il conto sommava sempre il prezzo dei piatti. In un all you can eat non
-- funziona cosi': il tavolo paga un importo per commensale e i piatti della
-- formula valgono zero. Senza questo, un sushi a prezzo fisso non poteva
-- usare il gestionale per incassare -- l'intervallo fra le ordinazioni da
-- solo non bastava.
--
-- La formula si decide per tavolo, non per locale: lo stesso ristorante
-- lavora a formula la sera e alla carta a pranzo, o accoglie un tavolo che
-- preferisce ordinare due piatti e basta.

alter table venues
  -- Il locale propone la formula.
  add column if not exists formula_attiva boolean not null default false,
  -- I nuovi tavoli nascono a formula. Chi la propone solo su richiesta lo
  -- mette a falso e lo staff la accende tavolo per tavolo.
  add column if not exists formula_predefinita boolean not null default true,
  add column if not exists formula_pranzo_cents int not null default 0,
  add column if not exists formula_cena_cents int not null default 0,
  -- Da quest'ora in poi vale il prezzo di cena. Ora locale del locale.
  add column if not exists formula_ora_cena time not null default '17:00',
  -- Null: i bambini pagano come gli adulti. Zero: non pagano.
  add column if not exists formula_bambino_cents int,
  -- Addebito per il cibo ordinato e non consumato. Va scritto sul menu
  -- prima dell'ordinazione: comparire solo sul conto lo rende una clausola
  -- che il cliente non ha mai accettato.
  add column if not exists formula_supplemento_cents int not null default 0,
  add column if not exists formula_nota text;

-- Fuori formula: dolci, caffe', amari, bevande, piatti premium. Si pagano a
-- parte anche al tavolo che ha preso la formula.
alter table menu_items
  add column if not exists fuori_formula boolean not null default false;

alter table table_sessions
  add column if not exists formula boolean not null default false,
  -- Contati a parte dai coperti: entrano nel totale a tariffa ridotta, o
  -- non entrano affatto.
  add column if not exists bambini int not null default 0
    check (bambini >= 0),
  -- Deciso dallo staff alla chiusura, guardando il tavolo: nessun software
  -- puo' sapere quanto e' rimasto nel piatto.
  add column if not exists supplemento_cents int not null default 0;

comment on column venues.formula_bambino_cents is
  'Tariffa bambino della formula. NULL = pagano come gli adulti, 0 = gratis.';
