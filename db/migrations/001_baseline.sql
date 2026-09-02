-- Baseline: rappresenta lo schema già applicato al database di produzione al
-- 2 settembre 2026, cioè db/schema.sql nella sua interezza.
--
-- Su un database nuovo: applicare db/schema.sql, poi registrare questa
-- migrazione come già eseguita (lo fa `pnpm db:migrate`).
-- Sul database esistente: era già tutto applicato a mano, quindi questa
-- migrazione non esegue nulla.

select 1;
