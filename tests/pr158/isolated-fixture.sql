-- Isolated PostgreSQL fixture; never connect to Supabase or Production.
create role authenticated nologin;
create role anon nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
create table public.admin_users(email text primary key, role text not null, is_active boolean not null);
create table public.programs(id bigint primary key, title text not null);
create table public.trash_items(
  id bigint primary key, item_type text not null, item_id text not null,
  item_data jsonb, data jsonb, restore_status text not null,
  restored_at timestamptz
);
create table public.tenants(id uuid primary key, is_primary boolean not null, status text not null);
insert into public.tenants values ('00000000-0000-0000-0000-000000000001',true,'active');
create table public.activity_logs(
  id bigint generated always as identity primary key,
  admin_email text, actor_user_id uuid, action text, entity_type text,
  entity_id text, new_data text, metadata jsonb, source_route text, outcome text, tenant_id uuid not null references public.tenants(id)
);
create function public.pr99_require_admin() returns text language sql stable
as $$select current_setting('test.actor',true)$$;
create function public.pr99_operations_allowlist() returns text[]
language sql immutable as $$select array['programs']::text[]$$;
insert into public.admin_users values
 ('owner@example.test','super_admin',true),
 ('deputy@example.test','deputy_super_admin',true),
 ('staff@example.test','program_admin',true),
 ('disabled@example.test','super_admin',false);
