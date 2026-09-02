-- Accettazione dell'accordo di nomina a responsabile del trattamento
-- (art. 28 GDPR).
--
-- L'accordo è obbligatorio: il locale è titolare dei dati dei propri clienti
-- e noi li trattiamo per suo conto. Senza un atto scritto, il trattamento è
-- privo di base contrattuale e la violazione è di entrambe le parti.
--
-- La versione serve perché un accordo modificato va riaccettato: senza
-- tenerne traccia non si saprebbe più a quale testo il locale ha aderito.

alter table venues
  add column if not exists dpa_accepted_at timestamptz,
  add column if not exists dpa_version text;

-- I locali già registrati prima di questa migrazione non hanno accettato
-- nulla: restano a NULL e il gestionale glielo chiede al primo accesso.
-- Segnarli come accettanti sarebbe una firma messa da noi al posto loro.
