-- HAMZA AGENCY
-- Permanent White Label projects schema
-- Step: 4A-1
--
-- Purpose:
-- Store planned White Label agency copies as durable admin-managed records.
-- This table does not change the live HAMZA AGENCY public identity by itself.
-- Public application of these values must be implemented later with explicit approval.
--
-- How to apply:
-- Run this file once in Supabase SQL Editor after review.
-- This file is intentionally not auto-run by the app.

create extension if not exists pgcrypto;

create table if not exists public.white_label_projects (
  id uuid primary key default gen_random_uuid(),

  agency_name text not null default '',
  owner_name text not null default '',
  owner_email text not null default '',
  domain text not null default '',

  default_language text not null default 'ar',
  enabled_languages text[] not null default array['ar', 'en', 'tr'],

  primary_color text not null default '#09000f',
  accent_color text not null default '#d4af37',
  logo_url text,
  contact_email text,
  whatsapp text,

  package_type text not null default 'standard',
  status text not null default 'draft',
  notes text not null default '',
  checklist jsonb not null default '{}'::jsonb,

  is_active boolean not null default true,
  created_by text,
  updated_by text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint white_label_projects_default_language_check
    check (default_language in ('ar', 'en', 'tr')),

  constraint white_label_projects_package_type_check
    check (package_type in ('standard', 'premium', 'enterprise')),

  constraint white_label_projects_status_check
    check (status in ('draft', 'review', 'ready', 'archived'))
);

create index if not exists white_label_projects_status_idx
  on public.white_label_projects (status, updated_at desc);

create index if not exists white_label_projects_domain_idx
  on public.white_label_projects (domain)
  where domain <> '';

create or replace function public.set_white_label_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_white_label_projects_updated_at on public.white_label_projects;

create trigger set_white_label_projects_updated_at
before update on public.white_label_projects
for each row
execute function public.set_white_label_projects_updated_at();

alter table public.white_label_projects enable row level security;

-- Active admins can read White Label project records.
drop policy if exists "Active admins can read white label projects" on public.white_label_projects;
create policy "Active admins can read white label projects"
on public.white_label_projects
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users admin_user
    where admin_user.email = (auth.jwt() ->> 'email')
      and admin_user.is_active = true
  )
);

-- Active admins can create White Label project records.
drop policy if exists "Active admins can insert white label projects" on public.white_label_projects;
create policy "Active admins can insert white label projects"
on public.white_label_projects
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users admin_user
    where admin_user.email = (auth.jwt() ->> 'email')
      and admin_user.is_active = true
  )
);

-- Active admins can update White Label project records.
drop policy if exists "Active admins can update white label projects" on public.white_label_projects;
create policy "Active admins can update white label projects"
on public.white_label_projects
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users admin_user
    where admin_user.email = (auth.jwt() ->> 'email')
      and admin_user.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.admin_users admin_user
    where admin_user.email = (auth.jwt() ->> 'email')
      and admin_user.is_active = true
  )
);

-- No public access and no normal delete policy are created on purpose.
-- Archiving should use status = 'archived' and is_active = false.
