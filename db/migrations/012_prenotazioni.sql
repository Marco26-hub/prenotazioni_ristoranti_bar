-- Prenotazioni: richiesta, conferma, rifiuto.
--
-- Finora una prenotazione nasceva già 'confirmed': il locale non aveva modo
-- di dire di no, e il cliente riceveva un tavolo che nessuno aveva
-- verificato. Ora nasce 'pending' e resta tale finché una persona decide.

alter table reservations drop constraint if exists reservations_status_check;
alter table reservations add constraint reservations_status_check
  check (status in ('pending','confirmed','seated','no_show','cancelled','declined'));

alter table reservations
  -- Le richieste del cliente finivano appese al nome perché non c'era un
  -- campo: "Mario Rossi — tavolo vicino alla finestra" arrivava così in
  -- sala, e in una lista alfabetica quel nome non si trovava più.
  add column if not exists notes text,
  add column if not exists decline_reason text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists responded_by uuid references users(id),
  -- Se l'email non parte il locale deve saperlo e telefonare: una notifica
  -- fallita in silenzio è peggio di una prenotazione persa, perché il
  -- cliente si presenta convinto di avere il tavolo.
  add column if not exists guest_notified_at timestamptz,
  add column if not exists guest_notify_error text,
  add column if not exists venue_notified_at timestamptz,
  add column if not exists venue_notify_error text;

-- Le prenotazioni già inserite dallo staff erano confermate per definizione:
-- le ha scritte una persona del locale. Restano tali.

alter table venues
  -- Indirizzo che riceve le richieste. Spesso non è quello pubblico del
  -- locale: le prenotazioni le guarda una persona sola.
  add column if not exists reservation_email text,
  -- Chi ha i turni sempre liberi può accettare senza guardare. Chi no,
  -- lascia disattivato e decide a mano.
  add column if not exists reservation_auto_confirm boolean not null default false,
  add column if not exists reservation_capacity int;

create index if not exists idx_reservations_venue_data
  on reservations (venue_id, reserved_at);
