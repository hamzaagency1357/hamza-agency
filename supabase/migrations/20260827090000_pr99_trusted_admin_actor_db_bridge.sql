-- HAMZA AGENCY — trusted Admin actor database bridge hotfix.
-- Narrow forward-only function-definition change. No table/data mutation and no ACL widening.

create or replace function public.pr116_apply_trusted_admin_actor_context()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $pr116_actor$
declare
  v_claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_request_role text := coalesce(
    nullif(v_claims ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  v_path text := split_part(coalesce(current_setting('request.path', true), ''), '?', 1);
  v_rpc_name text := case
    when v_path like '/rpc/%' then substr(v_path, 6)
    when v_path like '/rest/v1/rpc/%' then substr(v_path, 14)
    else ''
  end;
  v_user_id_text text := nullif(trim(v_headers ->> 'x-pr116-admin-user-id'), '');
  v_email text := lower(nullif(trim(v_headers ->> 'x-pr116-admin-email'), ''));
  v_user_id uuid;
  v_admin public.admin_users%rowtype;
  v_trusted_rpc boolean := v_rpc_name = any(array[
    'pr3_publish_blog_post','pr3_save_blog_post','pr3_unpublish_blog_post',
    'pr4_notification_action','pr4_promote_suggestion','pr4_save_knowledge','pr4_support_action',
    'pr99_backup_dry_run','pr99_create_private_backup','pr99_mark_notifications_read',
    'pr99_permanent_delete_trash','pr99_restore_backup','pr99_restore_trash','pr99_unpublish_page',
    'pr116_moderate_review_submission','publish_page_builder_page','publish_translation_candidate',
    'refresh_product_kpis','review_translation_candidate','save_page_builder_draft','save_translation_candidate_fields'
  ]);
begin
  -- Browser/ordinary JWT roles can never turn the forwarded headers into authority.
  if v_request_role <> 'service_role' then
    if v_user_id_text is not null or v_email is not null then
      raise exception 'pr116_untrusted_actor_headers' using errcode = '42501';
    end if;
    return;
  end if;

  -- Forwarded actor headers are valid only for the existing gateway-owned RPC allowlist.
  if not v_trusted_rpc then
    if v_user_id_text is not null or v_email is not null then
      raise exception 'pr116_actor_context_rpc_not_allowed' using errcode = '42501';
    end if;
    return;
  end if;

  -- Gateway-owned RPCs always require a forwarded user id. Email is optional corroboration only.
  if v_user_id_text is null then
    raise exception 'pr116_missing_actor_user_id' using errcode = '42501';
  end if;

  begin
    v_user_id := v_user_id_text::uuid;
  exception when invalid_text_representation then
    raise exception 'pr116_invalid_actor_user_id' using errcode = '42501';
  end;

  select * into v_admin
  from public.admin_users
  where user_id = v_user_id
    and is_active is true
    and role in ('super_admin', 'deputy_super_admin', 'program_admin')
  limit 1;

  if not found then
    raise exception 'pr116_unverified_actor_user_id' using errcode = '42501';
  end if;

  if v_email is not null and v_email <> lower(v_admin.email) then
    raise exception 'pr116_actor_email_mismatch' using errcode = '42501';
  end if;

  -- Convert only this transaction-local trusted gateway request to the verified Admin identity.
  -- pr99_require_admin() remains header-unaware and continues to authorize by auth.uid().
  v_claims := v_claims || jsonb_build_object(
    'role', 'authenticated',
    'sub', v_user_id::text,
    'email', lower(v_admin.email)
  );
  perform set_config('request.jwt.claims', v_claims::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config('request.jwt.claim.email', lower(v_admin.email), true);
end
$pr116_actor$;

create or replace function public.pr99_require_admin()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $pr99_admin$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select lower(admin_user.email)
  into v_email
  from public.admin_users as admin_user
  where admin_user.user_id = v_user_id
    and admin_user.is_active is true
    and admin_user.role in ('super_admin', 'deputy_super_admin', 'program_admin')
  limit 1;

  if v_email is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return v_email;
end
$pr99_admin$;

-- Fail closed if this hotfix changes the established gateway ACL contract or function hardening.
do $trusted_actor_contract$
declare
  bridge_oid oid := to_regprocedure('public.pr116_apply_trusted_admin_actor_context()');
  require_admin_oid oid := to_regprocedure('public.pr99_require_admin()');
  dry_run_oid oid := to_regprocedure('public.pr99_backup_dry_run(jsonb,text[])');
  support_oid oid := to_regprocedure('public.pr4_create_support_request(text,text,text,text,text,boolean)');
  bridge_definition text;
  require_admin_definition text;
  bridge_config text[];
  require_admin_config text[];
begin
  if bridge_oid is null or require_admin_oid is null or dry_run_oid is null or support_oid is null then
    raise exception 'trusted_actor_hotfix_required_function_missing';
  end if;

  select pg_get_functiondef(bridge_oid), proconfig
  into bridge_definition, bridge_config
  from pg_proc where oid = bridge_oid;
  select pg_get_functiondef(require_admin_oid), proconfig
  into require_admin_definition, require_admin_config
  from pg_proc where oid = require_admin_oid;

  if not (select prosecdef from pg_proc where oid = bridge_oid)
     or not (select prosecdef from pg_proc where oid = require_admin_oid) then
    raise exception 'trusted_actor_hotfix_security_definer_regression';
  end if;
  if not ('search_path=pg_catalog, public' = any(coalesce(bridge_config, '{}'::text[])))
     or not ('search_path=pg_catalog, public' = any(coalesce(require_admin_config, '{}'::text[]))) then
    raise exception 'trusted_actor_hotfix_search_path_regression';
  end if;

  if position('user_id = v_user_id' in bridge_definition) = 0
     or position('or user_id is null' in lower(bridge_definition)) > 0 then
    raise exception 'trusted_actor_hotfix_user_id_authority_regression';
  end if;
  if position('admin_user.user_id = v_user_id' in require_admin_definition) = 0
     or position('auth.jwt()' in require_admin_definition) > 0
     or position('admin_user.user_id is null' in lower(require_admin_definition)) > 0 then
    raise exception 'trusted_actor_hotfix_legacy_email_authority_regression';
  end if;

  if has_function_privilege('anon', dry_run_oid, 'EXECUTE')
     or has_function_privilege('authenticated', dry_run_oid, 'EXECUTE')
     or not has_function_privilege('service_role', dry_run_oid, 'EXECUTE') then
    raise exception 'trusted_actor_hotfix_backup_acl_regression';
  end if;

  if has_function_privilege('anon', support_oid, 'EXECUTE')
     or has_function_privilege('authenticated', support_oid, 'EXECUTE')
     or not has_function_privilege('service_role', support_oid, 'EXECUTE') then
    raise exception 'trusted_actor_hotfix_support_acl_regression';
  end if;
end
$trusted_actor_contract$;
