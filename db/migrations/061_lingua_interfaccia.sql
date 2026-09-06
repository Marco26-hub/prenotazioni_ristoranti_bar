-- La lingua dell'interfaccia di chi lavora nel locale.
--
-- Sta sull'utente e non sul locale perché in cucina e in sala non parlano
-- necessariamente la stessa lingua del titolare: in un all you can eat a
-- gestione cinese il proprietario può volere il gestionale in inglese e il
-- cameriere italiano volerlo in italiano, sullo stesso locale.
--
-- Nullo significa "non ha scelto": in quel caso decide il browser, che è
-- l'unica informazione che abbiamo al primo accesso.
alter table users add column if not exists lingua_ui text
  check (lingua_ui is null or lingua_ui in ('it', 'en'));

-- Il locale può avere una lingua predefinita per le pagine pubbliche, così un
-- locale in zona turistica parte in inglese invece di far cercare il
-- selettore a ogni cliente. Resta un ripiego: la lingua del telefono di chi
-- inquadra il QR vince comunque, perché è più precisa.
alter table venues add column if not exists lingua_predefinita text not null default 'it'
  check (lingua_predefinita in ('it', 'en'));
