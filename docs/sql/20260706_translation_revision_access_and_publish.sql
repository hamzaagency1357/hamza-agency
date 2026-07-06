-- HAMZA AGENCY
-- F6-B2.1 — Translation revision access and atomic publish operations
--
-- Depends on:
--   docs/sql/20260706_translation_revision_foundation.sql
--
-- This migration does NOT modify public.content_translations, current public
-- readers, existing published translations, or the current Arabic-source trigger.
-- It adds the protected access contract needed by the revision-aware code in F6-B2.2.
--
-- Run manually in Supabase SQL Editor only after the related PR is merged and
-- Production is Ready.

begin;

-- Serialize candidate creation for the same source and language. This prevents
-- concurrent admin sessions from creating duplicate active drafts for one exact
-- Arabic source revision.
create unique index if not exists content_translation_revisions_one_active_candidate_idx
  on public.content_translation_revisions (
    source_revision_id,
    language
  )
  where workflow_status in ('draft', 'needs_review', 'reviewed')
    and is_stale = false;

-- Direct browser reads are limited to active top-level translation admins.
-- All writes remain RPC-only; no INSERT, UPDATE, or DELETE table grants are made.
revoke all on table public.translation_source_revisions from anon, authenticated;
revoke all on table public.content_translation_revisions from anon, authenticated;
revoke all on table public.content_translation_revision_fields from anon, authenticated;

grant select on table public.translation_source_revisions to authenticated;
grant select on table public.content_translation_revisions to authenticated;
grant select on table public.content_translation_revision_fields to authenticated;

create or replace function public.is_translation_revision_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users as admin
    where lower(admin.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(admin.is_active, true) = true
      and admin.role in ('super_admin', 'deputy_super_admin')
  );
$$;

create or replace function public.require_translation_revision_admin()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_translation_revision_admin() then
    raise exception 'Translation revision access requires an active top-level administrator.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.is_supported_translation_revision_source_type(p_source_type text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select p_source_type = any (array[
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
  ]::text[]);
$$;

create or replace function public.is_supported_translation_revision_field_name(p_field_name text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select p_field_name = any (array[
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
  ]::text[]);
$$;

create or replace function public.assert_translation_revision_snapshot(
  p_source_snapshot jsonb,
  p_translated_fields jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_source_snapshot) <> 'object'
     or not exists (select 1 from jsonb_object_keys(p_source_snapshot)) then
    raise exception 'Arabic source snapshot must be a non-empty JSON object.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_translated_fields, '{}'::jsonb)) <> 'object' then
    raise exception 'Translated fields must be a JSON object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_each(p_source_snapshot) as field(key, value)
    where not public.is_supported_translation_revision_field_name(field.key)
      or jsonb_typeof(field.value) <> 'string'
      or btrim(field.value #>> '{}') = ''
  ) then
    raise exception 'Arabic source snapshot includes an unsupported or empty field.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_each(coalesce(p_translated_fields, '{}'::jsonb)) as field(key, value)
    where not (p_source_snapshot ? field.key)
      or jsonb_typeof(field.value) <> 'string'
  ) then
    raise exception 'Translated fields must be string values for fields present in the Arabic source snapshot.'
      using errcode = '22023';
  end if;
end;
$$;

-- Allow direct reads for the top-level administrators only. Public visitors
-- cannot read source snapshots, drafts, review notes, or revision metadata.
drop policy if exists "Translation revision admins read source revisions" on public.translation_source_revisions;
create policy "Translation revision admins read source revisions"
on public.translation_source_revisions
for select
to authenticated
using (public.is_translation_revision_admin());

drop policy if exists "Translation revision admins read language revisions" on public.content_translation_revisions;
create policy "Translation revision admins read language revisions"
on public.content_translation_revisions
for select
to authenticated
using (public.is_translation_revision_admin());

drop policy if exists "Translation revision admins read revision fields" on public.content_translation_revision_fields;
create policy "Translation revision admins read revision fields"
on public.content_translation_revision_fields
for select
to authenticated
using (public.is_translation_revision_admin());

