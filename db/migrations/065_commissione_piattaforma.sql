-- La commissione che tratteniamo sui pagamenti con carta, per locale.
--
-- Era una costante nel codice — `amountCents * 0.015` — con accanto scritto
-- «provvisorio»: nessuno l'aveva decisa, cambiarla voleva dire un rilascio, e
-- valeva uguale per tutti. Nel frattempo il prodotto scriveva al ristoratore,
-- nella sua pagina Abbonamento, che non tratteniamo nulla sul suo incassato.
--
-- Parte da ZERO e non da 1,5 apposta: finché quella frase è nel prodotto deve
-- essere vera, e trattenere qualcosa deve essere un gesto esplicito su quel
-- locale, non un valore ereditato che nessuno ha scelto.
--
-- Si applica solo ai pagamenti con carta via Stripe: Satispay non la prevede,
-- e il contante e il POS del locale non passano da noi.
alter table venues
  add column if not exists commissione_percent numeric(4,2) not null default 0
  check (commissione_percent >= 0 and commissione_percent <= 10);
