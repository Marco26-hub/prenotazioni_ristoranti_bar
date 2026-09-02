-- Abbonamento della piattaforma: il locale paga noi per usare il servizio.
--
-- Da non confondere con `stripe_account_id`, che è il Connect account con cui
-- il locale incassa dai propri clienti. Sono due flussi di denaro opposti e
-- vivono su due webhook distinti: qui l'account della piattaforma, lì gli
-- eventi Connect.

alter table venues
  add column if not exists billing_customer_id text unique,
  add column if not exists subscription_id text unique,
  add column if not exists subscription_status text not null default 'none',
  add column if not exists subscription_plan text,
  add column if not exists subscription_period_end timestamptz,
  add column if not exists trial_ends_at timestamptz;

-- Gli stati sono quelli di Stripe più 'none' per chi non ha mai sottoscritto.
-- 'incomplete'/'unpaid' esistono davvero lato Stripe: se non fossero ammessi
-- il webhook fallirebbe in silenzio proprio quando un pagamento va storto.
alter table venues drop constraint if exists venues_subscription_status_check;
alter table venues add constraint venues_subscription_status_check
  check (subscription_status in (
    'none','trialing','active','past_due','canceled','incomplete','unpaid'
  ));

-- Il webhook di Stripe non garantisce l'ordine di consegna: un
-- customer.subscription.updated può arrivare dopo il .deleted che lo annulla.
-- Serve sapere a quale versione dell'oggetto si riferisce ciò che si è già
-- scritto, altrimenti un evento in ritardo riattiva un abbonamento disdetto.
alter table venues
  add column if not exists subscription_updated_at timestamptz;

create index if not exists idx_venues_subscription_status
  on venues (subscription_status);
