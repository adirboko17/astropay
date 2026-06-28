create table public.credential_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_credential_clients_name_lower
  on public.credential_clients (lower(trim(name)));

create trigger credential_clients_set_updated_at
  before update on public.credential_clients
  for each row
  execute function public.set_updated_at();

alter table public.credential_clients enable row level security;

revoke all on public.credential_clients from anon, authenticated;

alter table public.client_credentials
  add column if not exists client_id uuid references public.credential_clients (id) on delete set null;

create index if not exists idx_client_credentials_client_id
  on public.client_credentials (client_id);

insert into public.credential_clients (name)
select distinct trim(cc.client_name)
from public.client_credentials cc
where trim(cc.client_name) <> ''
  and not exists (
    select 1
    from public.credential_clients c
    where lower(trim(c.name)) = lower(trim(cc.client_name))
  );

update public.client_credentials cc
set client_id = c.id
from public.credential_clients c
where cc.client_id is null
  and lower(trim(c.name)) = lower(trim(cc.client_name));
