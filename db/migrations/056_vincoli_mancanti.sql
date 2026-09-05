-- Due vincoli che la produzione ha e schema.sql no.
--
-- responded_by dice chi ha risposto a una prenotazione, ma senza chiave
-- esterna poteva contenere l'identificativo di un utente cancellato: il
-- pannello mostra "risposto da" e non trova nessuno.
--
-- Il resto lo fa gia' l'ordine giusto delle colonne; qui c'e' solo cio' che
-- mancava. Il confronto ora si fa anche sui vincoli, non piu' sulle sole
-- colonne e sugli indici: era la lacuna che ha fatto passare inosservato per
-- settimane il vincolo degli stati prenotazione.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'reservations'::regclass
       and contype = 'f'
       and conname like '%responded_by%'
  ) then
    alter table reservations
      add constraint reservations_responded_by_fkey
      foreign key (responded_by) references users(id);
  end if;
end $$;
