-- HAMZA AGENCY
-- F6-B2.1 hardening — Candidate lifecycle integrity
--
-- Apply immediately after:
--   20260706_translation_revision_access_and_publish.sql
--
-- This hardening keeps the latest published revision public when Arabic source
-- content changes, marks it stale for administrators, retires older candidate
-- drafts from eligibility, and prevents duplicate source revisions.
--
-- It does not alter public.content_translations, current public readers, or the
-- existing Arabic-source trigger.

begin;

create unique index if not exists translation_source_revisions_source_fingerprint_idx
  on public.translation_source_revisions (
    source_type,
    source_id,
    source_fingerprint
  );

create or replace function public.create_translation_candidate_draft(
  p_source_type text,
  p_source_id text,
  p_language text,
  p_source_fingerprint text,
  p_source_snapshot jsonb,
  p_translated_fields jsonb default '{}'::jsonb
)
returns table (
  translation_revision_id uuid,
  created boolean,
  workflow_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_source_revision_id uuid;
  v_previous_source_revision_id uuid;
  v_existing_candidate_id uuid;
  v_existing_status text;
  v_candidate_id uuid;
  v_published_revision_id uuid;
  v_created_source_revision boolean := false;
  v_fields jsonb := coalesce(p_translated_fields, '{}'::jsonb);
begin
  perform public.require_translation_revision_admin();

  if not public.is_supported_translation_revision_source_type(p_source_type)
     or coalesce(btrim(p_source_id), '') = ''
     or p_language not in ('en', 'tr')
     or coalesce(btrim(p_source_fingerprint), '') = '' then
    raise exception 'Invalid source identity, language, or source fingerprint.'
      using errcode = '22023';
  end if;

  perform public.assert_translation_revision_snapshot(p_source_snapshot, v_fields);

  -- Source-level lock deliberately excludes the target language so concurrent
  -- EN/TR creation cannot create duplicate source revisions.
  perform pg_advisory_xact_lock(hashtext(p_source_type || ':' || p_source_id));

  select source_revision.id
    into v_source_revision_id
  from public.translation_source_revisions as source_revision
  where source_revision.source_type = p_source_type
    and source_revision.source_id = p_source_id
    and source_revision.source_fingerprint = p_source_fingerprint
  order by source_revision.created_at desc
  limit 1;

  if v_source_revision_id is null then
    select source_revision.id
      into v_previous_source_revision_id
    from public.translation_source_revisions as source_revision
    where source_revision.source_type = p_source_type
      and source_revision.source_id = p_source_id
    order by source_revision.created_at desc
    limit 1;

    insert into public.translation_source_revisions (
      source_type,
      source_id,
      source_locale,
      source_fingerprint,
      source_snapshot,
      previous_source_revision_id,
      created_by
    )
    values (
      p_source_type,
      p_source_id,
      'ar',
      p_source_fingerprint,
      p_source_snapshot,
      v_previous_source_revision_id,
      v_actor
    )
    returning id into v_source_revision_id;

    v_created_source_revision := true;
  end if;

  -- A newer Arabic snapshot never hides the old public translation. It only
  -- marks it stale for admin visibility and makes old candidates ineligible to
  -- review or publish. The public reader continues to see workflow_status=published.
  if v_created_source_revision then
    update public.content_translation_revisions
       set is_stale = true,
           stale_at = now(),
           stale_reason = 'Arabic source content changed',
           updated_at = now()
     where source_type = p_source_type
       and source_id = p_source_id
       and source_revision_id <> v_source_revision_id
       and workflow_status in ('draft', 'needs_review', 'reviewed', 'published')
       and is_stale = false;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_source_type || ':' || p_source_id || ':' || p_language));

  select revision.id, revision.workflow_status
    into v_existing_candidate_id, v_existing_status
  from public.content_translation_revisions as revision
  where revision.source_revision_id = v_source_revision_id
    and revision.language = p_language
    and revision.workflow_status in ('draft', 'needs_review', 'reviewed')
    and revision.is_stale = false
  order by revision.created_at desc
  limit 1
  for update;

  if v_existing_candidate_id is not null then
    return query
      select v_existing_candidate_id, false, v_existing_status;
    return;
  end if;

  select revision.id
    into v_published_revision_id
  from public.content_translation_revisions as revision
  where revision.source_type = p_source_type
    and revision.source_id = p_source_id
    and revision.language = p_language
    and revision.workflow_status = 'published'
  order by revision.published_at desc nulls last, revision.created_at desc
  limit 1;

  insert into public.content_translation_revisions (
    source_revision_id,
    source_type,
    source_id,
    language,
    workflow_status,
    supersedes_translation_revision_id,
    created_by
  )
  values (
    v_source_revision_id,
    p_source_type,
    p_source_id,
    p_language,
    'needs_review',
    v_published_revision_id,
    v_actor
  )
  returning id into v_candidate_id;

  insert into public.content_translation_revision_fields (
    translation_revision_id,
    field_name,
    source_value_snapshot,
    translated_value,
    created_by,
    updated_by
  )
  select
    v_candidate_id,
    field.key,
    field.value,
    coalesce(v_fields ->> field.key, ''),
    v_actor,
    v_actor
  from jsonb_each_text(p_source_snapshot) as field(key, value);

  return query
    select v_candidate_id, true, 'needs_review'::text;
end;
$$;

comment on function public.create_translation_candidate_draft(text, text, text, text, jsonb, jsonb) is
  'Creates a protected candidate revision; preserves the published revision, marks it stale after Arabic changes, and prevents duplicate source revisions.';

commit;
