-- Quanti dice di essere il tavolo.
--
-- Diverso da `coperti_confermati`, che è la parola del personale. Qui c'è la
-- parola del cliente: la scrive lui appena inquadra il QR, e serve a due
-- cose. La prima è che il conto smette di essere un trattino mentre mangia —
-- vede un totale provvisorio invece di niente. La seconda è che la sala non
-- deve più contare le teste da lontano: legge quello che il tavolo ha detto
-- e tocca una volta per accettarlo.
--
-- Non sostituisce la conferma e non deve: un tavolo da sei che ne dichiara
-- quattro risparmia cinquantadue euro, e nessun software può accorgersene.
-- Chi decide sui soldi resta il locale.
--
-- Serve una colonna a parte e non basta guardare `guest_count`: quello nasce
-- a 1, e un tavolo da una persona che dichiara 1 sarebbe indistinguibile da
-- un tavolo che non ha dichiarato niente.
alter table table_sessions
  add column if not exists coperti_dal_tavolo boolean not null default false;
