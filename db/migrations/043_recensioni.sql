-- Recensioni lasciate dal tavolo.
--
-- Il momento giusto e' quello: si e' appena mangiato, il telefono e' gia' in
-- mano e il menu e' gia' aperto. Chiedere per email il giorno dopo ottiene
-- una risposta su venti.
--
-- Restano al locale, non vengono pubblicate da nessuna parte: servono a
-- sapere com'e' andata mentre si puo' ancora rimediare. Il link a Google, se
-- il locale lo imposta, viene mostrato a tutti allo stesso modo dopo aver
-- lasciato il voto -- mai solo a chi ha messo cinque stelle, che e' contro
-- le regole di Google e, a parte quello, e' disonesto.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  -- Da quale tavolo e quale servizio: serve a leggere il voto insieme a
  -- quello che era stato ordinato e a chi era in sala.
  table_session_id uuid references table_sessions(id) on delete set null,
  voto smallint not null check (voto between 1 and 5),
  commento text,
  nome text,
  created_at timestamptz not null default now(),
  -- Letta dal ristoratore: quello che non ha ancora guardato resta in
  -- evidenza, o le recensioni diventano un archivio che nessuno apre.
  letta_at timestamptz
);

-- Una per servizio. Senza, bastava premere invio dieci volte per affossare
-- la media, e il tavolo accanto non c'entrava niente.
create unique index if not exists uq_recensione_sessione
  on reviews (table_session_id) where table_session_id is not null;

create index if not exists idx_recensioni_locale
  on reviews (venue_id, created_at desc);

-- Il link pubblico (google_review_url) c'e' gia' dalla 004: qui si aggiunge
-- solo il posto dove finiscono i voti.
