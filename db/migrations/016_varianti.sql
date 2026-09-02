-- Varianti, aggiunte e scelte obbligatorie sui piatti.
--
-- Senza questo ogni prezzo è un piatto a sé: un sushi da 6, 12 e 24 pezzi
-- diventa tre voci di menu, e "avocado +2 €" non è esprimibile. È il motivo
-- per cui un giapponese o una pizzeria non potrebbero caricare il proprio
-- menu così com'è.
--
-- Due tabelle e non un jsonb, a differenza delle traduzioni: le opzioni
-- vanno interrogate per sé — quali sono esaurite, quali si vendono di più —
-- e un campo jsonb renderebbe quelle domande scomode.

create table if not exists menu_option_groups (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade not null,
  menu_item_id uuid references menu_items(id) on delete cascade not null,
  name text not null,                    -- "Quanti pezzi", "Cottura", "Aggiunte"
  -- Obbligatorio: il cliente deve scegliere prima di poter aggiungere al
  -- carrello. Una bistecca senza cottura indicata è una comanda incompleta.
  required boolean not null default false,
  min_choices int not null default 0,
  max_choices int not null default 1,    -- >1 permette più aggiunte insieme
  sort_order int not null default 0,
  translations jsonb not null default '{}'::jsonb,
  constraint scelte_coerenti check (min_choices >= 0 and max_choices >= 1
                                    and min_choices <= max_choices)
);

create table if not exists menu_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references menu_option_groups(id) on delete cascade not null,
  name text not null,                    -- "12 pezzi", "Al sangue", "Avocado"
  -- Differenza sul prezzo base, anche negativa: la porzione piccola costa
  -- meno, e senza segno servirebbe un piatto separato.
  price_delta_cents int not null default 0,
  available boolean not null default true,
  sort_order int not null default 0,
  translations jsonb not null default '{}'::jsonb
);

create index if not exists idx_option_groups_item on menu_option_groups (menu_item_id);
create index if not exists idx_options_group on menu_options (group_id);

-- Le scelte fatte restano scritte sulla riga d'ordine: il menu cambia, la
-- comanda già passata in cucina no. `unit_price_cents` comprende già i
-- supplementi, così i totali storici non vanno ricalcolati.
alter table order_items
  add column if not exists selected_options jsonb not null default '[]'::jsonb;
