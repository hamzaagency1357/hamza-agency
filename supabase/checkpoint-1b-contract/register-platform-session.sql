-- Exact Checkpoint 1B local contract for the current Production RPC.
-- Source: read-only Production catalog inspection via pg_get_functiondef.
-- This file is not a Production migration and is loaded only into the isolated local contract project.

create or replace function public.register_platform_session(
  p_tenant uuid,
  p_auth_session uuid,
  p_device_label text,
  p_platform text,
  p_browser text,
  p_ip_hash text,
  p_suspicious boolean default false
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  actor uuid := (select auth.uid());
  existing uuid;
begin
  if actor is null or not public.current_user_has_tenant_role(
    p_tenant,
    array['super_admin','tenant_admin','creator','client','employee','partner']
  ) then
    raise exception 'forbidden';
  end if;

  if p_auth_session is not null then
    select id into existing
    from public.user_sessions
    where tenant_id = p_tenant
      and user_id = actor
      and auth_session_id = p_auth_session
      and revoked_at is null
    limit 1;
  end if;

  if existing is not null then
    update public.user_sessions
    set last_active_at = now(),
        device_label = left(coalesce(p_device_label, device_label), 120),
        platform = left(coalesce(p_platform, platform), 80),
        browser = left(coalesce(p_browser, browser), 80),
        ip_hash = left(coalesce(p_ip_hash, ip_hash), 64),
        suspicious = suspicious or p_suspicious
    where id = existing
      and user_id = actor;
    return existing;
  end if;

  insert into public.user_sessions(
    tenant_id,
    user_id,
    auth_session_id,
    device_label,
    platform,
    browser,
    ip_hash,
    suspicious
  ) values (
    p_tenant,
    actor,
    p_auth_session,
    left(p_device_label, 120),
    left(p_platform, 80),
    left(p_browser, 80),
    left(p_ip_hash, 64),
    p_suspicious
  )
  returning id into existing;

  return existing;
end;
$function$;

revoke all on function public.register_platform_session(uuid,uuid,text,text,text,text,boolean) from public, anon;
grant execute on function public.register_platform_session(uuid,uuid,text,text,text,text,boolean) to authenticated;
