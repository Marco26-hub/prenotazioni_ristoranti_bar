create table if not exists reservation_tables (
  reservation_id uuid references reservations(id) on delete cascade not null,
  table_id uuid references tables(id) not null,
  primary key (reservation_id, table_id)
);

create index if not exists idx_reservation_tables_table
  on reservation_tables (table_id);

-- Conserva le assegnazioni singole gia presenti nella colonna storica.
insert into reservation_tables (reservation_id, table_id)
select id, table_id from reservations where table_id is not null
on conflict do nothing;
