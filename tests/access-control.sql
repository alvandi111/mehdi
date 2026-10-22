-- Run with an existing privately bootstrapped system owner; all fixtures roll back.
select set_config('peymanyar.test.owner',(select user_id::text from peymanyar_private.admins limit 1),true);
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-4000-8000-000000000101','authenticated','authenticated','peymanyar-test1@example.invalid',now(),'{}','{}',now(),now()),
('00000000-0000-4000-8000-000000000102','authenticated','authenticated','peymanyar-test2@example.invalid',now(),'{}','{}',now(),now());
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('peymanyar.test.owner'),'role','authenticated')::text,true);
select set_config('peymanyar.test.invite',(public.peymanyar_access('create_invite','{"max_uses":1,"days":60,"speech_limit":1}') ->> 'token'),true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
select public.peymanyar_access('state');
do $$begin
 begin perform public.peymanyar_access('list_users');raise exception 'TEST_admin_leak';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 perform public.peymanyar_access('redeem',jsonb_build_object('token',current_setting('peymanyar.test.invite')));
 if not (public.peymanyar_access('state')->>'write')::boolean then raise exception 'TEST_activation_failed';end if;
 perform public.peymanyar_access('consume','{"feature":"speech"}');
 begin perform public.peymanyar_access('consume','{"feature":"speech"}');raise exception 'TEST_quota_bypass';exception when raise_exception then if sqlerrm<>'quota_exceeded' then raise;end if;end;
 begin perform public.peymanyar_access('redeem',jsonb_build_object('token',current_setting('peymanyar.test.invite')));raise exception 'TEST_reuse';exception when raise_exception then if sqlerrm<>'invite_already_used_or_account_active' then raise;end if;end;
 if exists(select from public.peymanyar_personal_snapshots where user_id=current_setting('peymanyar.test.owner')::uuid) then raise exception 'TEST_other_account_visible';end if;
 perform public.peymanyar_save_personal_snapshot('00000000-0000-4000-8000-000000000101',0,'{"projects":[]}'::jsonb,'[]');
 begin insert into public.peymanyar_personal_snapshots(user_id,payload) values('00000000-0000-4000-8000-000000000102','{}');raise exception 'TEST_other_account_write';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
set local role authenticated;
select public.peymanyar_access('state');
do $$begin
 begin perform public.peymanyar_access('redeem',jsonb_build_object('token',current_setting('peymanyar.test.invite')));raise exception 'TEST_capacity_bypass';exception when raise_exception then if sqlerrm<>'invite_invalid_expired_or_wrong_email' then raise;end if;end;
end$$;
reset role;
update peymanyar_private.licences set expires_at=now()-interval '1 day' where user_id='00000000-0000-4000-8000-000000000101';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 if (public.peymanyar_access('state')->>'write')::boolean then raise exception 'TEST_expired_write';end if;
 if not exists(select from public.peymanyar_personal_snapshots where user_id=auth.uid()) then raise exception 'TEST_expired_read';end if;
 begin perform public.peymanyar_save_personal_snapshot(auth.uid(),1,'{}','[]');raise exception 'TEST_expired_rpc_write';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('peymanyar.test.owner'),'role','authenticated')::text,true);
set local role authenticated;
select public.peymanyar_access('set_user','{"user_id":"00000000-0000-4000-8000-000000000101","status":"suspended","days":0}');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 if (public.peymanyar_access('state')->>'read')::boolean then raise exception 'TEST_suspended_read';end if;
 if exists(select from public.peymanyar_personal_snapshots where user_id=auth.uid()) then raise exception 'TEST_suspended_snapshot';end if;
end$$;
reset role;
set local role anon;
do $$begin begin perform public.peymanyar_access('state');raise exception 'TEST_anon';exception when insufficient_privilege then null;end;end$$;
reset role;
