-- HAMZA AGENCY
-- Permanent public content translations schema
-- Step: 3B-1
--
-- Purpose:
-- Store reviewed/published translations for public CMS content without changing
-- the Arabic source-of-truth tables. Arabic remains the official fallback.
--
-- How to apply:
-- Run this file once in Supabase SQL Editor after review.
-- This file is intentionally not auto-run by the app.

create extension if not exists pgcrypto;

create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),

  source_type text not null,
  source_id text not null,
  field_name text not null,
  language text not null,

  translated_value text not null default '',

  status text not null default 'draft',
  reviewed boolean not null default false,
  is_published boolean not null default false,

  created_by text,
  updated_by text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint content_translations_source_type_check
    check (source_type in ('programs', 'faqs', 'knowledge_base', 'pages', 'services', 'jobs', 'partners', 'legal_pages')),

  constraint content_translations_field_name_check
    check (field_name in ('title', 'summary', 'content', 'meta_title', 'meta_description', 'question', 'answer', 'button_label')),

  constraint content_translations_language_check
    check (language in ('en', 'tr')),

  constraint content_translations_status_check
    check (status in ('draft', 'needs_review', 'reviewed', 'published', 'archived')),

  constraint content_translations_unique_item_field_language
    unique (source_type, source_id, field_name, language)
);

create index if not exists content_translations_public_lookup_idx
  on public.content_translations (source_type, source_id, language, field_name)
  where is_published = true;

create index if not exists content_translations_admin_lookup_idx
  on public.content_translations (source_type, language, status, updated_at desc);

create or replace function public.set_content_translations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_translations_updated_at on public.content_translations;

create trigger set_content_translations_updated_at
before update on public.content_translations
for each row
execute function public.set_content_translations_updated_at();

alter table public.content_translations enable row level security;

-- Public visitors can only read translations that are explicitly published.
drop policy if exists "Public can read published content translations" on public.content_translations;
create policy "Public can read published content translations"
on public.content_translations
for select
to public
using (is_published = true and status in ('published', 'reviewed'));

-- Active admins can read all translation rows.
drop policy if exists "Active admins can read content translations" on public.content_translations;
create policy "Active admins can read content translations"
on public.content_translations
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

-- Active admins can insert translation rows.
drop policy if exists "Active admins can insert content translations" on public.content_translations;
create policy "Active admins can insert content translations"
on public.content_translations
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

-- Active admins can update translation rows.
drop policy if exists "Active admins can update content translations" on public.content_translations;
create policy "Active admins can update content translations"
on public.content_translations
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

-- No public or normal admin delete policy is created on purpose.
-- Deleting translations should remain a controlled super-admin operation later.
