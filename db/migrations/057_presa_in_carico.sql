-- Quando un documento e' stato preso in carico, non quando e' nato.
--
-- Il recupero dei documenti rimasti 'in_corso' guardava created_at: un
-- documento nato piu' di cinque minuti fa veniva riconsegnato a OGNI
-- interrogazione, anche se una cassa lo stava stampando proprio in quel
-- momento. Con due casse accese -- o con una sola e una stampante lenta --
-- lo stesso scontrino usciva piu' volte, cioe' lo stesso incasso dichiarato
-- due volte.
--
-- Serve sapere quando e' stato consegnato, che e' un'altra cosa.
alter table fiscal_documents
  add column if not exists preso_at timestamptz;
