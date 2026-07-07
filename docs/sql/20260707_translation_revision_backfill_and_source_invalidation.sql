-- HAMZA AGENCY
-- F6-B3.1 — Corrected revision backfill + Arabic source stale lifecycle
--
-- Replaces the unexecuted F6-B3 draft before it is ever applied to Supabase.
-- Depends on all previously applied F6 migrations:
--   20260706_translation_revision_foundation.sql
--   20260706_translation_revision_access_and_publish.sql
--   20260706_translation_revision_access_hardening.sql
--
-- Apply manually in Supabase SQL Editor only after:
--   1) this correction PR is merged,
--   2) Production is Ready,
--   3) docs/sql/verification/20260707_f6_b3_preflight.sql has been run and reviewed.
--
-- This migration is transactional and idempotent.
-- It deliberately keeps public.content_translations untouched. The public reader
-- already prefers published Revisions and falls back to legacy published rows.
-- Therefore, no public legacy translation is hidden during backfill or future Arabic edits.

begin;

-- Mirrors JavaScript String.prototype.trim() for the exact whitespace code points
-- relevant to the current Node snapshot builder. Do not replace this with plain
-- btrim(value), because plain btrim does not cover the same Unicode whitespace set.
create or replace function public.translation_revision_js_trim(p_value text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select btrim(
    p_value,
    chr(9) || chr(10) || chr(11) || chr(12) || chr(13) ||
    chr(32) || chr(160) || chr(5760) ||
    chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) ||
    chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) ||
    chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) ||
    chr(12288) || chr(65279)
  );
$$;

-- Builds the canonical Arabic field snapshot used by the Node application for
-- every currently supported public translation source.
create or replace function public.translation_source_snapshot_from_row(
  p_source_type text,
  p_row jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  case p_source_type
    when 'programs' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'name'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'title'), '')),
        'summary', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'short_description'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'summary'), '')),
        'content', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'description'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'content'), '')),
        'requirements', nullif(public.translation_revision_js_trim(p_row ->> 'requirements'), ''),
        'benefits', nullif(public.translation_revision_js_trim(p_row ->> 'benefits'), ''),
        'updates', nullif(public.translation_revision_js_trim(p_row ->> 'updates'), ''),
        'faq', nullif(public.translation_revision_js_trim(p_row ->> 'faq'), '')
      ));
    when 'pages' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'seo_description'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'summary'), '')),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'content'), '')
      ));
    when 'sections' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'subtitle'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'content'), '')
      ));
    when 'faqs' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'question'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'title'), '')),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'category'), ''),
        'content', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'answer'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'content'), ''))
      ));
    when 'knowledge_base' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'summary'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'category'), '')),
        'content', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'content'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'answer'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'body'), ''))
      ));
    when 'partners' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'name'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'title'), '')),
        'summary', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'category'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'type'), '')),
        'content', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'description'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'summary'), ''))
      ));
    when 'jobs' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'short_description'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'description'), ''),
        'department', nullif(public.translation_revision_js_trim(p_row ->> 'department'), ''),
        'location', nullif(public.translation_revision_js_trim(p_row ->> 'location'), ''),
        'job_type', nullif(public.translation_revision_js_trim(p_row ->> 'job_type'), ''),
        'requirements', nullif(public.translation_revision_js_trim(p_row ->> 'requirements'), '')
      ));
    when 'reviews' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'reviewer_name'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'platform'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'content'), ''),
        'country', nullif(public.translation_revision_js_trim(p_row ->> 'country'), '')
      ));
    when 'success_stories' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'result_summary'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'story'), ''),
        'person_name', nullif(public.translation_revision_js_trim(p_row ->> 'person_name'), ''),
        'country', nullif(public.translation_revision_js_trim(p_row ->> 'country'), ''),
        'platform', nullif(public.translation_revision_js_trim(p_row ->> 'platform'), '')
      ));
    when 'gallery_items' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'category'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'description'), ''),
        'button_label', nullif(public.translation_revision_js_trim(p_row ->> 'button_label'), '')
      ));
    when 'announcements' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'content'), '')
      ));
    else
      return '{}'::jsonb;
  end case;
end;
$$;

