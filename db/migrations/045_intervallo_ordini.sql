-- Intervallo minimo fra due ordinazioni dallo stesso tavolo.
--
-- E' il metodo dei ristoranti all-you-can-eat: si ordina a piccole ondate,
-- con qualche minuto di pausa fra una e l'altra. Senza, un tavolo da sei
-- manda ottanta piatti in tre minuti, la cucina li prepara tutti insieme e
-- meta' arrivano freddi -- o non vengono mangiati affatto, che nella formula
-- a prezzo fisso e' esattamente lo spreco che manda in perdita il servizio.
--
-- Zero significa nessun limite, ed e' il valore predefinito: un ristorante
-- alla carta non deve trovarsi un vincolo che non ha chiesto.
alter table venues
  add column if not exists ordine_intervallo_min smallint not null default 0
    check (ordine_intervallo_min between 0 and 120);

comment on column venues.ordine_intervallo_min is
  'Minuti da attendere fra due ordini dello stesso tavolo. 0 = nessuna attesa.';
