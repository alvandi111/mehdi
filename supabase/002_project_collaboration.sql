-- Peymanyar v26 — project discussions, restricted audiences, comments and evidence.
create type public.discussion_status as enum ('open','reviewing','approved','changes_requested','closed');
create type public.discussion_priority as enum ('normal','important','urgent');
create type public.discussion_visibility as enum ('project','restricted');

create table public.discussion_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 180),
  body text not null check (char_length(body) between 1 and 10000),
  topic_type text not null default 'technical',
  priority public.discussion_priority not null default 'normal',
  status public.discussion_status not null default 'open',
  visibility public.discussion_visibility not null default 'project',
  created_by uuid not null references auth.users(id),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discussion_participants (
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key(thread_id,membership_id)
);

create table public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 10000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.discussion_attachments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  comment_id uuid references public.discussion_comments(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint not null default 0 check (file_size >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.can_access_discussion(target_thread uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.discussion_threads t
    where t.id=target_thread
      and public.is_workspace_member(t.workspace_id)
      and (
        t.visibility='project'
        or t.created_by=auth.uid()
        or public.workspace_role(t.workspace_id)='owner'
        or exists (
          select 1 from public.discussion_participants dp
          join public.memberships m on m.id=dp.membership_id
          where dp.thread_id=t.id and m.user_id=auth.uid() and m.status='active'
        )
      )
  );
$$;

alter table public.discussion_threads enable row level security;
alter table public.discussion_participants enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.discussion_attachments enable row level security;

create policy "discussion_read" on public.discussion_threads for select using (public.can_access_discussion(id));
create policy "discussion_create" on public.discussion_threads for insert with check (public.is_workspace_member(workspace_id) and created_by=auth.uid());
create policy "discussion_update" on public.discussion_threads for update using (created_by=auth.uid() or public.workspace_role(workspace_id) in ('owner','project_manager','site_supervisor')) with check (public.is_workspace_member(workspace_id));

create policy "participant_read" on public.discussion_participants for select using (public.can_access_discussion(thread_id));
create policy "participant_manage" on public.discussion_participants for all using (exists(select 1 from public.discussion_threads t where t.id=thread_id and (t.created_by=auth.uid() or public.workspace_role(t.workspace_id) in ('owner','project_manager')))) with check (exists(select 1 from public.discussion_threads t where t.id=thread_id and (t.created_by=auth.uid() or public.workspace_role(t.workspace_id) in ('owner','project_manager'))));

create policy "comment_read" on public.discussion_comments for select using (public.can_access_discussion(thread_id));
create policy "comment_create" on public.discussion_comments for insert with check (public.can_access_discussion(thread_id) and created_by=auth.uid());
create policy "comment_author_update" on public.discussion_comments for update using (created_by=auth.uid()) with check (created_by=auth.uid());

create policy "attachment_read" on public.discussion_attachments for select using (public.can_access_discussion(thread_id));
create policy "attachment_create" on public.discussion_attachments for insert with check (public.can_access_discussion(thread_id) and created_by=auth.uid());

create index discussion_threads_project_updated_idx on public.discussion_threads(project_id,updated_at desc);
create index discussion_threads_workspace_status_idx on public.discussion_threads(workspace_id,status);
create index discussion_comments_thread_created_idx on public.discussion_comments(thread_id,created_at);
create index discussion_attachments_thread_idx on public.discussion_attachments(thread_id);