-- Produces the exact compact JSON payload created by
-- lib/i18n/translationRevisionSource.ts before SHA-256:
-- {"sourceType":"...","sourceId":"...","sourceLocale":"ar","fields":[["field","value"]]}
create or replace function public.translation_source_revision_fingerprint_payload(
  p_source_type text,
  p_source_id text,
  p_source_snapshot jsonb
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    '{"sourceType":' || to_json(p_source_type)::text ||
    ',"sourceId":' || to_json(p_source_id)::text ||
    ',"sourceLocale":"ar","fields":[' ||
    coalesce((
      select string_agg(
        '[' || to_json(field.key)::text || ',' || to_json(field.value)::text || ']',
        ',' order by field.key
      )
      from jsonb_each_text(p_source_snapshot) as field(key, value)
    ), '') ||
    ']}';
$$;

create or replace function public.translation_source_revision_fingerprint(
  p_source_type text,
  p_source_id text,
  p_source_snapshot jsonb
)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select encode(
    digest(
      public.translation_source_revision_fingerprint_payload(
        p_source_type,
        p_source_id,
        p_source_snapshot
      ),
      'sha256'
    ),
    'hex'
  );
$$;

-- Centralizes the exact supported source set used by backfill and guards
-- against accidental divergence between separate CTE copies.
create or replace function public.translation_revision_backfill_source_rows()
returns table (
  source_type text,
  source_id text,
  source_snapshot jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  select *
  from (
    select 'programs'::text as source_type, id::text as source_id, public.translation_source_snapshot_from_row('programs', to_jsonb(programs)) as source_snapshot from public.programs
    union all select 'pages', id::text, public.translation_source_snapshot_from_row('pages', to_jsonb(pages)) from public.pages
    union all select 'sections', id::text, public.translation_source_snapshot_from_row('sections', to_jsonb(sections)) from public.sections
    union all select 'faqs', id::text, public.translation_source_snapshot_from_row('faqs', to_jsonb(faqs)) from public.faqs
    union all select 'knowledge_base', id::text, public.translation_source_snapshot_from_row('knowledge_base', to_jsonb(knowledge_base)) from public.knowledge_base
    union all select 'partners', id::text, public.translation_source_snapshot_from_row('partners', to_jsonb(partners)) from public.partners
    union all select 'jobs', id::text, public.translation_source_snapshot_from_row('jobs', to_jsonb(jobs)) from public.jobs
    union all select 'reviews', id::text, public.translation_source_snapshot_from_row('reviews', to_jsonb(reviews)) from public.reviews
    union all select 'success_stories', id::text, public.translation_source_snapshot_from_row('success_stories', to_jsonb(success_stories)) from public.success_stories
    union all select 'gallery_items', id::text, public.translation_source_snapshot_from_row('gallery_items', to_jsonb(gallery_items)) from public.gallery_items
    union all select 'announcements', id::text, public.translation_source_snapshot_from_row('announcements', to_jsonb(announcements)) from public.announcements
  ) as source_rows
  where source_snapshot <> '{}'::jsonb;
$$;

-- Fail closed if an existing Revision has the exact current source snapshot but
-- a different fingerprint. This protects any pre-existing F6-B2 candidates and
-- prevents silent duplicate source history.
do $$
begin
  if exists (
    select 1
    from public.translation_revision_backfill_source_rows() as source
    join public.translation_source_revisions as revision
      on revision.source_type = source.source_type
     and revision.source_id = source.source_id
     and revision.source_snapshot = source.source_snapshot
    where revision.source_fingerprint <> public.translation_source_revision_fingerprint(
      source.source_type,
      source.source_id,
      source.source_snapshot
    )
  ) then
    raise exception
      'F6-B3.1 aborted: an existing source revision has a fingerprint incompatible with the canonical Node-compatible payload. Do not continue until it is reviewed.';
  end if;
end;
$$;

-- Backfill Source Revisions only for source rows that have legacy EN/TR data.
with legacy_sources as (
  select distinct source_type, source_id
  from public.content_translations
  where source_type in ('programs', 'pages', 'sections', 'faqs', 'knowledge_base', 'partners', 'jobs', 'reviews', 'success_stories', 'gallery_items', 'announcements')
    and language in ('en', 'tr')
),
backfill_sources as (
  select
    source.source_type,
    source.source_id,
    source.source_snapshot,
    public.translation_source_revision_fingerprint(
      source.source_type,
      source.source_id,
      source.source_snapshot
    ) as source_fingerprint
  from public.translation_revision_backfill_source_rows() as source
  join legacy_sources as legacy
    on legacy.source_type = source.source_type
   and legacy.source_id = source.source_id
)
insert into public.translation_source_revisions (
  source_type,
  source_id,
  source_locale,
  source_fingerprint,
  source_snapshot
)
select
  source_type,
  source_id,
  'ar',
  source_fingerprint,
  source_snapshot
from backfill_sources
on conflict (source_type, source_id, source_fingerprint) do nothing;

-- Build normalized legacy language groups against the exact Source Revision
-- selected by the canonical fingerprint.
with source_revisions as (
  select
    source.source_type,
    source.source_id,
    source.source_snapshot,
    revision.id as source_revision_id
  from public.translation_revision_backfill_source_rows() as source
  join public.translation_source_revisions as revision
    on revision.source_type = source.source_type
   and revision.source_id = source.source_id
   and revision.source_fingerprint = public.translation_source_revision_fingerprint(
     source.source_type,
     source.source_id,
     source.source_snapshot
   )
   and revision.source_snapshot = source.source_snapshot
),
legacy_field_values as (
  select
    source.source_type,
    source.source_id,
    source.source_revision_id,
    source.source_snapshot,
    translation.language,
    translation.field_name,
    translation.translated_value,
    (translation.is_published = true and translation.status = 'published') as is_legacy_published
  from source_revisions as source
  join public.content_translations as translation
    on translation.source_type = source.source_type
   and translation.source_id = source.source_id
   and translation.language in ('en', 'tr')
   and source.source_snapshot ? translation.field_name
  where nullif(public.translation_revision_js_trim(coalesce(translation.translated_value, '')), '') is not null
),
legacy_groups as (
  select
    source_type,
    source_id,
    source_revision_id,
    source_snapshot,
    language,
    jsonb_object_agg(field_name, public.translation_revision_js_trim(translated_value)) as all_values,
    jsonb_object_agg(field_name, public.translation_revision_js_trim(translated_value))
      filter (where is_legacy_published) as published_values
  from legacy_field_values
  group by source_type, source_id, source_revision_id, source_snapshot, language
),
legacy_classification as (
  select
    legacy.*,
    not exists (
      select 1
      from jsonb_object_keys(legacy.source_snapshot) as expected(field_name)
      where coalesce(legacy.published_values ->> expected.field_name, '') = ''
    ) as has_complete_published_legacy
  from legacy_groups as legacy
),
inserted_published as (
  insert into public.content_translation_revisions (
    source_revision_id,
    source_type,
    source_id,
    language,
    workflow_status,
    published_at
  )
  select
    legacy.source_revision_id,
    legacy.source_type,
    legacy.source_id,
    legacy.language,
    'published',
    now()
  from legacy_classification as legacy
  where legacy.has_complete_published_legacy
    and not exists (
      select 1
      from public.content_translation_revisions as existing
      where existing.source_type = legacy.source_type
        and existing.source_id = legacy.source_id
        and existing.language = legacy.language
        and existing.workflow_status = 'published'
    )
  on conflict do nothing
  returning id, source_revision_id, source_type, source_id, language
)
insert into public.content_translation_revision_fields (
  translation_revision_id,
  field_name,
  source_value_snapshot,
  translated_value
)
select
  inserted.id,
  source_field.key,
  source_field.value,
  coalesce(legacy.published_values ->> source_field.key, '')
from inserted_published as inserted
join legacy_classification as legacy
  on legacy.source_revision_id = inserted.source_revision_id
 and legacy.source_type = inserted.source_type
 and legacy.source_id = inserted.source_id
 and legacy.language = inserted.language
join public.translation_source_revisions as source_revision
  on source_revision.id = inserted.source_revision_id
cross join jsonb_each_text(source_revision.source_snapshot) as source_field(key, value);

-- Backfill incomplete or non-published legacy data only when no active Candidate
-- already exists for that source/language. This never overwrites an existing
-- Draft, Needs Review, or Reviewed Revision.
with source_revisions as (
  select
    source.source_type,
    source.source_id,
    source.source_snapshot,
    revision.id as source_revision_id
  from public.translation_revision_backfill_source_rows() as source
  join public.translation_source_revisions as revision
    on revision.source_type = source.source_type
   and revision.source_id = source.source_id
   and revision.source_fingerprint = public.translation_source_revision_fingerprint(
     source.source_type,
     source.source_id,
     source.source_snapshot
   )
   and revision.source_snapshot = source.source_snapshot
),
legacy_field_values as (
  select
    source.source_type,
    source.source_id,
    source.source_revision_id,
    source.source_snapshot,
    translation.language,
    translation.field_name,
    translation.translated_value,
    (translation.is_published = true and translation.status = 'published') as is_legacy_published
  from source_revisions as source
  join public.content_translations as translation
    on translation.source_type = source.source_type
   and translation.source_id = source.source_id
   and translation.language in ('en', 'tr')
   and source.source_snapshot ? translation.field_name
  where nullif(public.translation_revision_js_trim(coalesce(translation.translated_value, '')), '') is not null
),
legacy_groups as (
  select
    source_type,
    source_id,
    source_revision_id,
    source_snapshot,
    language,
    jsonb_object_agg(field_name, public.translation_revision_js_trim(translated_value)) as all_values,
    jsonb_object_agg(field_name, public.translation_revision_js_trim(translated_value))
      filter (where is_legacy_published) as published_values
  from legacy_field_values
  group by source_type, source_id, source_revision_id, source_snapshot, language
),
candidate_input as (
  select
    legacy.*,
    not exists (
      select 1
      from jsonb_object_keys(legacy.source_snapshot) as expected(field_name)
      where coalesce(legacy.published_values ->> expected.field_name, '') = ''
    ) as has_complete_published_legacy,
    (
      select published.id
      from public.content_translation_revisions as published
      where published.source_type = legacy.source_type
        and published.source_id = legacy.source_id
        and published.language = legacy.language
        and published.workflow_status = 'published'
      order by published.published_at desc nulls last, published.created_at desc
      limit 1
    ) as supersedes_translation_revision_id
  from legacy_groups as legacy
),
inserted_candidates as (
  insert into public.content_translation_revisions (
    source_revision_id,
    source_type,
    source_id,
    language,
    workflow_status,
    supersedes_translation_revision_id
  )
  select
    candidate.source_revision_id,
    candidate.source_type,
    candidate.source_id,
    candidate.language,
    'needs_review',
    candidate.supersedes_translation_revision_id
  from candidate_input as candidate
  where not candidate.has_complete_published_legacy
    and not exists (
      select 1
      from public.content_translation_revisions as existing
      where existing.source_type = candidate.source_type
        and existing.source_id = candidate.source_id
        and existing.language = candidate.language
        and existing.workflow_status in ('draft', 'needs_review', 'reviewed')
        and existing.is_stale = false
    )
  on conflict do nothing
  returning id, source_revision_id, source_type, source_id, language
)
insert into public.content_translation_revision_fields (
  translation_revision_id,
  field_name,
  source_value_snapshot,
  translated_value
)
select
  inserted.id,
  source_field.key,
  source_field.value,
  coalesce(candidate.all_values ->> source_field.key, '')
from inserted_candidates as inserted
join candidate_input as candidate
  on candidate.source_revision_id = inserted.source_revision_id
 and candidate.source_type = inserted.source_type
 and candidate.source_id = inserted.source_id
 and candidate.language = inserted.language
join public.translation_source_revisions as source_revision
  on source_revision.id = inserted.source_revision_id
cross join jsonb_each_text(source_revision.source_snapshot) as source_field(key, value);

-- Replace the former legacy-unpublish behavior. Arabic edits mark Revision rows
-- stale while workflow_status='published' remains public. Legacy rows are never
-- changed here and continue to serve as a safe fallback.
create or replace function public.mark_translation_revisions_stale_on_source_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_snapshot jsonb := public.translation_source_snapshot_from_row(tg_argv[0], to_jsonb(old));
  v_new_snapshot jsonb := public.translation_source_snapshot_from_row(tg_argv[0], to_jsonb(new));
begin
  if v_old_snapshot is distinct from v_new_snapshot then
    update public.content_translation_revisions
       set is_stale = true,
           stale_at = now(),
           stale_reason = 'Arabic source content changed',
           updated_at = now()
     where source_type = tg_argv[0]
       and source_id = new.id::text
       and workflow_status in ('draft', 'needs_review', 'reviewed', 'published')
       and is_stale = false;
  end if;
  return new;
end;
$$;

-- Reuse the existing trigger names so no parallel legacy invalidation path remains.
drop trigger if exists invalidate_translations_after_program_change on public.programs;
create trigger invalidate_translations_after_program_change
after update on public.programs
for each row execute function public.mark_translation_revisions_stale_on_source_change('programs');

drop trigger if exists invalidate_translations_after_page_change on public.pages;
create trigger invalidate_translations_after_page_change
after update on public.pages
for each row execute function public.mark_translation_revisions_stale_on_source_change('pages');

drop trigger if exists invalidate_translations_after_section_change on public.sections;
create trigger invalidate_translations_after_section_change
after update on public.sections
for each row execute function public.mark_translation_revisions_stale_on_source_change('sections');

drop trigger if exists invalidate_translations_after_faq_change on public.faqs;
create trigger invalidate_translations_after_faq_change
after update on public.faqs
for each row execute function public.mark_translation_revisions_stale_on_source_change('faqs');

drop trigger if exists invalidate_translations_after_knowledge_change on public.knowledge_base;
create trigger invalidate_translations_after_knowledge_change
after update on public.knowledge_base
for each row execute function public.mark_translation_revisions_stale_on_source_change('knowledge_base');

drop trigger if exists invalidate_translations_after_partner_change on public.partners;
create trigger invalidate_translations_after_partner_change
after update on public.partners
for each row execute function public.mark_translation_revisions_stale_on_source_change('partners');

drop trigger if exists invalidate_translations_after_job_change on public.jobs;
create trigger invalidate_translations_after_job_change
after update on public.jobs
for each row execute function public.mark_translation_revisions_stale_on_source_change('jobs');

drop trigger if exists invalidate_translations_after_review_change on public.reviews;
create trigger invalidate_translations_after_review_change
after update on public.reviews
for each row execute function public.mark_translation_revisions_stale_on_source_change('reviews');

drop trigger if exists invalidate_translations_after_success_story_change on public.success_stories;
create trigger invalidate_translations_after_success_story_change
after update on public.success_stories
for each row execute function public.mark_translation_revisions_stale_on_source_change('success_stories');

drop trigger if exists invalidate_translations_after_gallery_item_change on public.gallery_items;
create trigger invalidate_translations_after_gallery_item_change
after update on public.gallery_items
for each row execute function public.mark_translation_revisions_stale_on_source_change('gallery_items');

drop trigger if exists invalidate_translations_after_announcement_change on public.announcements;
create trigger invalidate_translations_after_announcement_change
after update on public.announcements
for each row execute function public.mark_translation_revisions_stale_on_source_change('announcements');

commit;

-- Post-apply verification:
-- select workflow_status, is_stale, language, count(*)
-- from public.content_translation_revisions
-- group by workflow_status, is_stale, language
-- order by workflow_status, is_stale, language;
--
-- select tgname, tgrelid::regclass, pg_get_triggerdef(oid)
-- from pg_trigger
-- where tgname like 'invalidate_translations_after_%'
--   and not tgisinternal
-- order by tgname;
--
-- select source.source_type, source.source_id, revision.source_fingerprint,
--        public.translation_source_revision_fingerprint(source.source_type, source.source_id, source.source_snapshot) as expected_fingerprint
-- from public.translation_revision_backfill_source_rows() as source
-- join public.translation_source_revisions as revision
--   on revision.source_type = source.source_type
--  and revision.source_id = source.source_id
--  and revision.source_snapshot = source.source_snapshot
-- where revision.source_fingerprint <> public.translation_source_revision_fingerprint(
--   source.source_type,
--   source.source_id,
--   source.source_snapshot
-- )
-- order by source.source_type, source.source_id;
