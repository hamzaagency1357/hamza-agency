-- Isolated portal closeout contract. Synthetic local data only.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table public.tenants (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active','suspended','disabled')),
  is_primary boolean not null default false,
  default_locale text not null default 'ar',
  supported_locales text[] not null default array['ar','en','tr']::text[],
  created_at timestamptz not null default now()
);

create table public.tenant_domains (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  hostname text not null unique,
  status text not null default 'active' check (status in ('pending','verified','active','disabled')),
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('creator','client','employee','partner','tenant_admin','super_admin')),
  status text not null default 'invited' check (status in ('invited','active','suspended','revoked')),
  program_id bigint,
  permissions jsonb not null default '{}'::jsonb,
  mfa_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,user_id)
);

create table public.portal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  locale text not null default 'ar' check (locale in ('ar','en','tr')),
  status text not null default 'active' check (status in ('active','pending','suspended','blocked','disabled')),
  marketing_opt_in boolean not null default false,
  ai_opt_out boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.privacy_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null,
  status text not null default 'submitted',
  details jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.portal_notification_preferences (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  event_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (tenant_id,user_id,channel,event_key)
);

create table public.communication_consents (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  opted_in boolean not null default false,
  source text,
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  primary key (tenant_id,user_id,channel)
);

create table public.user_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null,
  device_label text,
  platform text,
  browser text,
  ip_hash text,
  suspicious boolean not null default false,
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  unique (tenant_id,user_id,auth_session_id)
);

create table public.security_alerts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tenants enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.portal_profiles enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.portal_notification_preferences enable row level security;
alter table public.communication_consents enable row level security;
alter table public.user_sessions enable row level security;
alter table public.security_alerts enable row level security;

create policy membership_self_read on public.tenant_memberships for select to authenticated using (user_id=auth.uid());
create policy profile_self_all on public.portal_profiles for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy privacy_self_all on public.privacy_requests for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy preference_self_all on public.portal_notification_preferences for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy consent_self_all on public.communication_consents for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy session_self_read on public.user_sessions for select to authenticated using (user_id=auth.uid());
create policy alert_self_all on public.security_alerts for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

grant usage on schema public to anon,authenticated;
grant select on public.tenant_memberships to authenticated;
grant select,insert,update on public.portal_profiles,public.privacy_requests,public.portal_notification_preferences,public.communication_consents,public.security_alerts to authenticated;
grant select on public.user_sessions to authenticated;

create or replace function public.resolve_public_tenant_runtime(p_hostname text)
returns table(id uuid)
language sql
stable
security definer
set search_path=public
as $$
  select t.id
  from public.tenant_domains d
  join public.tenants t on t.id=d.tenant_id
  where d.hostname=lower(split_part(trim(coalesce(p_hostname,'')),':',1))
    and d.status in ('verified','active') and t.status='active'
  order by d.is_primary desc
  limit 1;
$$;
revoke all on function public.resolve_public_tenant_runtime(text) from public;
grant execute on function public.resolve_public_tenant_runtime(text) to anon,authenticated;

create or replace function public.register_platform_session(
  p_tenant uuid,p_auth_session uuid,p_device_label text,p_platform text,p_browser text,p_ip_hash text,p_suspicious boolean
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.tenant_memberships m where m.tenant_id=p_tenant and m.user_id=auth.uid() and m.status='active') then
    raise exception 'active_membership_required';
  end if;
  insert into public.user_sessions(tenant_id,user_id,auth_session_id,device_label,platform,browser,ip_hash,suspicious,last_active_at,revoked_at,revoke_reason)
  values(p_tenant,auth.uid(),p_auth_session,left(p_device_label,160),left(p_platform,80),left(p_browser,80),p_ip_hash,coalesce(p_suspicious,false),now(),null,null)
  on conflict(tenant_id,user_id,auth_session_id) do update set device_label=excluded.device_label,platform=excluded.platform,browser=excluded.browser,ip_hash=excluded.ip_hash,suspicious=excluded.suspicious,last_active_at=now(),revoked_at=null,revoke_reason=null
  returning id into v_id;
  return v_id;
end;$$;

create or replace function public.revoke_own_platform_session(p_session uuid,p_reason text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.user_sessions set revoked_at=now(),revoke_reason=left(coalesce(p_reason,'user_requested'),120)
  where id=p_session and user_id=auth.uid() and revoked_at is null;
  return found;
end;$$;

create or replace function public.revoke_all_own_platform_sessions(p_tenant uuid,p_reason text)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer;
begin
  update public.user_sessions set revoked_at=now(),revoke_reason=left(coalesce(p_reason,'user_requested_all'),120)
  where tenant_id=p_tenant and user_id=auth.uid() and revoked_at is null;
  get diagnostics v_count=row_count;
  return v_count;
end;$$;

revoke all on function public.register_platform_session(uuid,uuid,text,text,text,text,boolean) from public;
revoke all on function public.revoke_own_platform_session(uuid,text) from public;
revoke all on function public.revoke_all_own_platform_sessions(uuid,text) from public;
grant execute on function public.register_platform_session(uuid,uuid,text,text,text,text,boolean) to authenticated;
grant execute on function public.revoke_own_platform_session(uuid,text) to authenticated;
grant execute on function public.revoke_all_own_platform_sessions(uuid,text) to authenticated;
