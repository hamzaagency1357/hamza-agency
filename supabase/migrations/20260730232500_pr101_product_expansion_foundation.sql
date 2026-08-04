-- HAMZA AGENCY PR101 Product Expansion foundation
-- Additive-only migration. Existing data remains intact.

create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  is_primary boolean not null default false,
  default_locale text not null default 'ar' check (default_locale in ('ar','en','tr')),
  supported_locales text[] not null default array['ar','en','tr']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tenants_single_primary_idx on public.tenants ((is_primary)) where is_primary;

insert into public.tenants (slug,name,is_primary)
values ('hamza-agency','HAMZA AGENCY',true)
on conflict (slug) do update set name=excluded.name;

create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  hostname text not null,
  status text not null default 'pending' check (status in ('pending','verified','active','failed','disabled')),
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (hostname)
);

create table if not exists public.tenant_branding (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  logo_media_id bigint,
  favicon_media_id bigint,
  primary_color text,
  secondary_color text,
  accent_color text,
  contact_email text,
  contact_phone text,
  social_links jsonb not null default '{}'::jsonb,
  email_sender_name text,
  email_sender_address text,
  legal_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_settings (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  value jsonb not null default 'null'::jsonb,
  is_secret boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id,key)
);

create table if not exists public.tenant_feature_flags (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id,feature_key)
);

create table if not exists public.portal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  locale text not null default 'ar' check (locale in ('ar','en','tr')),
  avatar_media_id bigint,
  status text not null default 'active' check (status in ('active','suspended','pending_deletion')),
  marketing_opt_in boolean not null default false,
  ai_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','tenant_admin','creator','client','employee','partner')),
  status text not null default 'active' check (status in ('invited','active','suspended','revoked')),
  program_id bigint,
  permissions jsonb not null default '{}'::jsonb,
  mfa_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,user_id,role)
);

create index if not exists tenant_memberships_user_idx on public.tenant_memberships(user_id,tenant_id,status);

create or replace function public.current_user_has_tenant_role(target_tenant uuid, allowed_roles text[])
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = target_tenant
      and tm.user_id = (select auth.uid())
      and tm.status = 'active'
      and tm.role = any(allowed_roles)
  );
$$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','blocked','resolved','closed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  related_type text check (related_type in ('APP','SR','JOB','CNT','creator','client','partner','marketplace_order','incident')),
  related_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_tenant_status_idx on public.tasks(tenant_id,status,due_at);

create table if not exists public.task_assignments (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_type text not null default 'assignee' check (assignment_type in ('assignee','watcher')),
  assigned_at timestamptz not null default now(),
  primary key (task_id,user_id,assignment_type)
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 10000),
  is_internal boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.task_status_history (
  id bigint generated by default as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create table if not exists public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  entity_type text not null,
  first_response_minutes integer not null check (first_response_minutes > 0),
  resolution_minutes integer not null check (resolution_minutes > 0),
  business_hours jsonb not null default '{}'::jsonb,
  pause_statuses text[] not null default array[]::text[],
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sla_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  policy_id uuid references public.sla_policies(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  event_type text not null check (event_type in ('started','paused','resumed','warning','breached','met','cancelled')),
  deadline_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  definition jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,name,version)
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workflow_id uuid not null references public.workflow_definitions(id),
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued','running','waiting','completed','failed','cancelled')),
  context jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id,idempotency_key)
);

create table if not exists public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  translations jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  unique (tenant_id,slug)
);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  partner_user_id uuid references auth.users(id),
  category_id uuid references public.marketplace_categories(id) on delete set null,
  listing_type text not null check (listing_type in ('product','service')),
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  slug text not null,
  translations jsonb not null default '{}'::jsonb,
  media_ids bigint[] not null default array[]::bigint[],
  price_amount numeric(14,2),
  currency text,
  availability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,slug)
);

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_code text not null,
  client_user_id uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending','confirmed','in_progress','fulfilled','cancelled','refunded','disputed')),
  currency text,
  subtotal numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','partially_refunded','refunded','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,order_code)
);

create table if not exists public.marketplace_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  listing_id uuid references public.marketplace_listings(id),
  title_snapshot jsonb not null default '{}'::jsonb,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0,
  total_price numeric(14,2) not null default 0
);

create table if not exists public.payment_providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_key text not null,
  mode text not null default 'disabled' check (mode in ('disabled','manual','sandbox','live')),
  public_configuration jsonb not null default '{}'::jsonb,
  secret_reference text,
  created_at timestamptz not null default now(),
  unique (tenant_id,provider_key)
);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_id uuid references public.payment_providers(id),
  order_id uuid references public.marketplace_orders(id),
  idempotency_key text not null,
  amount numeric(14,2) not null,
  currency text not null,
  status text not null default 'created' check (status in ('created','pending','authorized','succeeded','failed','cancelled','refunded')),
  provider_reference text,
  created_at timestamptz not null default now(),
  unique (tenant_id,idempotency_key)
);

