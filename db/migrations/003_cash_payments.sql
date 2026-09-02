-- Incasso al banco / in contanti.
--
-- Finora payments ammetteva solo metodi elettronici e provider esterni:
-- un conto saldato in cassa sarebbe stato registrato come pagamento con
-- carta, falsando l'incasso di giornata e la riconciliazione con Stripe.

alter table payments drop constraint if exists payments_method_check;
alter table payments add constraint payments_method_check
  check (method in ('card','apple_pay','google_pay','satispay','cash'));

alter table payments drop constraint if exists payments_provider_check;
alter table payments add constraint payments_provider_check
  check (provider in ('stripe','satispay','manual'));
