-- Collegamento al registratore telematico.
--
-- Il gestionale incassa, ma il documento commerciale lo emette il
-- registratore: finora il locale lo batteva a mano sulla propria cassa, cioe'
-- doppia digitazione e -- dal 1 gennaio 2026, con l'obbligo di collegare POS
-- e RT e l'incrocio fra dati degli acquirer e corrispettivi giornalieri --
-- un rischio, non solo un fastidio.
--
-- La stampante sta nel locale e questo server sta altrove: non la
-- raggiungiamo. Quindi qui si tiene una coda, e un piccolo agente che gira
-- sul computer della cassa la svuota parlando con la stampante sulla rete
-- locale. Chi non vuole installare niente resta in "manuale": il documento
-- resta da battere e il gestionale gli prepara il riepilogo, invece di
-- fingere che sia fatto.

alter table venues
  add column if not exists rt_attivo boolean not null default false,
  -- 'agente': lo svuota il programma sul computer della cassa.
  -- 'manuale': si batte a mano, noi prepariamo il riepilogo.
  add column if not exists rt_modalita text not null default 'manuale'
    check (rt_modalita in ('manuale', 'agente')),
  -- Matricola del registratore, quella comunicata all'Agenzia.
  add column if not exists rt_matricola text,
  -- Solo l'impronta: il segreto lo vede il locale una volta sola, quando lo
  -- genera. Tenerlo in chiaro qui vorrebbe dire che chi legge il database
  -- puo' far finta di essere la cassa di un locale.
  add column if not exists rt_agente_hash text,
  add column if not exists rt_agente_visto_at timestamptz;

comment on column venues.rt_modalita is
  'agente = un programma sulla cassa svuota la coda; manuale = si batte a mano.';

-- ------------------------------------------------------------
-- I documenti commerciali da emettere
-- ------------------------------------------------------------
--
-- Una riga per conto chiuso. Nasce quando il tavolo si chiude, qualunque sia
-- il modo in cui e' stato pagato, perche' e' l'incasso che va certificato --
-- non il metodo.

create table if not exists fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  table_session_id uuid references table_sessions(id) on delete set null,

  totale_cents int not null check (totale_cents >= 0),
  -- Le righe come sono state pagate: descrizione, quantita', prezzo,
  -- aliquota. Salvate qui e non ricalcolate, perche' il documento certifica
  -- quello che e' stato incassato quel giorno, e il menu intanto cambia.
  righe jsonb not null default '[]'::jsonb,
  -- Quanto per ciascun metodo: { "card": 4200, "cash": 1000 }. Dal 2026 il
  -- documento commerciale deve riportarlo, e l'Agenzia lo incrocia con i
  -- dati degli acquirer.
  pagamenti jsonb not null default '{}'::jsonb,

  stato text not null default 'da_emettere'
    check (stato in ('da_emettere', 'in_corso', 'emesso', 'errore', 'battuto_a_mano')),

  -- Riempiti dalla stampante quando risponde.
  numero_documento text,
  rt_matricola text,
  emesso_at timestamptz,

  errore text,
  tentativi int not null default 0,
  -- Giornata di servizio: i corrispettivi si chiudono per giornata, non a
  -- mezzanotte.
  service_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fiscali_coda
  on fiscal_documents (venue_id, stato, created_at)
  where stato in ('da_emettere', 'errore');

create index if not exists idx_fiscali_giornata
  on fiscal_documents (venue_id, service_date desc);

-- Un documento per conto: chiudere due volte lo stesso tavolo non deve
-- emettere due scontrini, che sarebbe un corrispettivo raddoppiato.
create unique index if not exists uq_fiscale_sessione
  on fiscal_documents (table_session_id) where table_session_id is not null;
