-- Peymanyar commercial core — multi-tenant schema for Supabase/Postgres.
create extension if not exists pgcrypto;

create type public.peymanyar_plan as enum ('professional','enterprise');
create type public.member_role as enum ('owner','project_manager','finance_manager','site_supervisor','observer','contractor','custom');
create type public.member_status as enum ('invited','active','suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null default 'construction_management',
  plan public.peymanyar_plan not null default 'professional',
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  invited_phone text,
  role public.member_role not null default 'observer',
  custom_permissions jsonb not null default '[]'::jsonb,
  project_ids uuid[] not null default '{}',
  status public.member_status not null default 'invited',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(workspace_id,user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  client text not null default '',
  location text not null default '',
  stage text not null default 'جدید',
  status text not null default 'active',
  budget numeric(18,0) not null default 0 check (budget >= 0),
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  start_date text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,name)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  role text not null default '',
  phone text,
  email text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  kind text not null check (kind in ('income','expense')),
  category text not null default 'سایر',
  amount numeric(18,0) not null check (amount > 0),
  jalali_date text not null,
  note text not null default '',
  status text not null default 'approved' check (status in ('draft','pending','approved','rejected')),
  approved_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  title text not null,
  amount numeric(18,0) not null default 0,
  jalali_date text,
  status text not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  jalali_date text not null,
  workers integer not null default 0,
  weather text not null default '',
  report_text text not null,
  progress numeric(5,2),
  status text not null default 'approved' check (status in ('draft','pending','approved','rejected')),
  approved_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  extracted_fields jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.memberships m where m.workspace_id=target_workspace and m.user_id=auth.uid() and m.status='active'); $$;

create or replace function public.workspace_role(target_workspace uuid)
returns public.member_role language sql stable security definer set search_path=public
as $$ select m.role from public.memberships m where m.workspace_id=target_workspace and m.user_id=auth.uid() and m.status='active' limit 1; $$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.people enable row level security;
alter table public.transactions enable row level security;
alter table public.contracts enable row level security;
alter table public.daily_reports enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy "profile_self" on public.profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "workspace_member_read" on public.workspaces for select using (public.is_workspace_member(id) or owner_id=auth.uid());
create policy "workspace_owner_update" on public.workspaces for update using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "workspace_create" on public.workspaces for insert with check (owner_id=auth.uid());
create policy "members_read" on public.memberships for select using (public.is_workspace_member(workspace_id));
create policy "members_owner_manage" on public.memberships for all using (public.workspace_role(workspace_id)='owner') with check (public.workspace_role(workspace_id)='owner');

create policy "projects_member_read" on public.projects for select using (public.is_workspace_member(workspace_id));
create policy "projects_manager_write" on public.projects for all using (public.workspace_role(workspace_id) in ('owner','project_manager')) with check (public.workspace_role(workspace_id) in ('owner','project_manager'));
create policy "people_member_read" on public.people for select using (public.is_workspace_member(workspace_id));
create policy "people_manager_write" on public.people for all using (public.workspace_role(workspace_id) in ('owner','project_manager','site_supervisor')) with check (public.workspace_role(workspace_id) in ('owner','project_manager','site_supervisor'));
create policy "transactions_finance_read" on public.transactions for select using (public.workspace_role(workspace_id) in ('owner','project_manager','finance_manager'));
create policy "transactions_finance_write" on public.transactions for all using (public.workspace_role(workspace_id) in ('owner','project_manager','finance_manager')) with check (public.workspace_role(workspace_id) in ('owner','project_manager','finance_manager'));
create policy "contracts_member_read" on public.contracts for select using (public.is_workspace_member(workspace_id));
create policy "contracts_manager_write" on public.contracts for all using (public.workspace_role(workspace_id) in ('owner','project_manager','finance_manager')) with check (public.workspace_role(workspace_id) in ('owner','project_manager','finance_manager'));
create policy "reports_member_read" on public.daily_reports for select using (public.is_workspace_member(workspace_id));
create policy "reports_field_write" on public.daily_reports for all using (public.workspace_role(workspace_id) in ('owner','project_manager','site_supervisor')) with check (public.workspace_role(workspace_id) in ('owner','project_manager','site_supervisor'));
create policy "documents_member_read" on public.documents for select using (public.is_workspace_member(workspace_id));
create policy "documents_member_write" on public.documents for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "audit_owner_read" on public.audit_logs for select using (public.workspace_role(workspace_id) in ('owner','project_manager'));

create index on public.memberships(workspace_id,user_id);
create index on public.projects(workspace_id);
create index on public.transactions(workspace_id,project_id,jalali_date);
create index on public.documents(workspace_id,project_id);
create index on public.audit_logs(workspace_id,created_at desc);

