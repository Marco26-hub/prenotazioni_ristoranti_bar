-- Le colonne subscription_status/subscription_plan esistevano già da un
-- abbozzo precedente, con default 'trialing' e 'starter'. La 007 usava
-- `add column if not exists`, quindi non le ha toccate: ogni locale restava
-- "in prova" a tempo indeterminato e il controllo sull'abbonamento non
-- bloccava nulla — servizio gratuito per sempre, senza che si vedesse.

alter table venues alter column subscription_status set default 'none';
alter table venues alter column subscription_status set not null;
alter table venues alter column subscription_plan drop default;

-- Chi risulta in prova senza essere mai passato da Stripe riceve una prova
-- vera, con una scadenza. Senza data la prova non finirebbe mai.
update venues
set subscription_period_end = coalesce(subscription_period_end, now() + interval '14 days'),
    trial_ends_at = coalesce(trial_ends_at, now() + interval '14 days'),
    subscription_plan = null
where subscription_status = 'trialing'
  and subscription_id is null;

-- 'starter' non è mai stato un piano reale: non corrisponde a nessun Price.
update venues set subscription_plan = null where subscription_plan = 'starter';
