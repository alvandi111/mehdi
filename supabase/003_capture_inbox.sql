-- Peymanyar v27 — non-blocking voice capture and deferred completion inbox.
create type public.capture_status as enum ('captured','materialized','needs_review','failed');
create type public.completion_status as enum ('open','done','dismissed');

create table public.capture_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_type text not null,
  raw_text text not null default '',
  jalali_date text not null,
  date_source text not null default 'default',
  payload jsonb not null default '{}'::jsonb,
  status public.capture_status not null default 'captured',
  materialized_entity_type text,
  materialized_entity_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.completion_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  capture_event_id uuid references public.capture_events(id) on delete cascade,
  entity_type text,
  entity_id uuid,
  task_type text not null,
  title text not null,
  event_jalali_date text,
  status public.completion_status not null default 'open',
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.capture_events enable row level security;
alter table public.completion_tasks enable row level security;

create policy "capture_member_read" on public.capture_events for select
  using (public.is_workspace_member(workspace_id));
create policy "capture_member_create" on public.capture_events for insert
  with check (public.is_workspace_member(workspace_id) and (created_by=auth.uid() or created_by is null));
create policy "capture_manager_update" on public.capture_events for update
  using (public.workspace_role(workspace_id) in ('owner','project_manager','finance_manager','site_supervisor'))
  with check (public.is_workspace_member(workspace_id));

create policy "completion_member_read" on public.completion_tasks for select
  using (public.is_workspace_member(workspace_id));
create policy "completion_member_create" on public.completion_tasks for insert
  with check (public.is_workspace_member(workspace_id));
create policy "completion_member_update" on public.completion_tasks for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create index capture_events_workspace_date_idx on public.capture_events(workspace_id,jalali_date,created_at desc);
create index capture_events_workspace_status_idx on public.capture_events(workspace_id,status);
create index completion_tasks_workspace_status_idx on public.completion_tasks(workspace_id,status,created_at desc);
create index completion_tasks_project_idx on public.completion_tasks(project_id,status);
