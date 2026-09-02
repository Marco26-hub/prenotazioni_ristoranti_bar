alter table invoices
  add column if not exists customer_type text,
  add column if not exists customer_sdi_code text,
  add column if not exists customer_pec text,
  add column if not exists customer_country_code text,
  add column if not exists customer_tax_id text,
  add column if not exists customer_address text,
  add column if not exists customer_zip text,
  add column if not exists customer_city text,
  add column if not exists customer_province text;
