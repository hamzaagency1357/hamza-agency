-- Run after the exact gateway bridge and PR160 migration on an isolated DB.
begin;

insert into auth.users (id, email) values
  ('16000000-0000-4000-8000-000000000001', 'pr160-owner@example.test'),
  ('16000000-0000-4000-8000-000000000002', 'pr160-program@example.test'),
  ('16000000-0000-4000-8000-000000000003', 'pr160-deputy@example.test'),
  ('16000000-0000-4000-8000-000000000004', 'pr160-ordinary@example.test');

insert into public.admin_users (user_id, email, role, is_active, assigned_program) values
  ('16000000-0000-4000-8000-000000000001', 'pr160-owner@example.test', 'super_admin', true, null),
  ('16000000-0000-4000-8000-000000000002', 'pr160-program@example.test', 'program_admin', true, 'tiktok'),
  ('16000000-0000-4000-8000-000000000003', 'pr160-deputy@example.test', 'deputy_super_admin', true, null);

insert into public.translation_source_revisions (id, source_type, source_id, source_fingerprint, source_snapshot)
values ('16000000-0000-4000-8000-000000000010', 'programs', 'pr160-isolated', 'pr160-source', '{"title":"عنوان"}');
insert into public.content_translation_revisions (
  id, source_revision_id, source_type, source_id, language, workflow_status, published_at
) values (
  '16000000-0000-4000-8000-000000000011', '16000000-0000-4000-8000-000000000010',
  'programs', 'pr160-isolated', 'tr', 'published', now()
);
insert into public.content_translation_revision_fields (
  translation_revision_id, field_name, source_value_snapshot, translated_value
) values ('16000000-0000-4000-8000-000000000011', 'title', 'عنوان', 'Eski başlık');

do $acl$
declare signature regprocedure;
begin
  foreach signature in array array[
    'public.pr99_soft_delete(text,text,text)'::regprocedure,
    'public.pr3_blog_snapshot(bigint)'::regprocedure,
    'public.pr3_create_blog_version(bigint,text)'::regprocedure,
    'public.pr99_create_page_version(bigint,text,text,text)'::regprocedure
  ] loop
    if has_function_privilege('authenticated', signature, 'EXECUTE')
       or has_function_privilege('anon', signature, 'EXECUTE') then
      raise exception 'Legacy or internal RPC is still exposed: %', signature;
    end if;
  end loop;
  if has_function_privilege('anon', 'public.create_translation_candidate_draft(text,text,text,text,jsonb,jsonb)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.create_translation_candidate_draft(text,text,text,text,jsonb,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.publish_translation_candidate(uuid)', 'EXECUTE') then
    raise exception 'Translation RPC roles changed unexpectedly';
  end if;
end
$acl$;

set local role authenticated;
do $denied$
declare
  claims jsonb;
begin
  for claims in select value from jsonb_array_elements('[
    {"role":"authenticated","sub":"16000000-0000-4000-8000-000000000004","email":"pr160-owner@example.test"},
    {"role":"authenticated","sub":"16000000-0000-4000-8000-000000000002","email":"pr160-program@example.test"},
    {"role":"authenticated","sub":"16000000-0000-4000-8000-000000000003","email":"pr160-deputy@example.test"}
  ]'::jsonb) loop
    perform set_config('request.jwt.claims', claims::text, true);
    perform set_config('request.jwt.claim.sub', claims ->> 'sub', true);
    begin
      perform public.create_translation_candidate_draft('programs', 'pr160-isolated', 'tr', 'pr160-source', '{"title":"عنوان"}', '{"title":"Başlık"}');
      raise exception 'Unauthorized draft creation succeeded';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.restore_page_version(0);
      raise exception 'Unauthorized page restore reached the version lookup';
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform set_config('request.path', '/rpc/save_translation_candidate_fields', true);
  perform set_config('request.headers', '{"x-pr116-admin-user-id":"16000000-0000-4000-8000-000000000001"}', true);
  begin
    perform public.pr116_apply_trusted_admin_actor_context();
    raise exception 'Browser-supplied actor identity was accepted';
  exception when insufficient_privilege then null;
  end;
end
$denied$;

do $create$
declare draft uuid;
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"16000000-0000-4000-8000-000000000001","email":"pr160-owner@example.test"}', true);
  perform set_config('request.jwt.claim.sub', '16000000-0000-4000-8000-000000000001', true);
  perform set_config('request.path', '/rpc/create_translation_candidate_draft', true);
  perform set_config('request.headers', '{}', true);
  perform public.pr116_apply_trusted_admin_actor_context();
  select translation_revision_id into draft
  from public.create_translation_candidate_draft('programs', 'pr160-isolated', 'tr', 'pr160-source', '{"title":"عنوان"}', '{"title":"Taslak"}')
  where created and workflow_status = 'needs_review';
  if draft is null then raise exception 'Verified user could not create a draft'; end if;
  perform set_config('pr160.test_draft', draft::text, true);
end
$create$;

reset role;
set local role service_role;
do $workflow$
declare
  draft uuid := current_setting('pr160.test_draft')::uuid;
  rpc text;
begin
  foreach rpc in array array['save_translation_candidate_fields', 'review_translation_candidate', 'publish_translation_candidate'] loop
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.path', '/rest/v1/rpc/' || rpc, true);
    perform set_config('request.headers', '{"x-pr116-admin-user-id":"16000000-0000-4000-8000-000000000001","x-pr116-admin-email":"pr160-owner@example.test"}', true);
    perform public.pr116_apply_trusted_admin_actor_context();
    if rpc = 'save_translation_candidate_fields' then
      perform public.save_translation_candidate_fields(draft, '{"title":"Yeni başlık"}');
    elsif rpc = 'review_translation_candidate' then
      perform public.review_translation_candidate(draft, 'Isolated release test');
    else
      perform public.publish_translation_candidate(draft);
    end if;
  end loop;
end
$workflow$;

reset role;
do $evidence$
declare
  draft uuid := current_setting('pr160.test_draft')::uuid;
  actor uuid := '16000000-0000-4000-8000-000000000001';
  previous uuid := '16000000-0000-4000-8000-000000000011';
begin
  if not exists (
    select 1 from public.content_translation_revisions
    where id = draft and workflow_status = 'published'
      and created_by = actor and reviewed_by = actor and published_by = actor
      and supersedes_translation_revision_id = previous
  ) or not exists (
    select 1 from public.content_translation_revisions where id = previous and workflow_status = 'superseded'
  ) or not exists (
    select 1 from public.content_translation_revision_fields
    where translation_revision_id = previous and field_name = 'title' and translated_value = 'Eski başlık'
  ) or not exists (
    select 1 from public.content_translation_revision_fields
    where translation_revision_id = draft and field_name = 'title' and translated_value = 'Yeni başlık'
  ) then
    raise exception 'Translation audit identity, version history, or final value is wrong';
  end if;
end
$evidence$;

rollback;
select 'PR160 isolated translation lifecycle and admin authorization: PASS' as result;
