-- HAMZA AGENCY PR101 operational tenant invitations, review-hardened
-- Additive only. No DROP TABLE, TRUNCATE, or production-row deletion.
begin;

create schema if not exists private;
revoke all on schema private from public,anon,authenticated;

do $$
begin
  if exists (
    select 1 from public.tenant_memberships
    group by tenant_id,user_id having count(*)>1
  ) then
    raise exception 'duplicate tenant memberships must be resolved before migration';
  end if;
end;
$$;

create unique index if not exists tenant_memberships_tenant_user_uidx
  on public.tenant_memberships(tenant_id,user_id);

create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role text not null check (role in ('creator','client','employee','partner','tenant_admin')),
  program_id bigint references public.programs(id) on delete set null,
  permissions jsonb not null default '{}'::jsonb,
  token_hash text not null,
  status text not null default 'invited' check (status in ('invited','accepted','expired','revoked')),
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now(),
  send_count integer not null default 1 check (send_count between 1 and 25),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_invitations_email_format check (
    length(email) between 3 and 254
    and email=lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint tenant_invitations_token_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint tenant_invitations_expiry check (expires_at>created_at)
);

create unique index if not exists tenant_invitations_token_hash_uidx on public.tenant_invitations(token_hash);
create unique index if not exists tenant_invitations_one_pending_uidx
  on public.tenant_invitations(tenant_id,email,role,coalesce(program_id,0::bigint))
  where status='invited';
create index if not exists tenant_invitations_tenant_status_idx
  on public.tenant_invitations(tenant_id,status,created_at desc);

alter table public.tenant_invitations enable row level security;
revoke all on public.tenant_invitations from anon,authenticated;
grant select on public.tenant_invitations to authenticated;

create policy "tenant admins read invitations" on public.tenant_invitations
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

create table if not exists private.invitation_rate_limits (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  action text not null check (action in ('create','resend','accept')),
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  bucket_started_at timestamptz not null,
  attempts integer not null default 1 check (attempts>0),
  updated_at timestamptz not null default now(),
  primary key(tenant_id,action,subject_hash,bucket_started_at)
);
revoke all on private.invitation_rate_limits from public,anon,authenticated;

create or replace function private.normalize_invitation_permissions(p_role text,p_permissions jsonb)
returns jsonb language plpgsql immutable
set search_path=pg_catalog,public,private
as $$
declare v_allowed text[]; v_key text; v_value jsonb;
begin
  if p_permissions is null or jsonb_typeof(p_permissions)<>'object' then raise exception 'invalid_permissions'; end if;
  v_allowed:=case p_role
    when 'creator' then array['profile.edit','files.upload','support.create','applications.view','tasks.view']
    when 'client' then array['profile.edit','files.upload','support.create','services.view','orders.view']
    when 'employee' then array['tasks.view','tasks.comment','tasks.status','files.upload']
    when 'partner' then array['profile.edit','files.upload','listings.manage','orders.view','referrals.view']
    when 'tenant_admin' then array['tenant.manage','members.manage','tasks.manage','marketplace.manage','reports.view']
    else array[]::text[] end;
  for v_key,v_value in select key,value from jsonb_each(p_permissions) loop
    if not (v_key=any(v_allowed)) or jsonb_typeof(v_value)<>'boolean' then raise exception 'permission_not_allowed'; end if;
  end loop;
  return p_permissions;
end;
$$;
revoke all on function private.normalize_invitation_permissions(text,jsonb) from public,anon,authenticated;

