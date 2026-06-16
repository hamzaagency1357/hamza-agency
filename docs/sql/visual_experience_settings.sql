-- HAMZA AGENCY
-- Permanent Visual Experience settings schema
-- Step: 6B-1
--
-- Purpose:
-- Store Visual Experience presets as durable admin-managed records.
-- This table does not apply any setting to the live public website by itself.
-- Public application must remain controlled by apply_to_public and requires explicit visual approval.
--
-- How to apply:
-- Run this file once in Supabase SQL Editor after review.
-- This file is intentionally not auto-run by the app.

create extension if not exists pgcrypto;

create table if not exists public.visual_experience_settings (
  id uuid primary key default gen_random_uuid(),

  preset_name text not null default 'HAMZA AGENCY Visual Draft',
  background text not null default 'hepta',
  motion text not null default 'medium',

  glow boolean not null default true,
  glass boolean not null default true,
  animated_cards boolean not null default true,

  cards_scope text[] not null default array['الخدمات', 'الإحصائيات', 'مميزات الوكالة'],
  cards jsonb not null default '[]'::jsonb,

  notes text not null default '',
  status text not null default 'draft',

  apply_to_public boolean not null default false,
  approved_by text,
  approved_at timestamptz,

  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint visual_experience_settings_background_check
    check (background in ('royal', 'hepta', 'gold', 'nebula')),

  constraint visual_experience_settings_motion_check
    check (motion in ('low', 'medium', 'high')),

  constraint visual_experience_settings_status_check
    check (status in ('draft', 'review', 'approved', 'archived')),

  constraint visual_experience_public_requires_approval_check
    check (
      apply_to_public = false
      or (status = 'approved' and approved_by is not null and approved_at is not null)
    )
);

create index if not exists visual_experience_settings_status_idx
  on public.visual_experience_settings (status, updated_at desc);

create index if not exists visual_experience_settings_public_idx
  on public.visual_experience_settings (apply_to_public, updated_at desc)
  where apply_to_public = true;

create or replace function public.set_visual_experience_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_visual_experience_settings_updated_at on public.visual_experience_settings;

create trigger set_visual_experience_settings_updated_at
before update on public.visual_experience_settings
for each row
execute function public.set_visual_experience_settings_updated_at();

alter table public.visual_experience_settings enable row level security;

-- Public visitors can only read approved settings explicitly marked for public application.
drop policy if exists "Public can read approved visual experience settings" on public.visual_experience_settings;
create policy "Public can read approved visual experience settings"
on public.visual_experience_settings
for select
to anon, authenticated
using (
  apply_to_public = true
  and status = 'approved'
  and approved_by is not null
  and approved_at is not null
);

-- Active admins can read all visual experience settings.
drop policy if exists "Active admins can read visual experience settings" on public.visual_experience_settings;
create policy "Active admins can read visual experience settings"
on public.visual_experience_settings
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

-- Active admins can create visual experience settings.
drop policy if exists "Active admins can insert visual experience settings" on public.visual_experience_settings;
create policy "Active admins can insert visual experience settings"
on public.visual_experience_settings
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

-- Active admins can update visual experience settings.
drop policy if exists "Active admins can update visual experience settings" on public.visual_experience_settings;
create policy "Active admins can update visual experience settings"
on public.visual_experience_settings
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

-- Active admins can archive/delete draft presets from the internal workspace.
drop policy if exists "Active admins can delete visual experience settings" on public.visual_experience_settings;
create policy "Active admins can delete visual experience settings"
on public.visual_experience_settings
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users admin_user
    where admin_user.email = (auth.jwt() ->> 'email')
      and admin_user.is_active = true
  )
);

-- Required API privileges for Supabase clients.
grant usage on schema public to anon, authenticated;
grant select on table public.visual_experience_settings to anon;
grant select, insert, update, delete on table public.visual_experience_settings to authenticated;
