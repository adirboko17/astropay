-- Initial schema for PayPlus recurring billing management

create table public.recurring_clients (
  id uuid primary key default gen_random_uuid(),
  payplus_customer_uid text,
  payplus_recurring_uid text unique,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  website_url text,
  monthly_amount numeric not null,
  currency text not null default 'ILS',
  billing_day int,
  next_billing_date date,
  recurring_status text,
  current_month_status text not null default 'unknown',
  last_successful_charge_at timestamptz,
  last_failed_charge_at timestamptz,
  last_failure_reason text,
  source text not null default 'payplus',
  raw_payplus_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recurring_charge_checks (
  id uuid primary key default gen_random_uuid(),
  recurring_client_id uuid not null references public.recurring_clients (id) on delete cascade,
  payplus_transaction_uid text,
  payplus_recurring_uid text,
  check_month text not null,
  amount numeric not null,
  currency text not null default 'ILS',
  status text not null,
  failure_reason text,
  charged_at timestamptz,
  raw_payplus_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.billing_alerts (
  id uuid primary key default gen_random_uuid(),
  recurring_client_id uuid not null references public.recurring_clients (id) on delete cascade,
  alert_type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_recurring_clients_payplus_recurring_uid
  on public.recurring_clients (payplus_recurring_uid);

create index idx_recurring_clients_payplus_customer_uid
  on public.recurring_clients (payplus_customer_uid);

create index idx_recurring_clients_current_month_status
  on public.recurring_clients (current_month_status);

create index idx_recurring_charge_checks_check_month
  on public.recurring_charge_checks (check_month);

create index idx_recurring_charge_checks_status
  on public.recurring_charge_checks (status);

create index idx_billing_alerts_is_read
  on public.billing_alerts (is_read);

create index idx_recurring_charge_checks_recurring_client_id
  on public.recurring_charge_checks (recurring_client_id);

create index idx_billing_alerts_recurring_client_id
  on public.billing_alerts (recurring_client_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recurring_clients_set_updated_at
  before update on public.recurring_clients
  for each row
  execute function public.set_updated_at();

alter table public.recurring_clients enable row level security;
alter table public.recurring_charge_checks enable row level security;
alter table public.billing_alerts enable row level security;

revoke all on public.recurring_clients from anon, authenticated;
revoke all on public.recurring_charge_checks from anon, authenticated;
revoke all on public.billing_alerts from anon, authenticated;