create or replace function public.consume_invitation_rate_limit(
  p_tenant_id uuid,p_action text,p_subject_hash text,p_limit integer,p_window_seconds integer
)
returns boolean language plpgsql security definer
set search_path=pg_catalog,public,private
as $$
declare v_user uuid:=auth.uid(); v_bucket timestamptz; v_attempts integer;
begin
  if v_user is null then raise exception 'unauthenticated' using errcode='42501'; end if;
  if p_action not in ('create','resend','accept') or p_subject_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_rate_limit'; end if;
  if p_limit<1 or p_limit>100 or p_window_seconds<30 or p_window_seconds>86400 then raise exception 'invalid_rate_limit'; end if;
  if not exists(select 1 from public.tenants where id=p_tenant_id and status='active') then raise exception 'tenant_not_found'; end if;
  if p_action in ('create','resend') and not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  v_bucket:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
  insert into private.invitation_rate_limits(tenant_id,action,subject_hash,bucket_started_at,attempts)
  values(p_tenant_id,p_action,p_subject_hash,v_bucket,1)
  on conflict(tenant_id,action,subject_hash,bucket_started_at)
  do update set attempts=private.invitation_rate_limits.attempts+1,updated_at=now()
  returning attempts into v_attempts;
  if v_attempts>p_limit then
    insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
    values(p_tenant_id,v_user,'tenant.invitation_rate_limited','security_event',p_subject_hash,
      jsonb_build_object('operation',p_action,'attempts',v_attempts,'window_seconds',p_window_seconds));
    return false;
  end if;
  return true;
end;
$$;
revoke all on function public.consume_invitation_rate_limit(uuid,text,text,integer,integer) from public,anon;
grant execute on function public.consume_invitation_rate_limit(uuid,text,text,integer,integer) to authenticated;

create or replace function public.expire_tenant_invitations(p_tenant_id uuid)
returns integer language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare v_count integer;
begin
  if p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  update public.tenant_invitations set status='expired',updated_at=now()
  where tenant_id=p_tenant_id and status='invited' and expires_at<=now();
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function public.expire_tenant_invitations(uuid) from public,anon;
grant execute on function public.expire_tenant_invitations(uuid) to authenticated;

create or replace function private.expire_all_tenant_invitations()
returns integer language plpgsql security definer
set search_path=pg_catalog,public,private
as $$
declare v_count integer;
begin
  update public.tenant_invitations set status='expired',updated_at=now()
  where status='invited' and expires_at<=now();
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function private.expire_all_tenant_invitations() from public,anon,authenticated;
grant execute on function private.expire_all_tenant_invitations() to service_role;

create or replace function public.create_tenant_invitation(
  p_tenant_id uuid,p_email text,p_role text,p_program_id bigint,p_permissions jsonb,p_token_hash text,p_expires_at timestamptz
)
returns table(id uuid,tenant_id uuid,email text,role text,program_id bigint,status text,expires_at timestamptz,last_sent_at timestamptz,send_count integer)
language plpgsql security definer
set search_path=pg_catalog,public,private
as $$
declare v_actor uuid:=auth.uid(); v_email text:=lower(btrim(coalesce(p_email,''))); v_invitation public.tenant_invitations%rowtype; v_permissions jsonb;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_role not in ('creator','client','employee','partner','tenant_admin') then raise exception 'invalid_invitation'; end if;
  if p_role='tenant_admin' and not public.current_user_has_tenant_role(p_tenant_id,array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email)>254 then raise exception 'invalid_invitation'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'invalid_invitation'; end if;
  v_permissions:=private.normalize_invitation_permissions(p_role,p_permissions);
  if p_program_id is not null and not exists(select 1 from public.programs where id=p_program_id and tenant_id=p_tenant_id) then raise exception 'invalid_invitation'; end if;
  perform public.expire_tenant_invitations(p_tenant_id);
  if exists(select 1 from public.tenant_memberships m join auth.users u on u.id=m.user_id where m.tenant_id=p_tenant_id and lower(u.email)=v_email and m.status='active') then raise exception 'invalid_invitation'; end if;
  insert into public.tenant_invitations(tenant_id,email,role,program_id,permissions,token_hash,invited_by,expires_at)
  values(p_tenant_id,v_email,p_role,p_program_id,v_permissions,p_token_hash,v_actor,p_expires_at) returning * into v_invitation;
  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant_id,v_actor,'tenant.invitation_created','tenant_invitation',v_invitation.id::text,jsonb_build_object('email',v_email,'role',p_role,'program_id',p_program_id,'expires_at',p_expires_at));
  insert into public.notifications(tenant_id,title,message,type,recipient_email,notification_key,metadata,event_key,event_type,entity_type,entity_id,status,priority)
  values(p_tenant_id,'دعوة للانضمام إلى HAMZA AGENCY','لديك دعوة جديدة للانضمام إلى مساحة عمل.','tenant_invitation',v_email,
    'tenant_invitation:'||v_invitation.id,jsonb_build_object('invitation_id',v_invitation.id,'role',p_role,'delivery','provider_disabled'),
    'tenant.invitation.created:'||v_invitation.id,'tenant.invitation.created','tenant_invitation',v_invitation.id::text,'queued','normal') on conflict do nothing;
  return query select v_invitation.id,v_invitation.tenant_id,v_invitation.email,v_invitation.role,v_invitation.program_id,v_invitation.status,v_invitation.expires_at,v_invitation.last_sent_at,v_invitation.send_count;