-- Creates exactly one candidate for an Arabic source revision and language.
-- If an active candidate already exists, it is returned untouched; this avoids
-- overwriting an existing draft created by a previous admin or Gemini run.
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
  perform pg_advisory_xact_lock(hashtext(p_source_type || ':' || p_source_id || ':' || p_language));

  select source_revision.id
    into v_source_revision_id
  from public.translation_source_revisions as source_revision
  where source_revision.source_type = p_source_type
    and source_revision.source_id = p_source_id
    and source_revision.source_fingerprint = p_source_fingerprint
    and source_revision.source_snapshot = p_source_snapshot
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
  end if;

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

  insert into public.content_translation_revisions (
    source_revision_id,
    source_type,
    source_id,
    language,
    workflow_status,
    created_by
  )
  values (
    v_source_revision_id,
    p_source_type,
    p_source_id,
    p_language,
    'needs_review',
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

-- Saves only fields explicitly provided by the reviewer. Any change clears a
-- previous review state but can never overwrite a published revision.
create or replace function public.save_translation_candidate_fields(
  p_translation_revision_id uuid,
  p_translated_fields jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_source_revision_id uuid;
  v_workflow_status text;
  v_is_stale boolean;
  v_snapshot jsonb;
  v_fields jsonb := coalesce(p_translated_fields, '{}'::jsonb);
begin
  perform public.require_translation_revision_admin();

  if jsonb_typeof(v_fields) <> 'object'
     or not exists (select 1 from jsonb_object_keys(v_fields)) then
    raise exception 'Provide at least one translated field to save.'
      using errcode = '22023';
  end if;

  select revision.source_revision_id, revision.workflow_status, revision.is_stale
    into v_source_revision_id, v_workflow_status, v_is_stale
  from public.content_translation_revisions as revision
  where revision.id = p_translation_revision_id
  for update;

  if v_source_revision_id is null then
    raise exception 'Translation candidate was not found.' using errcode = 'P0002';
  end if;

  if v_workflow_status not in ('draft', 'needs_review', 'reviewed') or v_is_stale then
    raise exception 'Only a current non-stale candidate draft can be edited.'
      using errcode = '22023';
  end if;

  select source_revision.source_snapshot
    into v_snapshot
  from public.translation_source_revisions as source_revision
  where source_revision.id = v_source_revision_id;

  perform public.assert_translation_revision_snapshot(v_snapshot, v_fields);

  insert into public.content_translation_revision_fields (
    translation_revision_id,
    field_name,
    source_value_snapshot,
    translated_value,
    created_by,
    updated_by
  )
  select
    p_translation_revision_id,
    field.key,
    snapshot.value,
    field.value,
    v_actor,
    v_actor
  from jsonb_each_text(v_fields) as field(key, value)
  join jsonb_each_text(v_snapshot) as snapshot(key, value)
    on snapshot.key = field.key
  on conflict (translation_revision_id, field_name)
  do update set
    translated_value = excluded.translated_value,
    updated_by = excluded.updated_by,
    updated_at = now();

  update public.content_translation_revisions
     set workflow_status = 'needs_review',
         reviewed_at = null,
         reviewed_by = null,
         review_notes = null,
         updated_at = now()
   where id = p_translation_revision_id;

  return p_translation_revision_id;
end;
$$;

-- Moves a complete, current candidate into reviewed status. It does not publish.
create or replace function public.review_translation_candidate(
  p_translation_revision_id uuid,
  p_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_source_revision_id uuid;
  v_workflow_status text;
  v_is_stale boolean;
  v_snapshot jsonb;
begin
  perform public.require_translation_revision_admin();

  select revision.source_revision_id, revision.workflow_status, revision.is_stale
    into v_source_revision_id, v_workflow_status, v_is_stale
  from public.content_translation_revisions as revision
  where revision.id = p_translation_revision_id
  for update;

  if v_source_revision_id is null then
    raise exception 'Translation candidate was not found.' using errcode = 'P0002';
  end if;

  if v_workflow_status not in ('draft', 'needs_review', 'reviewed') or v_is_stale then
    raise exception 'Only a complete current candidate can be reviewed.'
      using errcode = '22023';
  end if;

  select source_revision.source_snapshot
    into v_snapshot
  from public.translation_source_revisions as source_revision
  where source_revision.id = v_source_revision_id;

  if exists (
    select 1
    from jsonb_object_keys(v_snapshot) as expected(field_name)
    left join public.content_translation_revision_fields as field
      on field.translation_revision_id = p_translation_revision_id
     and field.field_name = expected.field_name
    where field.id is null
       or btrim(field.translated_value) = ''
  ) then
    raise exception 'Every field from the Arabic source snapshot must have a non-empty translation before review.'
      using errcode = '22023';
  end if;

  update public.content_translation_revisions
     set workflow_status = 'reviewed',
         reviewed_at = now(),
         reviewed_by = v_actor,
         review_notes = nullif(btrim(coalesce(p_review_notes, '')), ''),
         updated_at = now()
   where id = p_translation_revision_id;

  return p_translation_revision_id;
end;
$$;

-- Atomically replaces the public revision only after manual review. The prior
-- published revision is retained as superseded; no public fallback to Arabic
-- occurs during this switch.
create or replace function public.publish_translation_candidate(
  p_translation_revision_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_source_revision_id uuid;
  v_source_type text;
  v_source_id text;
  v_language text;
  v_workflow_status text;
  v_is_stale boolean;
  v_snapshot jsonb;
begin
  perform public.require_translation_revision_admin();

  select
    revision.source_revision_id,
    revision.source_type,
    revision.source_id,
    revision.language,
    revision.workflow_status,
    revision.is_stale
  into
    v_source_revision_id,
    v_source_type,
    v_source_id,
    v_language,
    v_workflow_status,
    v_is_stale
  from public.content_translation_revisions as revision
  where revision.id = p_translation_revision_id
  for update;

  if v_source_revision_id is null then
    raise exception 'Translation candidate was not found.' using errcode = 'P0002';
  end if;

  if v_workflow_status <> 'reviewed' or v_is_stale then
    raise exception 'Only a reviewed, current candidate can be published.'
      using errcode = '22023';
  end if;

  select source_revision.source_snapshot
    into v_snapshot
  from public.translation_source_revisions as source_revision
  where source_revision.id = v_source_revision_id;

  if exists (
    select 1
    from jsonb_object_keys(v_snapshot) as expected(field_name)
    left join public.content_translation_revision_fields as field
      on field.translation_revision_id = p_translation_revision_id
     and field.field_name = expected.field_name
    where field.id is null
       or btrim(field.translated_value) = ''
  ) then
    raise exception 'Every field from the Arabic source snapshot must have a non-empty translation before publish.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_source_type || ':' || v_source_id || ':' || v_language));

  update public.content_translation_revisions
     set workflow_status = 'superseded',
         superseded_at = now(),
         updated_at = now()
   where source_type = v_source_type
     and source_id = v_source_id
     and language = v_language
     and workflow_status = 'published'
     and id <> p_translation_revision_id;

  update public.content_translation_revisions
     set workflow_status = 'published',
         published_at = now(),
         published_by = v_actor,
         updated_at = now()
   where id = p_translation_revision_id;

  return p_translation_revision_id;
end;
$$;

-- This is the only public read surface for the new revision layer. It returns
-- published field values only and intentionally keeps Arabic source snapshots,
-- draft text, review notes, and admin metadata private.
create or replace function public.read_published_translation_revision_fields(
  p_source_type text,
  p_source_ids text[],
  p_language text
)
returns table (
  source_id text,
  field_name text,
  translated_value text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    revision.source_id,
    field.field_name,
    field.translated_value
  from public.content_translation_revisions as revision
  join public.content_translation_revision_fields as field
    on field.translation_revision_id = revision.id
  where revision.workflow_status = 'published'
    and revision.source_type = p_source_type
    and revision.language = p_language
    and revision.source_id = any (coalesce(p_source_ids, '{}'::text[]))
  order by revision.source_id, field.field_name;
$$;

revoke all on function public.is_translation_revision_admin() from public;
revoke all on function public.require_translation_revision_admin() from public;
revoke all on function public.is_supported_translation_revision_source_type(text) from public;
revoke all on function public.is_supported_translation_revision_field_name(text) from public;
revoke all on function public.assert_translation_revision_snapshot(jsonb, jsonb) from public;
revoke all on function public.create_translation_candidate_draft(text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.save_translation_candidate_fields(uuid, jsonb) from public;
revoke all on function public.review_translation_candidate(uuid, text) from public;
revoke all on function public.publish_translation_candidate(uuid) from public;
revoke all on function public.read_published_translation_revision_fields(text, text[], text) from public;

grant execute on function public.is_translation_revision_admin() to authenticated;
grant execute on function public.require_translation_revision_admin() to authenticated;
grant execute on function public.create_translation_candidate_draft(text, text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.save_translation_candidate_fields(uuid, jsonb) to authenticated;
grant execute on function public.review_translation_candidate(uuid, text) to authenticated;
grant execute on function public.publish_translation_candidate(uuid) to authenticated;
grant execute on function public.read_published_translation_revision_fields(text, text[], text) to anon, authenticated;

comment on function public.create_translation_candidate_draft(text, text, text, text, jsonb, jsonb) is
  'Creates a protected candidate revision without overwriting an existing active draft.';

comment on function public.publish_translation_candidate(uuid) is
  'Atomically supersedes the former published revision and publishes a manually reviewed candidate.';

comment on function public.read_published_translation_revision_fields(text, text[], text) is
  'Public read surface for published revision fields only.';

commit;
