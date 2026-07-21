-- PayPlus daily sync: pg_cron invokes Edge Function via pg_net + Vault secret.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.recurring_charge_checks
  add column if not exists payplus_charge_uid text;

create unique index if not exists idx_recurring_charge_checks_payplus_charge_uid
  on public.recurring_charge_checks (payplus_charge_uid)
  where payplus_charge_uid is not null;

create or replace function public.invoke_payplus_daily_sync()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, net
as $$
declare
  request_id bigint;
  cron_secret text;
  project_url text := 'https://jiakqbgnuqsmncpuxdii.supabase.co';
begin
  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'payplus_cron_secret'
  limit 1;

  if cron_secret is null or length(trim(cron_secret)) = 0 then
    raise warning 'PayPlus daily sync skipped: vault secret payplus_cron_secret is missing';
    return null;
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/sync-payplus-recurring-customers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := '{}'::jsonb
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_payplus_daily_sync() from public;
grant execute on function public.invoke_payplus_daily_sync() to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'sync-payplus-daily'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'sync-payplus-daily',
    '0 6 * * *',
    'select public.invoke_payplus_daily_sync();'
  );
end;
$$;

comment on function public.invoke_payplus_daily_sync is
  'Calls PayPlus sync Edge Function. Requires vault secret payplus_cron_secret matching PAYPLUS_CRON_SECRET on the function.';
