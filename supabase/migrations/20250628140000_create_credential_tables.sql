create table public.credential_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_credentials
  add column if not exists table_id uuid references public.credential_tables (id) on delete cascade;

insert into public.credential_tables (name)
select distinct trim(platform)
from public.client_credentials
where platform is not null
  and trim(platform) <> ''
  and not exists (
    select 1
    from public.credential_tables ct
    where lower(ct.name) = lower(trim(public.client_credentials.platform))
  );

update public.client_credentials cc
set table_id = ct.id
from public.credential_tables ct
where cc.table_id is null
  and cc.platform is not null
  and lower(trim(cc.platform)) = lower(ct.name);

create index if not exists idx_client_credentials_table_id
  on public.client_credentials (table_id);

create index if not exists idx_credential_tables_name
  on public.credential_tables (name);

create trigger credential_tables_set_updated_at
  before update on public.credential_tables
  for each row
  execute function public.set_updated_at();

alter table public.credential_tables enable row level security;

revoke all on public.credential_tables from anon, authenticated;
