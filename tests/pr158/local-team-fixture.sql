create table public.tenants (id uuid primary key default gen_random_uuid(), slug text not null, name text not null, status text not null default 'active', is_primary boolean not null default false);
create table public.admin_users (id bigint generated always as identity primary key, email text not null unique, role text not null, assigned_program text, is_active boolean not null default false, user_id uuid);
create table public.programs (id bigint generated always as identity primary key, slug text not null unique, name text not null);
create table public.activity_logs (id bigint generated always as identity primary key, admin_email text, actor_user_id uuid, action text, entity_type text, entity_id text, metadata jsonb default '{}'::jsonb, tenant_id uuid not null, source_route text, outcome text not null default 'success');
insert into public.tenants (slug,name,status,is_primary) values ('pr158-test','PR158 Local','active',true);
insert into public.programs (slug,name) values ('tiktok','TikTok');
grant usage on schema public to service_role;
grant all on public.tenants,public.admin_users,public.programs,public.activity_logs to service_role;
grant usage,select on all sequences in schema public to service_role;
