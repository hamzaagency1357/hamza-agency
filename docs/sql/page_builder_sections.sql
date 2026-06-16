-- HAMZA AGENCY
-- Permanent Page Builder sections schema
-- Step: 5B-1
--
-- Purpose:
-- Store flexible Page Builder sections as durable records linked to the existing public CMS pages table.
-- This file intentionally does not create a second pages system.
-- The existing public.pages table remains the source of page identity, slug, publishing status, and SEO metadata.
--
-- How to apply:
-- Run this file once in Supabase SQL Editor after review.
-- This file is intentionally not auto-run by the app.

create extension if not exists pgcrypto;

create table if not exists public.page_builder_sections (
  id uuid primary key default gen_random_uuid(),

  page_id integer not null references public.pages(id) on delete cascade,

  section_type text not null default 'text',
  section_key text not null default '',
  title text not null default '',
  body text not null default '',
  button_label text,
  button_url text,
  media_url text,
  settings jsonb not null default '{}'::jsonb,

  sort_order integer not null default 1,
  language text not null default 'ar',
  is_visible boolean not null default true,

  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint page_builder_sections_section_type_check
    check (section_type in ('hero', 'text', 'cards', 'cta', 'faq', 'gallery', 'stats', 'custom')),

  constraint page_builder_sections_language_check
    check (language in ('ar', 'en', 'tr')),

  constraint page_builder_sections_sort_order_check
    check (sort_order >= 0)
);

create index if not exists page_builder_sections_page_order_idx
  on public.page_builder_sections (page_id, language, is_visible, sort_order);

create index if not exists page_builder_sections_type_idx
  on public.page_builder_sections (section_type);

create or replace function public.set_page_builder_sections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_page_builder_sections_updated_at on public.page_builder_sections;

create trigger set_page_builder_sections_updated_at
before update on public.page_builder_sections
for each row
execute function public.set_page_builder_sections_updated_at();

alter table public.page_builder_sections enable row level security;

-- Public visitors can read visible sections for published pages only.
drop policy if exists "Public can read visible page builder sections" on public.page_builder_sections;
create policy "Public can read visible page builder sections"
on public.page_builder_sections
for select
to anon, authenticated
using (
  is_visible = true
  and exists (
    select 1
    from public.pages page_record
    where page_record.id = page_builder_sections.page_id
      and page_record.is_published is not false
  )
);

-- Active admins can read all sections.
drop policy if exists "Active admins can read page builder sections" on public.page_builder_sections;
create policy "Active admins can read page builder sections"
on public.page_builder_sections
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

-- Active admins can create sections.
drop policy if exists "Active admins can insert page builder sections" on public.page_builder_sections;
create policy "Active admins can insert page builder sections"
on public.page_builder_sections
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

-- Active admins can update sections.
drop policy if exists "Active admins can update page builder sections" on public.page_builder_sections;
create policy "Active admins can update page builder sections"
on public.page_builder_sections
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

-- Active admins can delete sections from the builder.
drop policy if exists "Active admins can delete page builder sections" on public.page_builder_sections;
create policy "Active admins can delete page builder sections"
on public.page_builder_sections
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
grant select on table public.page_builder_sections to anon;
grant select, insert, update, delete on table public.page_builder_sections to authenticated;
