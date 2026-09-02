alter table invoices
  add column if not exists customer_first_name text,
  add column if not exists customer_last_name text,
  add column if not exists customer_company_name text,
  add column if not exists customer_email text,
  add column if not exists emailed_at timestamptz;
