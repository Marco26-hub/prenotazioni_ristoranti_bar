-- Rango: i tavoli assegnati a un cameriere.
--
-- Con più camerieri sui palmari, una lista con tutte le comande del locale è
-- rumore: ognuno deve vedere prima i tavoli suoi. È anche come si lavora
-- davvero in sala — il rango esiste da prima dei palmari.
--
-- Un tavolo ha un cameriere per volta, un cameriere ha molti tavoli: la
-- colonna sta sul tavolo. ON DELETE SET NULL e non CASCADE: se un addetto
-- lascia il locale il tavolo deve restare, semplicemente senza rango.

alter table tables
  add column if not exists assigned_to uuid references users(id) on delete set null;

create index if not exists idx_tables_assigned
  on tables (venue_id, assigned_to) where assigned_to is not null;
