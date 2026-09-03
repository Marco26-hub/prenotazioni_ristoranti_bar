-- Dopo quanti minuti dal saldo un tavolo pagato va recuperato.
--
-- Un tavolo che ha pagato e resta seduto non è un problema: è il caffè, è il
-- conto appena arrivato, sono i cappotti. Diventa un problema dopo un po',
-- quando fuori c'è gente in attesa e quel coperto è già incassato.
--
-- Soglia separata da quella dei ritardi in cucina: sono due tempi diversi e
-- accomunarli costringerebbe a sbagliarne uno. Zero spegne l'avviso.

alter table venues
  add column if not exists soglia_liberazione_min smallint not null default 15;

alter table venues
  drop constraint if exists venues_soglia_liberazione_check;

alter table venues
  add constraint venues_soglia_liberazione_check
  check (soglia_liberazione_min between 0 and 240);
