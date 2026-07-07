-- HAMZA AGENCY
-- F6-B3.1 — Read-only preflight before manual Supabase execution
--
-- Run this file in Supabase SQL Editor BEFORE:
-- docs/sql/20260707_translation_revision_backfill_and_source_invalidation.sql
--
-- This file performs SELECT-only inspection. It must not alter data, functions,
-- triggers, policies, or publication state.
--
-- Review all result sets before applying F6-B3.1:
-- 1) Confirm the current Arabic-source invalidation triggers are the expected
--    invalidate_translations_after_* trigger names.
-- 2) Record legacy translation totals and publication state.
-- 3) Record any Revision/Candidate rows created before backfill.
-- 4) Stop and investigate if an unexpected source-table trigger refers to
--    content_translations or another legacy invalidation path.

-- A. All user-defined triggers currently attached to translation source tables.
select
  trigger_table.relname as table_name,
  trigger.tgname as trigger_name,
  trigger.tgenabled as enabled_state,
  procedure.proname as function_name,
  pg_get_triggerdef(trigger.oid, true) as trigger_definition
from pg_trigger as trigger
join pg_class as trigger_table
  on trigger_table.oid = trigger.tgrelid
join pg_namespace as trigger_schema
  on trigger_schema.oid = trigger_table.relnamespace
join pg_proc as procedure
  on procedure.oid = trigger.tgfoid
where trigger_schema.nspname = 'public'
  and trigger_table.relname in (
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
    'announcements'
  )
  and not trigger.tgisinternal
order by trigger_table.relname, trigger.tgname;

-- B. Legacy content translation inventory. Keep this output with the execution
-- record so post-apply counts can be compared.
select
  source_type,
  language,
  status,
  is_published,
  count(*) as row_count,
  count(distinct source_id) as source_count
from public.content_translations
where source_type in (
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
  'announcements'
)
  and language in ('en', 'tr')
group by source_type, language, status, is_published
order by source_type, language, status, is_published;

-- C. Existing revision-layer inventory. Non-zero rows are valid, but must be
-- reviewed because F6-B3.1 will preserve them and refuse fingerprint conflicts.
select
  source_type,
  language,
  workflow_status,
  is_stale,
  count(*) as revision_count
from public.content_translation_revisions
group by source_type, language, workflow_status, is_stale
order by source_type, language, workflow_status, is_stale;

-- D. Active candidates that F6-B3.1 must never overwrite. These are intentionally
-- excluded from candidate backfill; complete legacy Published rows may still be
-- migrated separately as Published Revisions.
select
  source_type,
  source_id,
  language,
  workflow_status,
  is_stale,
  created_at,
  updated_at
from public.content_translation_revisions
where workflow_status in ('draft', 'needs_review', 'reviewed')
  and is_stale = false
order by source_type, source_id, language, updated_at desc;

-- E. Current source revisions, if Gemini or the review workspace has already
-- created any before legacy backfill.
select
  source_type,
  count(*) as source_revision_count,
  count(distinct source_id) as source_count
from public.translation_source_revisions
group by source_type
order by source_type;
