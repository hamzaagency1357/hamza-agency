-- HAMZA AGENCY PR101 invitation acceptance named conflict target
begin;

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
  on conflict on constraint tenant_memberships_tenant_user_key do update
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
