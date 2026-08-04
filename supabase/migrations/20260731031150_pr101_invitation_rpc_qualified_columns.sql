-- HAMZA AGENCY PR101 invitation RPC PostgreSQL name-resolution fixes
begin;

create or replace function public.resend_tenant_invitation(
  p_tenant_id uuid,p_invitation_id uuid,p_token_hash text,p_expires_at timestamptz
)
returns table(id uuid,email text,role text,status text,expires_at timestamptz,last_sent_at timestamptz,send_count integer)
language plpgsql security definer
set search_path=pg_catalog,public,private,extensions
as $$
declare
  v_actor uuid:=auth.uid();
  v_invitation public.tenant_invitations%rowtype;
  v_subject text;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then
    raise exception 'invalid_invitation';
  end if;

  select invitation_row.* into v_invitation
  from public.tenant_invitations invitation_row
  where invitation_row.id=p_invitation_id and invitation_row.tenant_id=p_tenant_id
  for update;

  if not found or v_invitation.status in ('accepted','revoked') then raise exception 'invitation_not_resendable'; end if;
  if v_invitation.send_count>=25 then raise exception 'resend_limit_reached'; end if;

  v_subject:=encode(digest(v_actor::text||'|'||p_tenant_id::text||'|resend|'||p_invitation_id::text,'sha256'),'hex');
  if not private.consume_invitation_rate_limit(p_tenant_id,'resend',v_subject) then
    raise exception 'invitation_rate_limited' using errcode='P0001';
  end if;

  update public.tenant_invitations invitation_row
  set token_hash=p_token_hash,status='invited',expires_at=p_expires_at,last_sent_at=now(),
      send_count=invitation_row.send_count+1,updated_at=now()
  where invitation_row.id=p_invitation_id and invitation_row.tenant_id=p_tenant_id
  returning invitation_row.* into v_invitation;

  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant_id,v_actor,'tenant.invitation_resent','tenant_invitation',v_invitation.id::text,
    jsonb_build_object('email',v_invitation.email,'expires_at',v_invitation.expires_at,'send_count',v_invitation.send_count));

  return query select v_invitation.id,v_invitation.email,v_invitation.role,v_invitation.status,
    v_invitation.expires_at,v_invitation.last_sent_at,v_invitation.send_count;
end;
$$;

revoke all on function public.resend_tenant_invitation(uuid,uuid,text,timestamptz) from public,anon;
grant execute on function public.resend_tenant_invitation(uuid,uuid,text,timestamptz) to authenticated;

create or replace function public.accept_tenant_invitation(p_expected_tenant_id uuid,p_token_hash text)
returns table(accepted boolean,membership_id uuid,tenant_id uuid,role text,program_id bigint,status text)
language plpgsql security definer
set search_path=pg_catalog,public,auth,private,extensions
as $$
declare
  v_user uuid:=auth.uid();
  v_email text:=lower(coalesce(auth.jwt()->>'email',''));
  v_invitation public.tenant_invitations%rowtype;
  v_membership public.tenant_memberships%rowtype;
  v_subject text;
begin
  if v_user is null or v_email='' or p_expected_tenant_id is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text;
    return;
  end if;

  select invitation_row.* into v_invitation
  from public.tenant_invitations invitation_row
  where invitation_row.token_hash=p_token_hash
  for update;

  if not found or v_invitation.tenant_id<>p_expected_tenant_id or v_invitation.status<>'invited' then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text;
    return;
  end if;

  v_subject:=encode(digest(v_user::text||'|'||p_token_hash,'sha256'),'hex');
  if not private.consume_invitation_rate_limit(v_invitation.tenant_id,'accept',v_subject) then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,'rate_limited'::text;
    return;
  end if;

  if v_invitation.expires_at<=now() then
    update public.tenant_invitations invitation_row
    set status='expired',updated_at=now()
    where invitation_row.id=v_invitation.id and invitation_row.status='invited';
    return query select false,null::uuid,v_invitation.tenant_id,null::text,null::bigint,'expired'::text;
    return;
  end if;

  if lower(v_invitation.email)<>v_email then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text;
    return;
  end if;

  insert into public.tenant_memberships(tenant_id,user_id,role,status,program_id,permissions,mfa_required)
  values(v_invitation.tenant_id,v_user,v_invitation.role,'active',v_invitation.program_id,v_invitation.permissions,v_invitation.role='tenant_admin')
  on conflict(tenant_id,user_id) do update
  set role=excluded.role,status='active',program_id=excluded.program_id,permissions=excluded.permissions,
      mfa_required=excluded.mfa_required,updated_at=now()
  returning * into v_membership;

  update public.tenant_invitations invitation_row
  set status='accepted',accepted_by=v_user,accepted_at=now(),updated_at=now()
  where invitation_row.id=v_invitation.id and invitation_row.status='invited';

  if not found then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text;
    return;
  end if;

  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(v_invitation.tenant_id,v_user,'tenant.invitation_accepted','tenant_membership',v_membership.id::text,
    jsonb_build_object('email',v_email,'role',v_membership.role,'program_id',v_membership.program_id));

  return query select true,v_membership.id,v_membership.tenant_id,v_membership.role,v_membership.program_id,v_membership.status;
end;
$$;

revoke all on function public.accept_tenant_invitation(uuid,text) from public,anon;
grant execute on function public.accept_tenant_invitation(uuid,text) to authenticated;

commit;
