-- Personal cloud phase: isolated account backups, immutable private files, revision checks.
-- Run this file alone in Supabase SQL Editor. No old-table data is modified.
begin;
create table if not exists public.peymanyar_personal_snapshots (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0,
 payload jsonb not null,
 files jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 constraint peymanyar_snapshot_object check(jsonb_typeof(payload)='object'),
 constraint peymanyar_files_array check(jsonb_typeof(files)='array')
);
alter table public.peymanyar_personal_snapshots enable row level security;
revoke all on public.peymanyar_personal_snapshots from anon;
grant select,insert,update on public.peymanyar_personal_snapshots to authenticated;
drop policy if exists personal_snapshot_owner on public.peymanyar_personal_snapshots;
create policy personal_snapshot_owner on public.peymanyar_personal_snapshots for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create or replace function public.peymanyar_save_personal_snapshot(expected_user_id uuid,expected_revision bigint,new_payload jsonb,new_files jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare current_revision bigint; next_revision bigint;
begin
 if auth.uid() is null or auth.uid()<>expected_user_id then raise exception 'authentication_required'; end if;
 insert into public.peymanyar_personal_snapshots(user_id,payload) values(auth.uid(),'{}'::jsonb) on conflict(user_id) do nothing;
 select revision into current_revision from public.peymanyar_personal_snapshots where user_id=auth.uid() for update;
 if current_revision<>expected_revision then raise exception 'revision_conflict'; end if;
 next_revision:=current_revision+1;
 update public.peymanyar_personal_snapshots set revision=next_revision,payload=new_payload,files=new_files,updated_at=now() where user_id=auth.uid();
 return next_revision;
end $$;
revoke all on function public.peymanyar_save_personal_snapshot(uuid,bigint,jsonb,jsonb) from public,anon;
grant execute on function public.peymanyar_save_personal_snapshot(uuid,bigint,jsonb,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('peymanyar-private','peymanyar-private',false,52428800) on conflict(id) do nothing;
drop policy if exists personal_files_read on storage.objects;
create policy personal_files_read on storage.objects for select to authenticated using(bucket_id='peymanyar-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists personal_files_insert on storage.objects;
create policy personal_files_insert on storage.objects for insert to authenticated with check(bucket_id='peymanyar-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
