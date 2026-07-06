-- HAMZA AGENCY
-- F6-B1 — Translation revision foundation
--
-- Additive schema only.
-- This migration does NOT modify public.content_translations,
-- current public readers, current review/publish behavior,
-- or the existing Arabic-source invalidation trigger.
--
-- It creates an isolated revision layer so F6-B2 can later keep
-- the last published translation public while a newer candidate draft
-- is reviewed against an updated Arabic source.
--
-- Run this manually in Supabase SQL Editor only after the related PR
-- is merged and Production is Ready.

begin;

create table if not exists public.translation_source_revisions (
  id uuid primary key default gen_random_uuid(),

  source_type text not null check (
    source_type in (
      'programs',
      'pages',
      'sections',
      'faqs',
      'knowledge_base',
      'partners',
      'jobs',
      'reviews',
      'success_stories',
      'gallery_items',
      'announcements',
      'services',
      'legal_pages'
    )
  ),

  source_id text not null check (btrim(source_id) <> ''),
  source_locale text not null default 'ar' check (source_locale = 'ar'),

  -- SHA-256 or an equivalent deterministic fingerprint of the Arabic
  -- source fields included in source_snapshot.
  source_fingerprint text not null check (btrim(source_fingerprint) <> ''),

  -- Immutable capture of the Arabic source fields used by this revision.
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),

  previous_source_revision_id uuid null
    references public.translation_source_revisions(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,

  -- Supports a composite foreign key from language revisions and prevents
  -- accidental mismatch between a source revision and its source identity.
  unique (id, source_type, source_id)
);

create index if not exists translation_source_revisions_lookup_idx
  on public.translation_source_revisions (
    source_type,
    source_id,
    created_at desc
  );

create index if not exists translation_source_revisions_fingerprint_idx
  on public.translation_source_revisions (
    source_type,
    source_id,
    source_fingerprint
  );

create table if not exists public.content_translation_revisions (
  id uuid primary key default gen_random_uuid(),

  source_revision_id uuid not null,
  source_type text not null check (
    source_type in (
      'programs',
      'pages',
      'sections',
      'faqs',
      'knowledge_base',
      'partners',
      'jobs',
      'reviews',
      'success_stories',
      'gallery_items',
      'announcements',
      'services',
      'legal_pages'
    )
  ),
  source_id text not null check (btrim(source_id) <> ''),

  language text not null check (language in ('en', 'tr')),

  -- Draft lifecycle is separate from the public published revision.
  workflow_status text not null default 'draft' check (
    workflow_status in (
      'draft',
      'needs_review',
      'reviewed',
      'published',
      'superseded',
      'archived'
    )
  ),

  -- A stale published revision remains public until a reviewed replacement
  -- is explicitly published. A stale candidate is no longer eligible to publish.
  is_stale boolean not null default false,
  stale_at timestamptz null,
  stale_reason text null,

  -- Candidate drafts can explicitly identify the published revision they
  -- were cloned from, preserving review history without overwriting it.
  supersedes_translation_revision_id uuid null
    references public.content_translation_revisions(id)
    on delete set null,

  review_notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,

  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null,

  published_at timestamptz null,
  published_by uuid null references auth.users(id) on delete set null,

  superseded_at timestamptz null,
  archived_at timestamptz null,

  constraint content_translation_revisions_source_revision_fk
    foreign key (source_revision_id, source_type, source_id)
    references public.translation_source_revisions(id, source_type, source_id)
    on delete restrict,

  constraint content_translation_revisions_stale_timestamp_check
    check (
      (is_stale = false and stale_at is null)
      or
      (is_stale = true and stale_at is not null)
    )
);

create index if not exists content_translation_revisions_lookup_idx
  on public.content_translation_revisions (
    source_type,
    source_id,
    language,
    workflow_status,
    created_at desc
  );

create index if not exists content_translation_revisions_source_revision_idx
  on public.content_translation_revisions (
    source_revision_id,
    language,
    created_at desc
  );

-- One and only one public revision may exist for a source and language.
-- F6-B2 will switch this pointer atomically only after manual publishing.
create unique index if not exists content_translation_revisions_one_published_idx
  on public.content_translation_revisions (
    source_type,
    source_id,
    language
  )
  where workflow_status = 'published';

create table if not exists public.content_translation_revision_fields (
  id uuid primary key default gen_random_uuid(),

  translation_revision_id uuid not null
    references public.content_translation_revisions(id)
    on delete cascade,

  field_name text not null check (
    field_name in (
      'title',
      'summary',
      'content',
      'requirements',
      'benefits',
      'updates',
      'faq',
      'department',
      'location',
      'job_type',
      'country',
      'person_name',
      'platform',
      'button_label',
      'meta_title',
      'meta_description',
      'question',
      'answer'
    )
  ),

  -- Arabic field value at the exact source revision being translated.
  source_value_snapshot text not null,

  -- Candidate or published translation text for this field.
  translated_value text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,

  unique (translation_revision_id, field_name)
);

create index if not exists content_translation_revision_fields_revision_idx
  on public.content_translation_revision_fields (
    translation_revision_id,
    field_name
  );

create or replace function public.touch_translation_revision_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_content_translation_revisions_updated_at
  on public.content_translation_revisions;

create trigger touch_content_translation_revisions_updated_at
before update on public.content_translation_revisions
for each row execute function public.touch_translation_revision_updated_at();

drop trigger if exists touch_content_translation_revision_fields_updated_at
  on public.content_translation_revision_fields;

create trigger touch_content_translation_revision_fields_updated_at
before update on public.content_translation_revision_fields
for each row execute function public.touch_translation_revision_updated_at();

-- F6-B1 intentionally has no access policies yet.
-- RLS therefore blocks browser/API access by default until F6-B2 introduces
-- the revision-aware admin/server access path.
alter table public.translation_source_revisions enable row level security;
alter table public.content_translation_revisions enable row level security;
alter table public.content_translation_revision_fields enable row level security;

comment on table public.translation_source_revisions is
  'Immutable Arabic source snapshots for translation revision lifecycle.';

comment on table public.content_translation_revisions is
  'Language-specific draft, reviewed, published, superseded, and archived translation revisions.';

comment on table public.content_translation_revision_fields is
  'Field values belonging to a language-specific translation revision.';

commit;
