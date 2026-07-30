-- HAMZA AGENCY PR101 product expansion hardening
-- Additive-only. No business rows are deleted and no applied migration is edited.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  media_id bigint,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_id uuid not null references public.workflow_definitions(id) on delete cascade,
  step_key text not null,
  step_type text not null check (step_type in ('assign_role','create_task','notify','wait','condition','escalate','complete')),
  position integer not null check (position >= 0),
  configuration jsonb not null default '{}'::jsonb,
  retry_limit integer not null default 3 check (retry_limit between 0 and 10),
  timeout_seconds integer check (timeout_seconds is null or timeout_seconds between 1 and 86400),
  unique (workflow_id,step_key),
  unique (workflow_id,position)
);

create table if not exists public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  step_id uuid references public.workflow_steps(id) on delete set null,
  event_type text not null check (event_type in ('queued','started','waiting','retried','completed','failed','cancelled')),
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  unique (tenant_id,idempotency_key)
);

create table if not exists public.marketplace_listing_translations (
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  locale text not null check (locale in ('ar','en','tr')),
  title text not null,
  summary text,
  description text,
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now(),
  primary key (listing_id,locale)
);

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  order_id uuid references public.marketplace_orders(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 3000),
  status text not null default 'pending' check (status in ('pending','published','rejected','archived')),
  created_at timestamptz not null default now(),
  unique (listing_id,user_id,order_id)
);

create table if not exists public.marketplace_favorites (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id,user_id)
);

create table if not exists public.legal_policy_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  policy_type text not null check (policy_type in ('privacy','cookies','ai','terms')),
  locale text not null check (locale in ('ar','en','tr')),
  version text not null,
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id,policy_type,locale,version)
);

create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null check (alert_type in ('new_device','suspicious_login','session_revoked','password_changed','mfa_required')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  metadata jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.product_kpi_daily (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  metric_date date not null,
  metric_key text not null,
  metric_value numeric not null default 0,
  dimensions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id,metric_date,metric_key,dimensions)
);

