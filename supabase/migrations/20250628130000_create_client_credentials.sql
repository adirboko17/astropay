create table public.client_credentials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  platform text not null,
  service_label text,
  login_email text,
  login_username text,
  password text,
  dashboard_url text,
  website_url text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_client_credentials_client_name
  on public.client_credentials (client_name);

create index idx_client_credentials_platform
  on public.client_credentials (platform);

create trigger client_credentials_set_updated_at
  before update on public.client_credentials
  for each row
  execute function public.set_updated_at();

alter table public.client_credentials enable row level security;

revoke all on public.client_credentials from anon, authenticated;
