-- Formato del locale e tipo di gruppo di scelte.
--
-- Un menu di pizzeria e uno di steak house non si compilano allo stesso
-- modo: cambiano le categorie, i gruppi di scelte e — soprattutto — gli
-- obblighi che il ristoratore dimentica. Sapere che locale è permette di
-- proporgli la struttura giusta invece di una pagina vuota.

alter table venues
  add column if not exists venue_type text not null default 'ristorante';

-- Nessun vincolo di enumerazione: i formati crescono col mercato, e un
-- check da modificare a ogni aggiunta è un vincolo che lavora contro.

-- Le rimozioni sono strutturalmente scelte a costo zero, ma vanno mostrate
-- e stampate in modo opposto: "senza cipolla", non "cipolla". Senza questa
-- distinzione la comanda direbbe al cuoco di aggiungere ciò che il cliente
-- ha tolto.
alter table menu_option_groups
  add column if not exists kind text not null default 'scelta'
    check (kind in ('scelta', 'aggiunta', 'rimozione'));
