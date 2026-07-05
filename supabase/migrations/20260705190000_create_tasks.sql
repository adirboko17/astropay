-- Tasks CRM: tasks grouped by customer / project / other, with subtasks and assignees.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'other' check (category in ('customer', 'project', 'other')),
  customer_id uuid references public.credential_clients (id) on delete set null,
  assignee text check (assignee in ('אדיר', 'איתי')),
  status text not null default 'open' check (status in ('open', 'done')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null,
  assignee text check (assignee in ('אדיר', 'איתי')),
  status text not null default 'open' check (status in ('open', 'done')),
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_customer_id on public.tasks (customer_id);
create index idx_tasks_status on public.tasks (status);
create index idx_tasks_category on public.tasks (category);
create index idx_task_subtasks_task_id on public.task_subtasks (task_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

create trigger task_subtasks_set_updated_at
  before update on public.task_subtasks
  for each row
  execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.task_subtasks enable row level security;

revoke all on public.tasks from anon, authenticated;
revoke all on public.task_subtasks from anon, authenticated;

alter table public.tasks add column if not exists context_label text;