end;
$$;
revoke all on function public.create_tenant_invitation(uuid,text,text,bigint,jsonb,text,timestamptz) from public,anon;
grant execute on function public.create_tenant_invitation(uuid,text,text,bigint,jsonb,text,timestamptz) to authenticated;

create or replace function public.resend_tenant_invitation(
  p_tenant_id uuid,p_invitation_id uuid,p_token_hash text,p_expires_at timestamptz
)
returns table(id uuid,email text,role text,status text,expires_at timestamptz,last_sent_at timestamptz,send_count integer)
language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare v_actor uuid:=auth.uid(); v_invitation public.tenant_invitations%rowtype;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'invalid_invitation'; end if;
  select * into v_invitation from public.tenant_invitations where id=p_invitation_id and tenant_id=p_tenant_id for update;
  if not found or v_invitation.status in ('accepted','revoked') then raise exception 'invitation_not_resendable'; end if;
  if v_invitation.send_count>=25 then raise exception 'resend_limit_reached'; end if;
  update public.tenant_invitations set token_hash=p_token_hash,status='invited',expires_at=p_expires_at,last_sent_at=now(),send_count=send_count+1,updated_at=now()
  where id=p_invitation_id and tenant_id=p_tenant_id returning * into v_invitation;
  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant_id,v_actor,'tenant.invitation_resent','tenant_invitation',v_invitation.id::text,jsonb_build_object('email',v_invitation.email,'expires_at',v_invitation.expires_at,'send_count',v_invitation.send_count));
  insert into public.notifications(tenant_id,title,message,type,recipient_email,notification_key,metadata,event_key,event_type,entity_type,entity_id,status,priority)
  values(p_tenant_id,'إعادة إرسال دعوة HAMZA AGENCY','تم إصدار رابط دعوة جديد وإبطال الرابط السابق.','tenant_invitation',v_invitation.email,
    'tenant_invitation_resend:'||v_invitation.id||':'||v_invitation.send_count,jsonb_build_object('invitation_id',v_invitation.id,'delivery','provider_disabled'),
    'tenant.invitation.resent:'||v_invitation.id||':'||v_invitation.send_count,'tenant.invitation.resent','tenant_invitation',v_invitation.id::text,'queued','normal') on conflict do nothing;
  return query select v_invitation.id,v_invitation.email,v_invitation.role,v_invitation.status,v_invitation.expires_at,v_invitation.last_sent_at,v_invitation.send_count;
end;
$$;
revoke all on function public.resend_tenant_invitation(uuid,uuid,text,timestamptz) from public,anon;
grant execute on function public.resend_tenant_invitation(uuid,uuid,text,timestamptz) to authenticated;

