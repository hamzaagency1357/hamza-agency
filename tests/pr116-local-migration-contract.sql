\set ON_ERROR_STOP on

-- The macro-runtime harness is built from an authoritative snapshot, so apply the
-- final prepared OIDC boundary before asserting the current PR116 contract.
\ir ../supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql

do $pr116_local_contract$
declare
  v_gateway oid;
  v_submit oid;
  v_moderate oid;
  v_boundary_fn oid;
  v_rpc record;
  v_actor oid;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='programs'
      and column_name='media_display_mode' and is_nullable='NO'
      and column_default like '%logo%'
  ) then raise exception 'pr116_media_display_mode_contract_missing'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='programs'
      and column_name='detail_layout' and is_nullable='NO'
      and column_default like '%1%'
  ) then raise exception 'pr116_detail_layout_contract_missing'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='programs' and column_name='hero_image_url'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='programs' and column_name='mobile_image_url'
  ) then raise exception 'pr116_cover_columns_missing'; end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='reviews'
      and column_name in ('reviewer_name','content') and is_nullable='NO'
  ) then raise exception 'pr116_public_review_optional_fields_still_not_null'; end if;

  if exists (
    select 1
    from (values
      ('programs_media_display_mode_check'),
      ('programs_detail_layout_check'),
      ('reviews_rating_range_check'),
      ('reviews_published_useful_content_check'),
      ('review_submissions_rating_check'),
      ('review_submissions_status_check'),
      ('review_submissions_extra_fields_check'),
      ('public_submission_guards_form_type_check'),
      ('pr100_gateway_nonces_action_check')
    ) expected(name)
    where not exists (
      select 1 from pg_constraint c
      where c.conname=expected.name and c.convalidated=true
    )
  ) then raise exception 'pr116_validated_constraint_missing'; end if;

  if position('review_submit' in pg_get_constraintdef((
    select oid from pg_constraint where conname='pr100_gateway_nonces_action_check' limit 1
  ))) = 0 then raise exception 'pr116_gateway_action_constraint_missing_review_submit'; end if;

  if not exists (
    select 1 from pg_class
    where oid='public.review_submissions'::regclass and relrowsecurity=true
  ) then raise exception 'pr116_review_submissions_rls_not_enabled'; end if;

  if has_table_privilege('anon','public.review_submissions','SELECT')
     or has_table_privilege('anon','public.review_submissions','INSERT')
     or has_table_privilege('anon','public.review_submissions','UPDATE')
     or has_table_privilege('anon','public.review_submissions','DELETE') then
    raise exception 'pr116_review_submissions_anon_access_exposed';
  end if;

  if has_table_privilege('authenticated','public.review_submissions','INSERT')
     or has_table_privilege('authenticated','public.review_submissions','UPDATE')
     or has_table_privilege('authenticated','public.review_submissions','DELETE') then
    raise exception 'pr116_review_submissions_authenticated_write_exposed';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='review_submissions'
      and cmd='SELECT' and roles @> array['authenticated']::name[]
  ) then raise exception 'pr116_review_admin_read_policy_missing'; end if;

  v_submit:=to_regprocedure('public.pr99_submit_review(jsonb,text,timestamp with time zone,text)');
  v_moderate:=to_regprocedure('public.pr116_moderate_review_submission(uuid,text)');
  v_gateway:=to_regprocedure('public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)');
  v_actor:=to_regprocedure('public.pr116_apply_trusted_admin_actor_context()');
  if v_submit is null or v_moderate is null or v_gateway is null or v_actor is null then
    raise exception 'pr116_required_function_missing';
  end if;

  if not has_function_privilege('service_role',v_submit,'EXECUTE')
     or has_function_privilege('anon',v_submit,'EXECUTE')
     or has_function_privilege('authenticated',v_submit,'EXECUTE') then
    raise exception 'pr116_submit_review_execute_contract_invalid';
  end if;

  if not has_function_privilege('service_role',v_moderate,'EXECUTE')
     or has_function_privilege('anon',v_moderate,'EXECUTE')
     or has_function_privilege('authenticated',v_moderate,'EXECUTE') then
    raise exception 'pr116_moderation_execute_contract_invalid';
  end if;

  if not has_function_privilege('service_role',v_gateway,'EXECUTE')
     or has_function_privilege('anon',v_gateway,'EXECUTE')
     or has_function_privilege('authenticated',v_gateway,'EXECUTE') then
    raise exception 'pr116_gateway_execute_contract_invalid';
  end if;

  if not has_function_privilege('anon',v_actor,'EXECUTE')
     or not has_function_privilege('authenticated',v_actor,'EXECUTE')
     or not has_function_privilege('service_role',v_actor,'EXECUTE') then
    raise exception 'pr116_actor_context_execute_contract_invalid';
  end if;

  if not exists (
    select 1
    from pg_db_role_setting s
    join pg_roles r on r.oid=s.setrole
    cross join lateral unnest(s.setconfig) cfg
    where r.rolname='authenticator'
      and cfg='pgrst.db_pre_request=public.pr116_apply_trusted_admin_actor_context'
  ) then raise exception 'pr116_postgrest_pre_request_missing'; end if;

  for v_rpc in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname = any(array[
      'pr3_publish_blog_post','pr3_save_blog_post','pr3_unpublish_blog_post',
      'pr4_notification_action','pr4_promote_suggestion','pr4_save_knowledge','pr4_support_action',
      'pr99_backup_dry_run','pr99_create_private_backup','pr99_mark_notifications_read',
      'pr99_permanent_delete_trash','pr99_restore_backup','pr99_restore_trash','pr99_unpublish_page',
      'pr116_moderate_review_submission','publish_page_builder_page','publish_translation_candidate',
      'refresh_product_kpis','review_translation_candidate','save_page_builder_draft','save_translation_candidate_fields'
    ])
  loop
    if has_function_privilege('anon',v_rpc.oid,'EXECUTE')
       or has_function_privilege('authenticated',v_rpc.oid,'EXECUTE')
       or not has_function_privilege('service_role',v_rpc.oid,'EXECUTE') then
      raise exception 'pr116_oidc_rpc_execute_contract_invalid: %', v_rpc.signature;
    end if;
  end loop;

  if position('review_submit' in pg_get_functiondef(v_gateway))=0 then
    raise exception 'pr116_gateway_dispatch_missing_review_submit';
  end if;
  if position('preview_write_denied' in pg_get_functiondef(v_gateway))=0 then
    raise exception 'pr116_gateway_preview_write_guard_missing';
  end if;

  foreach v_boundary_fn in array array[
    to_regprocedure('public.pr99_submit_application(jsonb,text,timestamp with time zone,text)')::oid,
    to_regprocedure('public.pr99_submit_service_request(jsonb,text,timestamp with time zone,text)')::oid,
    to_regprocedure('public.pr99_submit_contact(jsonb,text,timestamp with time zone,text)')::oid,
    to_regprocedure('public.pr99_submit_ai_support(jsonb,text,timestamp with time zone,text)')::oid,
    to_regprocedure('public.pr99_submit_job_application(jsonb,text,timestamp with time zone,text)')::oid,
    to_regprocedure('public.pr99_guard_submission(text,text,jsonb,timestamp with time zone,text)')::oid,
    to_regprocedure('public.pr100_guard_ai_answer(text,jsonb)')::oid,
    to_regprocedure('public.pr100_guard_password_reset(text,jsonb,timestamp with time zone,text)')::oid,
    to_regprocedure('public.lookup_public_agency_application(text,text)')::oid,
    to_regprocedure('public.lookup_public_service_request(text)')::oid
  ] loop
    if v_boundary_fn is null then raise exception 'pr116_security_boundary_function_missing'; end if;
    if has_function_privilege('anon',v_boundary_fn,'EXECUTE')
       or has_function_privilege('authenticated',v_boundary_fn,'EXECUTE') then
      raise exception 'pr116_security_boundary_execute_exposed: %', v_boundary_fn::regprocedure;
    end if;
    if not has_function_privilege('service_role',v_boundary_fn,'EXECUTE') then
      raise exception 'pr116_security_boundary_service_role_missing: %', v_boundary_fn::regprocedure;
    end if;
  end loop;

  if position('phone' in lower(pg_get_functiondef(v_moderate)))>0
     or position('reference_number' in lower(pg_get_functiondef(v_moderate)))>0
     or position('contact_method' in lower(pg_get_functiondef(v_moderate)))>0
     or position('extra_fields' in lower(pg_get_functiondef(v_moderate)))>0 then
    raise exception 'pr116_moderation_function_mentions_private_publish_fields';
  end if;
end
$pr116_local_contract$;

select 'PR116 local-isolated migration contract: PASS' as result;
