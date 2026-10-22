begin;
create schema if not exists peymanyar_private;
revoke all on schema peymanyar_private from public,anon;
grant usage on schema peymanyar_private to authenticated;
create table peymanyar_private.admins(user_id uuid primary key references auth.users(id));
create table peymanyar_private.licences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','active','suspended')),
 plan text not null default 'trial',expires_at timestamptz,
 features jsonb not null default '{"speech":true,"ai":true}',
 quotas jsonb not null default '{"speech":100,"ai":50}',
 created_at timestamptz not null default now(),last_seen timestamptz,
 request_note text not null default ''
);
create table peymanyar_private.invites(
 id uuid primary key default gen_random_uuid(),token_hash bytea not null unique,
 label text not null,email text,trial_days integer not null check(trial_days between 1 and 365),
 max_uses integer not null check(max_uses between 1 and 100),uses integer not null default 0,
 valid_until timestamptz not null,disabled boolean not null default false,
 features jsonb not null,quotas jsonb not null,created_at timestamptz not null default now()
);
create table peymanyar_private.redemptions(user_id uuid primary key references auth.users(id),invite_id uuid references peymanyar_private.invites(id),created_at timestamptz default now());
create table peymanyar_private.usage(user_id uuid references auth.users(id),month date,feature text,used integer not null default 0,primary key(user_id,month,feature));
create table peymanyar_private.audit(id bigint generated always as identity primary key,actor uuid,action text,subject text,created_at timestamptz default now());
alter table peymanyar_private.admins enable row level security;
alter table peymanyar_private.licences enable row level security;
alter table peymanyar_private.invites enable row level security;
alter table peymanyar_private.redemptions enable row level security;
alter table peymanyar_private.usage enable row level security;
alter table peymanyar_private.audit enable row level security;
revoke all on all tables in schema peymanyar_private from public,anon,authenticated;
-- Bootstrap the verified system owner privately before enabling this migration.
insert into peymanyar_private.licences(user_id,status,plan) select user_id,'active','owner' from peymanyar_private.admins;
create function peymanyar_private.allowed(write_access boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select from peymanyar_private.licences l where l.user_id=auth.uid() and l.status='active' and (not write_access or l.expires_at is null or l.expires_at>now()));
$$;
revoke all on function peymanyar_private.allowed(boolean) from public,anon;
grant execute on function peymanyar_private.allowed(boolean) to authenticated;
create function peymanyar_private.access(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();admin boolean;email text;confirmed timestamptz;l peymanyar_private.licences;i peymanyar_private.invites;token text;target uuid;result jsonb;feat text;n integer;lim integer;mon date:=date_trunc('month',now() at time zone 'UTC')::date;
begin
 if u is null then raise exception 'authentication_required';end if;
 select a.email,a.email_confirmed_at into email,confirmed from auth.users a where a.id=u;
 if confirmed is null then raise exception 'verified_email_required';end if;
 select exists(select from peymanyar_private.admins where user_id=u) into admin;
 insert into peymanyar_private.licences(user_id) values(u) on conflict do nothing;
 if action in ('create_invite','revoke_invite','list_users','list_invites','set_user','audit') and not admin then raise exception 'admin_required';end if;
 if action='state' then
  update peymanyar_private.licences set last_seen=now() where user_id=u returning * into l;
  return jsonb_build_object('admin',admin,'user_id',u,'email',email,'status',l.status,'plan',l.plan,'expires_at',l.expires_at,'features',l.features,'quotas',l.quotas,'read',peymanyar_private.allowed(false),'write',peymanyar_private.allowed(true),'usage',coalesce((select jsonb_object_agg(feature,used) from peymanyar_private.usage where user_id=u and month=mon),'{}'::jsonb));
 elsif action='redeem' then
  select * into l from peymanyar_private.licences where user_id=u for update;
  if l.status<>'pending' or exists(select from peymanyar_private.redemptions where user_id=u) then raise exception 'invite_already_used_or_account_active';end if;
  select * into i from peymanyar_private.invites where token_hash=extensions.digest(coalesce(args->>'token',''),'sha256') for update;
  if i.id is null or i.disabled or i.valid_until<=now() or i.uses>=i.max_uses or (i.email is not null and lower(i.email)<>lower(email)) then raise exception 'invite_invalid_expired_or_wrong_email';end if;
  insert into peymanyar_private.redemptions(user_id,invite_id) values(u,i.id);
  update peymanyar_private.invites set uses=uses+1 where id=i.id;
  update peymanyar_private.licences set status='active',plan='trial',expires_at=now()+make_interval(days=>i.trial_days),features=i.features,quotas=i.quotas where user_id=u;
 elsif action='create_invite' then
  token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into peymanyar_private.invites(token_hash,label,email,trial_days,max_uses,valid_until,features,quotas)
  values(extensions.digest(token,'sha256'),left(coalesce(args->>'label','دعوت آزمایشی'),100),nullif(lower(trim(args->>'email')),''),coalesce((args->>'days')::integer,60),coalesce((args->>'max_uses')::integer,1),now()+make_interval(days=>least(90,greatest(1,coalesce((args->>'valid_days')::integer,7)))),jsonb_build_object('speech',coalesce((args->>'speech')::boolean,true),'ai',coalesce((args->>'ai')::boolean,true)),jsonb_build_object('speech',least(100000,greatest(0,coalesce((args->>'speech_limit')::integer,100))))||jsonb_build_object('ai',least(100000,greatest(0,coalesce((args->>'ai_limit')::integer,50))))) returning * into i;
  insert into peymanyar_private.audit(actor,action,subject) values(u,action,i.id::text);
  return jsonb_build_object('id',i.id,'token',token);
 elsif action='revoke_invite' then
  update peymanyar_private.invites set disabled=true where id=(args->>'id')::uuid;
 elsif action='list_invites' then
  return coalesce((select jsonb_agg(to_jsonb(t)) from (select inv.id,inv.label,inv.email,inv.trial_days,inv.max_uses,inv.uses,inv.valid_until,inv.disabled,inv.created_at from peymanyar_private.invites inv order by inv.created_at desc limit 100)t),'[]');
 elsif action='list_users' then
  return coalesce((select jsonb_agg(to_jsonb(t)) from (select lic.*,a.email,exists(select from peymanyar_private.admins ad where ad.user_id=lic.user_id) as admin,coalesce((select jsonb_object_agg(x.feature,x.used) from peymanyar_private.usage x where x.user_id=lic.user_id and x.month=mon),'{}') as usage from peymanyar_private.licences lic join auth.users a on a.id=lic.user_id order by lic.created_at desc limit 500)t),'[]');
 elsif action='set_user' then
  target:=(args->>'user_id')::uuid;
  if exists(select from peymanyar_private.admins where user_id=target) then raise exception 'owner_protected';end if;
  if args->>'status' not in ('active','pending','suspended') then raise exception 'invalid_status';end if;
  update peymanyar_private.licences set status=args->>'status',plan=case when coalesce((args->>'permanent')::boolean,false) then 'complimentary' else 'trial' end,
   expires_at=case when coalesce((args->>'permanent')::boolean,false) then null when args?'days' then greatest(coalesce(expires_at,now()),now())+make_interval(days=>least(365,greatest(0,(args->>'days')::integer))) else expires_at end,
   features=jsonb_build_object('speech',coalesce((args->>'speech')::boolean,true),'ai',coalesce((args->>'ai')::boolean,true)),
   quotas=jsonb_build_object('speech',least(100000,greatest(0,coalesce((args->>'speech_limit')::integer,100))),'ai',least(100000,greatest(0,coalesce((args->>'ai_limit')::integer,50)))) where user_id=target;
  if not found then raise exception 'user_not_found';end if;
  insert into peymanyar_private.audit(actor,action,subject) values(u,'set_user:'||(args->>'status'),target::text);
 elsif action='consume' then
  feat:=args->>'feature';if feat not in ('speech','ai') then raise exception 'invalid_feature';end if;
  select * into l from peymanyar_private.licences where user_id=u for update;
  if not peymanyar_private.allowed(true) or not coalesce((l.features->>feat)::boolean,false) then raise exception 'access_disabled_or_expired';end if;
  if admin then return '{"ok":true}'::jsonb;end if;
  lim:=coalesce((l.quotas->>feat)::integer,0);
  insert into peymanyar_private.usage(user_id,month,feature,used) values(u,mon,feat,0) on conflict do nothing;
  update peymanyar_private.usage set used=used+1 where user_id=u and month=mon and usage.feature=feat and used<lim returning used into n;
  if not found then raise exception 'quota_exceeded';end if;
  return jsonb_build_object('ok',true,'used',n,'limit',lim);
 elsif action='request' then
  update peymanyar_private.licences set request_note=left(coalesce(args->>'note','درخواست فعال‌سازی یا تمدید'),500) where user_id=u;
 elsif action='audit' then
  return coalesce((select jsonb_agg(to_jsonb(t)) from (select * from peymanyar_private.audit order by id desc limit 100)t),'[]');
 else raise exception 'unknown_action';end if;
 return '{"ok":true}'::jsonb;
end;
$$;
revoke all on function peymanyar_private.access(text,jsonb) from public,anon;
grant execute on function peymanyar_private.access(text,jsonb) to authenticated;
create function public.peymanyar_access(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select peymanyar_private.access(action,args)$$;
revoke all on function public.peymanyar_access(text,jsonb) from public,anon;
grant execute on function public.peymanyar_access(text,jsonb) to authenticated;
drop policy personal_snapshot_owner on public.peymanyar_personal_snapshots;
create policy personal_snapshot_read on public.peymanyar_personal_snapshots for select to authenticated using(user_id=(select auth.uid()) and (select peymanyar_private.allowed(false)));
create policy personal_snapshot_insert on public.peymanyar_personal_snapshots for insert to authenticated with check(user_id=(select auth.uid()) and (select peymanyar_private.allowed(true)));
create policy personal_snapshot_update on public.peymanyar_personal_snapshots for update to authenticated using(user_id=(select auth.uid()) and (select peymanyar_private.allowed(true))) with check(user_id=(select auth.uid()) and (select peymanyar_private.allowed(true)));
drop policy personal_files_read on storage.objects;
create policy personal_files_read on storage.objects for select to authenticated using(bucket_id='peymanyar-private' and (storage.foldername(name))[1]=(select auth.uid())::text and (select peymanyar_private.allowed(false)));
drop policy personal_files_insert on storage.objects;
create policy personal_files_insert on storage.objects for insert to authenticated with check(bucket_id='peymanyar-private' and (storage.foldername(name))[1]=(select auth.uid())::text and (select peymanyar_private.allowed(true)));
notify pgrst,'reload schema';
commit;
