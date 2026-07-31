-- LOCAL TEST BOOTSTRAP ONLY.
-- This file reconstructs the schema state that existed before the first checked-in
-- migration. The GitHub workflow copies it temporarily into supabase/migrations.
-- It is never linked, pushed, or applied to a remote Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  field_name text not null,
  language text not null check (language in ('en','tr')),
  translated_value text not null default '',
  status text not null default 'draft' check (status in ('draft','needs_review','reviewed','published','archived')),
  reviewed boolean not null default false,
  is_published boolean not null default false,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_translations_field_name_check
    check (field_name in ('title','summary','content')),
  constraint content_translations_unique_item_field_language
    unique (source_type,source_id,field_name,language)
);

alter table public.content_translations enable row level security;