create table if not exists public.pr101_gateway_nonces (
  nonce text primary key check (nonce ~ '^[A-Za-z0-9_-]{24,80}$'),
  action text not null,
  request_timestamp bigint not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.task_assignments add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.task_comments add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.task_status_history add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.marketplace_order_items add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.incident_updates add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

update public.task_assignments a set tenant_id=t.tenant_id from public.tasks t where a.task_id=t.id and a.tenant_id is null;
update public.task_comments c set tenant_id=t.tenant_id from public.tasks t where c.task_id=t.id and c.tenant_id is null;
update public.task_status_history h set tenant_id=t.tenant_id from public.tasks t where h.task_id=t.id and h.tenant_id is null;
update public.marketplace_order_items i set tenant_id=o.tenant_id from public.marketplace_orders o where i.order_id=o.id and i.tenant_id is null;
update public.incident_updates u set tenant_id=i.tenant_id from public.incidents i where u.incident_id=i.id and u.tenant_id is null;

create or replace function private.has_tenant_role(target_tenant uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id=target_tenant
      and tm.user_id=(select auth.uid())
      and tm.status='active'
      and tm.role=any(allowed_roles)
  );
$$;
revoke all on function private.has_tenant_role(uuid,text[]) from public;
grant execute on function private.has_tenant_role(uuid,text[]) to authenticated;

create or replace function public.current_user_has_tenant_role(target_tenant uuid, allowed_roles text[])
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$ select private.has_tenant_role(target_tenant,allowed_roles); $$;
revoke all on function public.current_user_has_tenant_role(uuid,text[]) from public;
grant execute on function public.current_user_has_tenant_role(uuid,text[]) to authenticated;

create or replace function private.public_tenant_runtime(target_hostname text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_host text := lower(split_part(trim(coalesce(target_hostname,'')),':',1));
  selected_tenant public.tenants%rowtype;
  result jsonb;
begin
  if normalized_host !~ '^[a-z0-9.-]{1,253}$' then normalized_host := ''; end if;
  select t.* into selected_tenant
  from public.tenants t
  left join public.tenant_domains d on d.tenant_id=t.id and d.hostname=normalized_host and d.status in ('verified','active')
  where t.status='active'
  order by (d.id is not null) desc,t.is_primary desc
  limit 1;
  if selected_tenant.id is null then return null; end if;
  select jsonb_build_object(
    'id',selected_tenant.id,
    'slug',selected_tenant.slug,
    'name',selected_tenant.name,
    'defaultLocale',selected_tenant.default_locale,
    'supportedLocales',selected_tenant.supported_locales,
    'branding',coalesce((select to_jsonb(b)-'tenant_id' from public.tenant_branding b where b.tenant_id=selected_tenant.id),'{}'::jsonb),
    'featureFlags',coalesce((select jsonb_object_agg(f.feature_key,jsonb_build_object('enabled',f.enabled,'configuration',f.configuration)) from public.tenant_feature_flags f where f.tenant_id=selected_tenant.id),'{}'::jsonb),
    'settings',coalesce((select jsonb_object_agg(s.key,s.value) from public.tenant_settings s where s.tenant_id=selected_tenant.id and s.is_secret=false),'{}'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function private.public_tenant_runtime(text) from public;
grant execute on function private.public_tenant_runtime(text) to anon,authenticated;

create or replace function public.resolve_public_tenant_runtime(p_hostname text)
returns jsonb
language sql
stable
security invoker
set search_path = private
as $$ select private.public_tenant_runtime(p_hostname); $$;
revoke all on function public.resolve_public_tenant_runtime(text) from public;
grant execute on function public.resolve_public_tenant_runtime(text) to anon,authenticated;

create or replace function public.record_task_status_history()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.task_status_history(task_id,tenant_id,from_status,to_status,changed_by)
    values(new.id,new.tenant_id,case when tg_op='INSERT' then null else old.status end,new.status,(select auth.uid()));
  end if;
  if new.status in ('resolved','closed') and new.completed_at is null then new.completed_at=now(); end if;
  return new;
end;
$$;
drop trigger if exists tasks_status_history_trigger on public.tasks;
create trigger tasks_status_history_trigger before insert or update of status on public.tasks
for each row execute function public.record_task_status_history();

create or replace function public.pr101_oidc_gateway(
  p_action text,
  p_timestamp bigint,
  p_nonce text,
  p_body text,
  p_body_digest text,
  p_oidc_issuer text,
  p_oidc_subject text,
  p_oidc_audience text,
  p_oidc_team_id text,
  p_oidc_project_id text,
  p_oidc_project text,
  p_oidc_environment text,
  p_oidc_issued_at bigint,
  p_oidc_expires_at bigint
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  payload jsonb;
  tenant uuid;
  event_uuid uuid;
  now_epoch bigint := extract(epoch from now())::bigint;
begin
  if p_oidc_issuer <> 'https://oidc.vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_audience <> 'https://vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_team_id <> 'team_gu9SOMWlOqS2uvLEZUYEbTPs'
     or p_oidc_project_id <> 'prj_YQw97FRAAwcnpQkudzGr01kXASvN'
     or p_oidc_project <> 'hamza-agency'
     or p_oidc_environment not in ('preview','production')
     or p_oidc_subject <> format('owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:%s',p_oidc_environment)
     or p_timestamp < now_epoch-120 or p_timestamp > now_epoch+30
     or p_oidc_issued_at > now_epoch+30 or p_oidc_expires_at < now_epoch
     or p_nonce !~ '^[A-Za-z0-9_-]{24,80}$'
     or encode(digest(p_body,'sha256'),'hex') <> lower(p_body_digest)
  then return jsonb_build_object('allowed',false,'code','invalid_gateway_request'); end if;

  delete from public.pr101_gateway_nonces where expires_at<now();
  begin
    insert into public.pr101_gateway_nonces(nonce,action,request_timestamp,expires_at)
    values(p_nonce,p_action,p_timestamp,now()+interval '10 minutes');
  exception when unique_violation then
    return jsonb_build_object('allowed',false,'code','replay_rejected');
  end;

  payload := p_body::jsonb;
  select id into tenant from public.tenants
  where status='active' and (
    id::text=coalesce(payload->>'tenantId','') or
    is_primary=true or
    exists(select 1 from public.tenant_domains d where d.tenant_id=tenants.id and d.hostname=lower(split_part(coalesce(payload->>'hostname',''),':',1)) and d.status in ('verified','active'))
  ) order by exists(select 1 from public.tenant_domains d where d.tenant_id=tenants.id and d.hostname=lower(split_part(coalesce(payload->>'hostname',''),':',1)) and d.status in ('verified','active')) desc,is_primary desc limit 1;
  if tenant is null then return jsonb_build_object('allowed',false,'code','tenant_not_found'); end if;

  if p_action='consent_record' then
    insert into public.consent_records(tenant_id,anonymous_id,consent_version,necessary,analytics,preferences,marketing,region,withdrawn_at)
    values(tenant,nullif(payload->>'anonymousId',''),left(coalesce(payload->>'consentVersion','1'),50),true,
      coalesce((payload->>'analytics')::boolean,false),coalesce((payload->>'preferences')::boolean,false),coalesce((payload->>'marketing')::boolean,false),
      left(coalesce(payload->>'region','unknown'),40),case when coalesce((payload->>'withdrawn')::boolean,false) then now() else null end)
    returning id into event_uuid;
    return jsonb_build_object('allowed',true,'id',event_uuid);
  elsif p_action='payment_webhook_record' then
    insert into public.payment_webhook_events(tenant_id,provider_key,event_id,signature_valid,payload_digest,processing_status)
    values(tenant,left(payload->>'providerKey',80),left(payload->>'eventId',200),true,left(payload->>'payloadDigest',64),'received')
    on conflict (tenant_id,provider_key,event_id) do nothing
    returning id into event_uuid;
    return jsonb_build_object('allowed',true,'id',event_uuid,'duplicate',event_uuid is null);
  elsif p_action='provider_event_enqueue' then
    insert into public.provider_message_events(tenant_id,provider_type,provider_key,event_key,status,payload)
    values(tenant,payload->>'providerType',left(payload->>'providerKey',80),left(payload->>'eventKey',128),'queued',coalesce(payload->'payload','{}'::jsonb))
    on conflict (tenant_id,provider_type,event_key) do nothing
    returning id into event_uuid;
    return jsonb_build_object('allowed',true,'id',event_uuid,'duplicate',event_uuid is null);
  elsif p_action='provider_health_record' then
    insert into public.provider_health_checks(tenant_id,provider_type,provider_key,status,latency_ms,detail)
    values(tenant,payload->>'providerType',left(payload->>'providerKey',80),payload->>'status',nullif(payload->>'latencyMs','')::integer,coalesce(payload->'detail','{}'::jsonb))
    returning id::text::uuid into event_uuid;
    return jsonb_build_object('allowed',true);
  end if;
  return jsonb_build_object('allowed',false,'code','unsupported_action');
exception when others then
  return jsonb_build_object('allowed',false,'code','gateway_operation_failed');
end;
$$;
revoke all on function public.pr101_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint) from public,anon,authenticated;

-- RLS on every new exposed table.
do $$ declare t text; begin
  foreach t in array array['task_attachments','workflow_steps','workflow_events','marketplace_listing_translations','marketplace_reviews','marketplace_favorites','legal_policy_versions','security_alerts','product_kpi_daily','pr101_gateway_nonces'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

create policy "tenant staff manage tasks" on public.tasks for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "task members read assignments" on public.task_assignments for select to authenticated
using (user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "task staff manage assignments" on public.task_assignments for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "task participants read comments" on public.task_comments for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']) or exists(select 1 from public.task_assignments a where a.task_id=task_comments.task_id and a.user_id=(select auth.uid())));
create policy "task participants add comments" on public.task_comments for insert to authenticated
with check (author_id=(select auth.uid()) and (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']) or exists(select 1 from public.task_assignments a where a.task_id=task_comments.task_id and a.user_id=(select auth.uid()))));
create policy "task participants read history" on public.task_status_history for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']) or exists(select 1 from public.task_assignments a where a.task_id=task_status_history.task_id and a.user_id=(select auth.uid())));
create policy "task participants read attachments" on public.task_attachments for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']) or exists(select 1 from public.task_assignments a where a.task_id=task_attachments.task_id and a.user_id=(select auth.uid())));

create policy "tenant staff manage sla policies" on public.sla_policies for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant staff read sla events" on public.sla_events for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant admins manage workflows" on public.workflow_definitions for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant staff read workflow runs" on public.workflow_runs for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant admins manage workflow steps" on public.workflow_steps for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant staff read workflow events" on public.workflow_events for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

create policy "public reads published categories" on public.marketplace_categories for select to anon,authenticated using (active=true);
create policy "public reads published listings" on public.marketplace_listings for select to anon,authenticated using (status='published');
create policy "public reads listing translations" on public.marketplace_listing_translations for select to anon,authenticated using (exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.status='published'));
create policy "public reads published reviews" on public.marketplace_reviews for select to anon,authenticated using (status='published');
create policy "tenant sellers manage listings" on public.marketplace_listings for all to authenticated
using (partner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (partner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "users manage favorites" on public.marketplace_favorites for all to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "clients create orders" on public.marketplace_orders for insert to authenticated
with check (client_user_id=(select auth.uid()) and public.current_user_has_tenant_role(tenant_id,array['client','creator','partner','employee','tenant_admin','super_admin']));
create policy "clients read order items" on public.marketplace_order_items for select to authenticated
using (exists(select 1 from public.marketplace_orders o where o.id=order_id and (o.client_user_id=(select auth.uid()) or public.current_user_has_tenant_role(o.tenant_id,array['super_admin','tenant_admin','employee','partner']))));
create policy "clients add cart items" on public.marketplace_cart_items for all to authenticated
using (exists(select 1 from public.marketplace_carts c where c.id=cart_id and c.user_id=(select auth.uid())))
with check (exists(select 1 from public.marketplace_carts c where c.id=cart_id and c.user_id=(select auth.uid())));
create policy "verified buyers add reviews" on public.marketplace_reviews for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.marketplace_orders o where o.id=order_id and o.client_user_id=(select auth.uid()) and o.status='fulfilled'));

create policy "users read security alerts" on public.security_alerts for select to authenticated using (user_id=(select auth.uid()));
create policy "users acknowledge security alerts" on public.security_alerts for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "tenant admins manage legal versions" on public.legal_policy_versions for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "public reads published legal versions" on public.legal_policy_versions for select to anon,authenticated using (status='published');
create policy "tenant staff read kpi" on public.product_kpi_daily for select to authenticated using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

-- Public incident status contains no private notes or user identifiers.
create policy "public reads active incidents" on public.incidents for select to anon,authenticated using (status in ('investigating','identified','monitoring','resolved'));
create policy "public reads incident updates" on public.incident_updates for select to anon,authenticated using (true);
create policy "tenant admins manage incidents" on public.incidents for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant admins manage incident updates" on public.incident_updates for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

-- Provider and gateway evidence is server-only.
revoke all on public.payment_providers,public.payment_intents,public.payment_transactions,public.payment_webhook_events,public.payment_refunds,public.provider_message_events,public.provider_health_checks,public.pr101_gateway_nonces from anon,authenticated;

insert into public.permissions(permission_key,display_name,category,description)
values
 ('tenants.view','View tenants','product_expansion','View tenant inventory and public runtime status'),
 ('tenants.manage','Manage tenants','product_expansion','Manage branding, domains, members, settings and flags'),
 ('portals.manage','Manage portal users','product_expansion','Manage creator, client, employee and partner memberships'),
 ('tasks.manage','Manage tasks','operations','Create, assign, update and export tenant tasks'),
 ('sla.manage','Manage SLA','operations','Manage policies, timers, escalations and breach evidence'),
 ('workflows.publish','Publish workflows','operations','Publish declarative tenant workflows'),
 ('marketplace.manage','Manage marketplace','commerce','Manage categories, listings, orders, refunds and disputes'),
 ('providers.manage','Manage providers','integrations','Manage disabled-by-default provider configuration'),
 ('privacy.manage','Manage privacy requests','privacy','Verify and process privacy requests'),
 ('sessions.manage','Manage sessions','security','View and revoke authorized user sessions'),
 ('incidents.manage','Manage incidents','operations','Manage status incidents and postmortems'),
 ('analytics.product_expansion','View product expansion analytics','analytics','View tenant, portal, task, SLA, commerce and provider KPI')
on conflict (permission_key) do update set display_name=excluded.display_name,category=excluded.category,description=excluded.description;

insert into public.tenant_settings(tenant_id,key,value,is_secret)
select id,k,v,false from public.tenants cross join (values
 ('cookie_consent_version','"1.0"'::jsonb),
 ('ai_retention_days','30'::jsonb),
 ('session_idle_minutes','60'::jsonb),
 ('business_hours','{"timezone":"Europe/Istanbul","days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb),
 ('provider_mode','"disabled"'::jsonb)
) defaults(k,v)
on conflict (tenant_id,key) do nothing;

create index if not exists task_assignments_tenant_user_idx on public.task_assignments(tenant_id,user_id,assignment_type);
create index if not exists task_comments_tenant_task_idx on public.task_comments(tenant_id,task_id,created_at);
create index if not exists sla_events_tenant_deadline_idx on public.sla_events(tenant_id,event_type,deadline_at);
create index if not exists workflow_runs_tenant_status_idx on public.workflow_runs(tenant_id,status,created_at);
create index if not exists marketplace_listings_public_idx on public.marketplace_listings(tenant_id,status,category_id,updated_at);
create index if not exists marketplace_orders_tenant_status_idx on public.marketplace_orders(tenant_id,status,payment_status,created_at);
create index if not exists privacy_requests_tenant_status_idx on public.privacy_requests(tenant_id,status,due_at);
create index if not exists user_sessions_active_idx on public.user_sessions(tenant_id,user_id,last_active_at desc) where revoked_at is null;
create index if not exists incidents_tenant_status_idx on public.incidents(tenant_id,status,severity,started_at desc);
