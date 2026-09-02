-- Mittente email proprio del locale.
--
-- Di base le email partono dall'account della piattaforma: un ristoratore
-- non crea un account Resend e non configura record DNS, e chiedergli di
-- farlo significa che le prenotazioni non partiranno mai.
--
-- Chi però tiene al marchio proprio — è il senso del white label — può
-- collegare il proprio dominio e far arrivare le conferme da
-- prenotazioni@ilsuoristorante.it invece che dal nostro.
--
-- La chiave è cifrata a riposo come gli altri segreti dei fornitori: chi
-- leggesse la tabella potrebbe altrimenti mandare email a nome del locale.

alter table venues
  add column if not exists resend_api_key text,
  add column if not exists resend_from text;