create or replace function public.revoke_tenant_invitation(p_tenant_id uuid,p_invitation_id uuid)
returns boolean language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare v_actor uuid:=auth.uid(); v_invitation public.tenant_invitations%rowtype;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into v_invitation from public.tenant_invitations where id=p_invitation_id and tenant_id=p_tenant_id for update;
  if not found then return false; end if;
  if v_invitation.status='accepted' then raise exception 'invitation_not_revocable'; end if;
  if v_invitation.status='revoked' then return true; end if;
  update public.tenant_invitations set status='revoked',revoked_at=now(),updated_at=now() where id=p_invitation_id and tenant_id=p_tenant_id;
  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant_id,v_actor,'tenant.invitation_revoked','tenant_invitation',v_invitation.id::text,jsonb_build_object('email',v_invitation.email));
  insert into public.notifications(tenant_id,title,message,type,recipient_email,notification_key,metadata,event_key,event_type,entity_type,entity_id,status,priority)
  values(p_tenant_id,'تم إلغاء دعوة الانضمام','لم يعد رابط الدعوة صالحاً للاستخدام.','tenant_invitation',v_invitation.email,
    'tenant_invitation_revoked:'||v_invitation.id,jsonb_build_object('invitation_id',v_invitation.id,'delivery','provider_disabled'),
    'tenant.invitation.revoked:'||v_invitation.id,'tenant.invitation.revoked','tenant_invitation',v_invitation.id::text,'queued','normal') on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.revoke_tenant_invitation(uuid,uuid) from public,anon;
grant execute on function public.revoke_tenant_invitation(uuid,uuid) to authenticated;

create or replace function public.accept_tenant_invitation(p_expected_tenant_id uuid,p_token_hash text)
returns table(accepted boolean,membership_id uuid,tenant_id uuid,role text,program_id bigint,status text)
language plpgsql security definer
set search_path=pg_catalog,public,auth,private
as $$
declare v_user uuid:=auth.uid(); v_email text:=lower(coalesce(auth.jwt()->>'email','')); v_invitation public.tenant_invitations%rowtype; v_membership public.tenant_memberships%rowtype;
begin
  if v_user is null or v_email='' or p_expected_tenant_id is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text; return;
  end if;
  select * into v_invitation from public.tenant_invitations where token_hash=p_token_hash and tenant_id=p_expected_tenant_id for update;
  if not found or v_invitation.status<>'invited' then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text; return;
  end if;
  if v_invitation.expires_at<=now() then
    update public.tenant_invitations set status='expired',updated_at=now() where id=v_invitation.id and status='invited';
    insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
    values(v_invitation.tenant_id,v_user,'tenant.invitation_expired_on_accept','tenant_invitation',v_invitation.id::text,jsonb_build_object('email',v_email));
    return query select false,null::uuid,v_invitation.tenant_id,null::text,null::bigint,'expired'::text; return;
  end if;
  if lower(v_invitation.email)<>v_email then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text; return;
  end if;
  insert into public.tenant_memberships(tenant_id,user_id,role,status,program_id,permissions,mfa_required)
  values(v_invitation.tenant_id,v_user,v_invitation.role,'active',v_invitation.program_id,v_invitation.permissions,v_invitation.role='tenant_admin')
  on conflict(tenant_id,user_id) do update set role=excluded.role,status='active',program_id=excluded.program_id,permissions=excluded.permissions,mfa_required=excluded.mfa_required,updated_at=now()
  returning * into v_membership;
  update public.tenant_invitations set status='accepted',accepted_by=v_user,accepted_at=now(),updated_at=now()
  where id=v_invitation.id and status='invited';
  if not found then return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text; return; end if;
  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(v_invitation.tenant_id,v_user,'tenant.invitation_accepted','tenant_membership',v_membership.id::text,jsonb_build_object('email',v_email,'role',v_membership.role,'program_id',v_membership.program_id));
  insert into public.notifications(tenant_id,title,message,type,recipient_user_id,recipient_email,notification_key,metadata,event_key,event_type,entity_type,entity_id,status,priority)
  values(v_invitation.tenant_id,'تم قبول الدعوة','أصبح حسابك عضواً فعالاً في مساحة العمل.','tenant_membership',v_user,v_email,
    'tenant_invitation_accepted:'||v_invitation.id,jsonb_build_object('membership_id',v_membership.id,'role',v_membership.role),
    'tenant.invitation.accepted:'||v_invitation.id,'tenant.invitation.accepted','tenant_membership',v_membership.id::text,'created','normal') on conflict do nothing;
  return query select true,v_membership.id,v_membership.tenant_id,v_membership.role,v_membership.program_id,v_membership.status;
