-- Due cose che a prezzo fisso decidono il conto, e che nessuno dichiarava.
--
-- 1. I COPERTI. `guest_count` nasce a 1 perché la sessione la apre il
--    cliente inquadrando il QR, prima che qualcuno del personale la guardi.
--    Alla carta è quasi innocuo: i coperti muovono solo il coperto. A
--    formula sono TUTTO il conto — un tavolo da sei che ordina senza che
--    nessuno tocchi i coperti paga un prezzo fisso invece di sei, venticinque
--    euro invece di centocinquanta. E un tavolo da uno esiste davvero, quindi
--    "guest_count = 1" non basta a distinguere il non dichiarato dal reale:
--    serve dirlo.
alter table table_sessions
  add column if not exists coperti_confermati boolean not null default false;

-- Le sessioni già aperte adesso non vanno bloccate a metà servizio: quelle
-- che hanno più di un coperto qualcuno le ha già toccate.
update table_sessions
   set coperti_confermati = true
 where status = 'open' and coalesce(guest_count, 1) > 1;

-- 2. LA FASCIA. Il prezzo pranzo/cena si decide dall'ora in cui la sessione
--    si è aperta. È la regola giusta nove volte su dieci e resta il
--    predefinito — ma non c'era modo di correggerla, e il tavolo che si
--    siede alle 18:30 in un locale che apre la cena alle 19 pagava il pranzo
--    per tutta la sera. Su quattro persone, con dieci euro di differenza,
--    sono quaranta euro a tavolo.
--
--    Nullo significa "decidila dall'orario", che è il comportamento di prima.
alter table table_sessions
  add column if not exists fascia text
  check (fascia is null or fascia in ('pranzo', 'cena'));
