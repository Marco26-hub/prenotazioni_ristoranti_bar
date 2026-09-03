-- Chiamate dal tavolo: il cliente chiede qualcosa che il software non può dare.
--
-- Il caso che conta è il contante. Un conto pagato in contanti non passa da
-- nessun circuito: qualcuno deve andare al tavolo, incassare e portare il
-- documento fiscale. Finché non esisteva questo, l'unico modo per dirlo era
-- alzare la mano e sperare che passasse un cameriere — cioè il motivo per cui
-- il cliente ha scaricato il menu digitale.
--
-- Tabella propria e non un campo sulla sessione: di chiamate ne arrivano più
-- d'una nella stessa serata, e a fine servizio si vuole sapere quante e
-- quanto ci si è messi a rispondere.

create table if not exists table_calls (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  table_session_id uuid references table_sessions(id) on delete cascade not null,
  motivo text not null check (motivo in ('contanti', 'cameriere', 'conto')),
  -- Solo per il contante: cosa deve portare al tavolo.
  documento text check (documento in ('scontrino', 'fattura')),
  nota text,
  created_at timestamptz not null default now(),
  -- Chi è andato e quando: senza, "ci pensa qualcuno" e non ci va nessuno.
  handled_at timestamptz,
  handled_by uuid references users(id)
);

create index if not exists idx_table_calls_aperte
  on table_calls (venue_id, created_at desc) where handled_at is null;

-- Una chiamata aperta per volta e per motivo: il cliente che preme tre volte
-- perché non vede arrivare nessuno non deve generare tre righe da smaltire.
create unique index if not exists uq_table_call_aperta
  on table_calls (table_session_id, motivo) where handled_at is null;
