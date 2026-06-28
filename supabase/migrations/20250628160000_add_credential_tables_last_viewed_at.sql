alter table public.credential_tables
  add column if not exists last_viewed_at timestamptz;

create index if not exists idx_credential_tables_last_viewed_at
  on public.credential_tables (last_viewed_at desc nulls last);