end;
$$;
revoke all on function public.accept_tenant_invitation(uuid,text) from public,anon;
grant execute on function public.accept_tenant_invitation(uuid,text) to authenticated;

create or replace function public.manage_tenant_membership(
  p_tenant_id uuid,p_membership_id uuid,p_status text,p_role text,p_program_id bigint,p_permissions jsonb
)
returns public.tenant_memberships language plpgsql security definer
set search_path=pg_catalog,public,private
as $$
declare v_actor uuid:=auth.uid(); v_before public.tenant_memberships%rowtype; v_after public.tenant_memberships%rowtype; v_permissions jsonb;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_status not in ('active','suspended','revoked') or p_role not in ('creator','client','employee','partner','tenant_admin') then raise exception 'invalid_membership'; end if;
  select * into v_before from public.tenant_memberships where id=p_membership_id and tenant_id=p_tenant_id for update;
  if not found then raise exception 'membership_not_found'; end if;
  if v_before.role='super_admin' then raise exception 'super_admin_protected' using errcode='42501'; end if;
  if (v_before.role='tenant_admin' or p_role='tenant_admin') and not public.current_user_has_tenant_role(p_tenant_id,array['super_admin']) then raise exception 'super_admin_required' using errcode='42501'; end if;
  if v_before.user_id=v_actor and p_status<>'active' then raise exception 'cannot_suspend_self' using errcode='42501'; end if;
  if p_program_id is not null and not exists(select 1 from public.programs where id=p_program_id and tenant_id=p_tenant_id) then raise exception 'invalid_membership'; end if;
  v_permissions:=private.normalize_invitation_permissions(p_role,p_permissions);
  update public.tenant_memberships set status=p_status,role=p_role,program_id=p_program_id,permissions=v_permissions,mfa_required=(p_role='tenant_admin'),updated_at=now()
  where id=p_membership_id and tenant_id=p_tenant_id returning * into v_after;
  if p_status in ('suspended','revoked') then
    update public.user_sessions set revoked_at=coalesce(revoked_at,now()),revoked_by=v_actor,revoke_reason='membership_'||p_status
    where tenant_id=p_tenant_id and user_id=v_after.user_id and revoked_at is null;
  end if;
  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,before_data,after_data)
  values(p_tenant_id,v_actor,'tenant.membership_updated','tenant_membership',v_after.id::text,to_jsonb(v_before),to_jsonb(v_after));
  insert into public.notifications(tenant_id,title,message,type,recipient_user_id,notification_key,metadata,event_key,event_type,entity_type,entity_id,status,priority)
  values(p_tenant_id,'تم تحديث العضوية','تم تحديث حالة أو صلاحيات عضويتك.','tenant_membership',v_after.user_id,
    'tenant_membership_updated:'||v_after.id||':'||extract(epoch from v_after.updated_at)::bigint,jsonb_build_object('status',v_after.status,'role',v_after.role),
    'tenant.membership.updated:'||v_after.id||':'||extract(epoch from v_after.updated_at)::bigint,'tenant.membership.updated','tenant_membership',v_after.id::text,'created','high') on conflict do nothing;
  return v_after;
end;
$$;
revoke all on function public.manage_tenant_membership(uuid,uuid,text,text,bigint,jsonb) from public,anon;
grant execute on function public.manage_tenant_membership(uuid,uuid,text,text,bigint,jsonb) to authenticated;

comment on table public.tenant_invitations is 'Stores only SHA-256 token hashes. Raw tokens are generated server-side, shown once and never persisted.';
comment on function public.accept_tenant_invitation(uuid,text) is 'Returns a structured result so expired-state updates commit without exception rollback.';
comment on function public.expire_tenant_invitations(uuid) is 'Authenticated tenant-scoped expiration; NULL and cross-tenant calls are rejected.';
comment on function private.expire_all_tenant_invitations() is 'Server-only scheduler entry point.';

commit;
