-- Il vincolo sul reparto non puo' piu' essere un elenco chiuso.
--
-- Ammetteva quattro valori: cucina, bar, pizzeria, pasticceria. Ma le
-- postazioni ora le decide il locale -- c'e' chi ha due cucine, chi il forno
-- separato dalla friggitoria, chi chiama "pass" il punto in cui la sala
-- ritira -- e un elenco chiuso nel database rende impossibile crearne una
-- nuova: l'inserimento fallisce e la pagina risponde con un errore che non
-- spiega niente.
--
-- Resta un vincolo di forma: la chiave finisce nelle comande e nei permessi,
-- e deve restare confrontabile. Senza, "Cucina", "cucina" e "CUCINA"
-- diventano tre postazioni diverse e chi ha il permesso su una non ce l'ha
-- sulle altre.
do $$
begin
  alter table menu_categories drop constraint if exists menu_categories_reparto_check;
  alter table menu_categories add constraint menu_categories_reparto_check
    check (reparto ~ '^[a-z0-9_-]{1,32}$');
end $$;
