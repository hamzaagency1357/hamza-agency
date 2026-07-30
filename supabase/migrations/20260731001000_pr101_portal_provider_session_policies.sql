-- HAMZA AGENCY PR101 portal communication, push and session isolation
-- Additive and transactional. No existing data is deleted.
begin;

create policy "tenant staff read communication consent" on public.communication_consents
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

create policy "tenant staff read notification preferences" on public.portal_notification_preferences
for select to authenticated
using (user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

create policy "tenant staff read approved whatsapp templates" on public.whatsapp_templates
for select to authenticated
using (status='approved' and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

create policy "users manage own push subscriptions" on public.push_subscriptions
for all to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','creator','client','employee','partner']));

create policy "users register own sessions" on public.user_sessions
for insert to authenticated
with check (user_id=(select auth.uid()) and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','creator','client','employee','partner']));

create unique index if not exists user_sessions_active_auth_session_uidx
on public.user_sessions(tenant_id,user_id,auth_session_id)
where auth_session_id is not null and revoked_at is null;

create or replace function private.raise_new_session_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.security_alerts(tenant_id,user_id,alert_type,severity,metadata)
  values(
    new.tenant_id,
    new.user_id,
    case when new.suspicious then 'suspicious_login' else 'new_device' end,
    case when new.suspicious then 'high' else 'low' end,
    jsonb_build_object('sessionId',new.id,'platform',new.platform,'browser',new.browser)
  );
  return new;
end;
$$;
revoke all on function private.raise_new_session_alert() from public,anon,authenticated;
drop trigger if exists user_sessions_security_alert_trigger on public.user_sessions;
create trigger user_sessions_security_alert_trigger
after insert on public.user_sessions
for each row execute function private.raise_new_session_alert();

create or replace function public.register_platform_session(
  p_tenant uuid,
  p_auth_session uuid,
  p_device_label text,
  p_platform text,
  p_browser text,
  p_ip_hash text,
  p_suspicious boolean default false
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  existing uuid;
begin
  if actor is null or not public.current_user_has_tenant_role(p_tenant,array['super_admin','tenant_admin','creator','client','employee','partner']) then
    raise exception 'forbidden';
  end if;
  if p_auth_session is not null then
    select id into existing from public.user_sessions
    where tenant_id=p_tenant and user_id=actor and auth_session_id=p_auth_session and revoked_at is null
    limit 1;
  end if;
  if existing is not null then
    update public.user_sessions
    set last_active_at=now(),device_label=left(coalesce(p_device_label,device_label),120),platform=left(coalesce(p_platform,platform),80),browser=left(coalesce(p_browser,browser),80),ip_hash=left(coalesce(p_ip_hash,ip_hash),64),suspicious=suspicious or p_suspicious
    where id=existing and user_id=actor;
    return existing;
  end if;
  insert into public.user_sessions(tenant_id,user_id,auth_session_id,device_label,platform,browser,ip_hash,suspicious)
  values(p_tenant,actor,p_auth_session,left(p_device_label,120),left(p_platform,80),left(p_browser,80),left(p_ip_hash,64),p_suspicious)
  returning id into existing;
  return existing;
end;
$$;
revoke all on function public.register_platform_session(uuid,uuid,text,text,text,text,boolean) from public,anon;
grant execute on function public.register_platform_session(uuid,uuid,text,text,text,text,boolean) to authenticated;

create or replace function public.revoke_all_own_platform_sessions(p_tenant uuid,p_reason text default 'user_requested_all')
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare actor uuid := (select auth.uid()); changed integer;
begin
  if actor is null then return 0; end if;
  update public.user_sessions
  set revoked_at=coalesce(revoked_at,now()),revoked_by=actor,revoke_reason=left(coalesce(p_reason,'user_requested_all'),200)
  where tenant_id=p_tenant and user_id=actor and revoked_at is null;
  get diagnostics changed=row_count;
  return changed;
end;
$$;
revoke all on function public.revoke_all_own_platform_sessions(uuid,text) from public,anon;
grant execute on function public.revoke_all_own_platform_sessions(uuid,text) to authenticated;

create index if not exists communication_consents_tenant_user_idx
on public.communication_consents(tenant_id,user_id,channel,opted_in);
create index if not exists push_subscriptions_active_user_idx
on public.push_subscriptions(tenant_id,user_id,active,last_used_at desc);
create index if not exists security_alerts_user_created_idx
on public.security_alerts(tenant_id,user_id,created_at desc);

commit;
