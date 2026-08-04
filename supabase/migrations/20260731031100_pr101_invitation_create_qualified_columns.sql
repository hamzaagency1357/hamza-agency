-- HAMZA AGENCY PR101 invitation create PostgreSQL name-resolution fix
begin;

create or replace function public.create_tenant_invitation(
  p_tenant_id uuid,p_email text,p_role text,p_program_id bigint,p_permissions jsonb,p_token_hash text,p_expires_at timestamptz
)
returns table(id uuid,tenant_id uuid,email text,role text,program_id bigint,status text,expires_at timestamptz,last_sent_at timestamptz,send_count integer)
language plpgsql security definer
set search_path=pg_catalog,public,private,extensions
as $$
declare
  v_actor uuid:=auth.uid();
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_invitation public.tenant_invitations%rowtype;
  v_permissions jsonb;
  v_subject text;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_role not in ('creator','client','employee','partner','tenant_admin') then raise exception 'invalid_invitation'; end if;
  if p_role='tenant_admin' and not public.current_user_has_tenant_role(p_tenant_id,array['super_admin']) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email)>254 then raise exception 'invalid_invitation'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'invalid_invitation'; end if;

  v_permissions:=private.normalize_invitation_permissions(p_role,p_permissions);
  if p_program_id is not null and not exists(
    select 1 from public.programs program_row
    where program_row.id=p_program_id and program_row.tenant_id=p_tenant_id
  ) then raise exception 'invalid_invitation'; end if;

  v_subject:=encode(digest(v_actor::text||'|'||p_tenant_id::text||'|create|'||v_email,'sha256'),'hex');
  if not private.consume_invitation_rate_limit(p_tenant_id,'create',v_subject) then
    raise exception 'invitation_rate_limited' using errcode='P0001';
  end if;

  perform public.expire_tenant_invitations(p_tenant_id);
  if exists(
    select 1
    from public.tenant_memberships membership_row
    join auth.users user_row on user_row.id=membership_row.user_id
    where membership_row.tenant_id=p_tenant_id
      and lower(user_row.email)=v_email
      and membership_row.status='active'
  ) then raise exception 'invalid_invitation'; end if;

  begin
    insert into public.tenant_invitations(tenant_id,email,role,program_id,permissions,token_hash,invited_by,expires_at)
    values(p_tenant_id,v_email,p_role,p_program_id,v_permissions,p_token_hash,v_actor,p_expires_at)
    returning * into v_invitation;
  exception when unique_violation then
    raise exception 'pending_invitation_exists' using errcode='P0001';
  end;

  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant_id,v_actor,'tenant.invitation_created','tenant_invitation',v_invitation.id::text,
    jsonb_build_object('email',v_email,'role',p_role,'program_id',p_program_id,'expires_at',p_expires_at));

  insert into public.notifications(tenant_id,title,message,type,recipient_email,notification_key,metadata,event_key,event_type,entity_type,entity_id,status,priority)
  values(p_tenant_id,'دعوة للانضمام إلى HAMZA AGENCY','لديك دعوة جديدة للانضمام إلى مساحة عمل.','tenant_invitation',v_email,
    'tenant_invitation:'||v_invitation.id,jsonb_build_object('invitation_id',v_invitation.id,'role',p_role,'delivery','provider_disabled'),
    'tenant.invitation.created:'||v_invitation.id,'tenant.invitation.created','tenant_invitation',v_invitation.id::text,'queued','normal')
  on conflict do nothing;

  return query select v_invitation.id,v_invitation.tenant_id,v_invitation.email,v_invitation.role,
    v_invitation.program_id,v_invitation.status,v_invitation.expires_at,v_invitation.last_sent_at,v_invitation.send_count;
end;
$$;

revoke all on function public.create_tenant_invitation(uuid,text,text,bigint,jsonb,text,timestamptz) from public,anon;
grant execute on function public.create_tenant_invitation(uuid,text,text,bigint,jsonb,text,timestamptz) to authenticated;

commit;
