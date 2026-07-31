-- HAMZA AGENCY PR101 membership suspension auth-session invalidation
begin;

create or replace function private.revoke_auth_sessions_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,auth,private
as $$
declare
  v_sessions integer:=0;
  v_refresh_tokens integer:=0;
begin
  if p_user_id is null then raise exception 'invalid_user'; end if;

  update auth.sessions session_row
  set not_after=least(coalesce(session_row.not_after,now()),now()),updated_at=now()
  where session_row.user_id=p_user_id
    and (session_row.not_after is null or session_row.not_after>now());
  get diagnostics v_sessions=row_count;

  update auth.refresh_tokens token_row
  set revoked=true,updated_at=now()
  where token_row.user_id=p_user_id::text
    and coalesce(token_row.revoked,false)=false;
  get diagnostics v_refresh_tokens=row_count;

  return jsonb_build_object('sessions_expired',v_sessions,'refresh_tokens_revoked',v_refresh_tokens);
end;
$$;

revoke all on function private.revoke_auth_sessions_for_user(uuid) from public,anon,authenticated;
grant execute on function private.revoke_auth_sessions_for_user(uuid) to service_role;

create or replace function public.manage_tenant_membership(
  p_tenant_id uuid,p_membership_id uuid,p_status text,p_role text,p_program_id bigint,p_permissions jsonb
)
returns public.tenant_memberships
language plpgsql
security definer
set search_path=pg_catalog,public,private,auth
as $$
declare
  v_actor uuid:=auth.uid();
  v_before public.tenant_memberships%rowtype;
  v_after public.tenant_memberships%rowtype;
  v_permissions jsonb;
  v_auth_revocation jsonb:='{}'::jsonb;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_status not in ('active','suspended','revoked') or p_role not in ('creator','client','employee','partner','tenant_admin') then
    raise exception 'invalid_membership';
  end if;

  select membership_row.* into v_before
  from public.tenant_memberships membership_row
  where membership_row.id=p_membership_id and membership_row.tenant_id=p_tenant_id
  for update;

  if not found then raise exception 'membership_not_found'; end if;
  if v_before.role='super_admin' then raise exception 'super_admin_protected' using errcode='42501'; end if;
  if (v_before.role='tenant_admin' or p_role='tenant_admin') and not public.current_user_has_tenant_role(p_tenant_id,array['super_admin']) then
    raise exception 'super_admin_required' using errcode='42501';
  end if;
  if v_before.user_id=v_actor and p_status<>'active' then raise exception 'cannot_suspend_self' using errcode='42501'; end if;
  if p_program_id is not null and not exists(
    select 1 from public.programs program_row
    where program_row.id=p_program_id and program_row.tenant_id=p_tenant_id
  ) then raise exception 'invalid_membership'; end if;

  v_permissions:=private.normalize_invitation_permissions(p_role,p_permissions);

  update public.tenant_memberships membership_row
  set status=p_status,role=p_role,program_id=p_program_id,permissions=v_permissions,
      mfa_required=(p_role='tenant_admin'),updated_at=now()
  where membership_row.id=p_membership_id and membership_row.tenant_id=p_tenant_id
  returning membership_row.* into v_after;

  if p_status in ('suspended','revoked') then
    update public.user_sessions session_row
    set revoked_at=coalesce(session_row.revoked_at,now()),revoked_by=v_actor,revoke_reason='membership_'||p_status
    where session_row.tenant_id=p_tenant_id and session_row.user_id=v_after.user_id and session_row.revoked_at is null;

    v_auth_revocation:=private.revoke_auth_sessions_for_user(v_after.user_id);
  end if;

  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,before_data,after_data)
  values(p_tenant_id,v_actor,'tenant.membership_updated','tenant_membership',v_after.id::text,to_jsonb(v_before),
    to_jsonb(v_after)||jsonb_build_object('auth_revocation',v_auth_revocation));

  return v_after;
end;
$$;

revoke all on function public.manage_tenant_membership(uuid,uuid,text,text,bigint,jsonb) from public,anon;
grant execute on function public.manage_tenant_membership(uuid,uuid,text,text,bigint,jsonb) to authenticated;

comment on function private.revoke_auth_sessions_for_user(uuid) is
  'Internal-only Supabase Auth session and refresh-token invalidation used after membership suspension or revocation.';

commit;