create table if not exists public.provider_message_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_type text not null check (provider_type in ('whatsapp','push','ai','payment')),
  provider_key text not null,
  event_key text not null,
  user_id uuid references auth.users(id),
  status text not null default 'queued' check (status in ('queued','processing','sent','delivered','failed','skipped')),
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,provider_type,event_key)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint_hash text not null,
  endpoint_ciphertext text not null,
  key_ciphertext text not null,
  auth_ciphertext text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (tenant_id,user_id,endpoint_hash)
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  request_type text not null check (request_type in ('access','download','correction','deletion','consent_withdrawal')),
  status text not null default 'submitted' check (status in ('submitted','verification_required','verified','in_progress','completed','rejected','cancelled')),
  details jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id),
  anonymous_id text,
  consent_version text not null,
  necessary boolean not null default true,
  analytics boolean not null default false,
  preferences boolean not null default false,
  marketing boolean not null default false,
  region text,
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  check (user_id is not null or anonymous_id is not null)
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid,
  device_label text,
  platform text,
  browser text,
  ip_hash text,
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz,
  suspicious boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  status text not null default 'investigating' check (status in ('investigating','identified','monitoring','resolved')),
  owner_id uuid references auth.users(id),
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  postmortem text,
  created_at timestamptz not null default now()
);

create table if not exists public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  status text not null,
  message text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Add tenant_id to core tables without making it NOT NULL until backfill completes.
do $$
declare t text;
begin
  foreach t in array array['agency_applications','service_requests','job_applications','contact_messages','programs','pages','sections','media','announcements','jobs','reviews','success_stories','partners','gallery_items','knowledge_base','notifications','activity_logs','backups','restore_operations']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists tenant_id uuid references public.tenants(id)',t);
      execute format('update public.%I set tenant_id=(select id from public.tenants where is_primary limit 1) where tenant_id is null',t);
      execute format('create index if not exists %I on public.%I(tenant_id)',t || '_tenant_idx',t);
    end if;
  end loop;
end $$;

-- RLS is mandatory on every new exposed table.
do $$
declare t text;
begin
  foreach t in array array['tenants','tenant_domains','tenant_branding','tenant_settings','tenant_feature_flags','portal_profiles','tenant_memberships','tasks','task_assignments','task_comments','task_status_history','sla_policies','sla_events','workflow_definitions','workflow_runs','marketplace_categories','marketplace_listings','marketplace_orders','marketplace_order_items','payment_providers','payment_intents','provider_message_events','push_subscriptions','privacy_requests','consent_records','user_sessions','incidents','incident_updates']
  loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

-- Membership-scoped read policies. Server-side routes remain responsible for privileged writes.
create policy "members read own tenant" on public.tenants for select to authenticated
using (public.current_user_has_tenant_role(id,array['super_admin','tenant_admin','creator','client','employee','partner']));

create policy "users read own portal profile" on public.portal_profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users update own portal profile" on public.portal_profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "users read own memberships" on public.tenant_memberships for select to authenticated
using ((select auth.uid()) = user_id or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

create policy "tenant members read tasks" on public.tasks for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']) or exists(select 1 from public.task_assignments ta where ta.task_id=id and ta.user_id=(select auth.uid())));

create policy "users read own orders" on public.marketplace_orders for select to authenticated
using (client_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));

create policy "users read own privacy requests" on public.privacy_requests for select to authenticated
using (user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "users create own privacy requests" on public.privacy_requests for insert to authenticated
with check (user_id=(select auth.uid()) and public.current_user_has_tenant_role(tenant_id,array['creator','client','employee','partner','tenant_admin','super_admin']));

create policy "users read own sessions" on public.user_sessions for select to authenticated
using (user_id=(select auth.uid()));
create policy "users revoke own sessions" on public.user_sessions for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

revoke all on function public.current_user_has_tenant_role(uuid,text[]) from public;
grant execute on function public.current_user_has_tenant_role(uuid,text[]) to authenticated;

comment on table public.payment_providers is 'Provider-neutral configuration. Secrets are references only and never client-readable.';
comment on table public.provider_message_events is 'Idempotent provider queue for WhatsApp, Push, AI and Payment adapters.';
comment on table public.consent_records is 'Versioned cookie and communication consent history.';
