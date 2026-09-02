-- Compilazione della scheda vino da una foto dell'etichetta.
--
-- La chiave è del locale, non nostra: il costo delle chiamate è suo, e i
-- suoi dati non passano da un nostro account. Cifrata a riposo come gli
-- altri segreti dei fornitori.
--
-- Il modello è configurabile perché il catalogo di OpenRouter cambia in
-- continuazione: inchiodarne uno nel codice significa che fra sei mesi la
-- funzione smette di funzionare senza che nessuno abbia toccato nulla.

alter table venues
  add column if not exists openrouter_api_key text,
  add column if not exists openrouter_model text;
