with gateway as (
  select p.oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = to_regprocedure('public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)')
), actor as (
  select p.oid, p.prosecdef, p.proconfig
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = to_regprocedure('public.pr116_apply_trusted_admin_actor_context()')
), support as (
  select to_regprocedure('public.pr4_create_support_request(text,text,text,text,text,boolean)')::oid as oid
), sensitive(signature) as (
  values
    ('public.pr99_submit_application(jsonb,text,timestamp with time zone,text)'),
    ('public.pr99_submit_service_request(jsonb,text,timestamp with time zone,text)'),
    ('public.pr99_submit_contact(jsonb,text,timestamp with time zone,text)'),
    ('public.pr99_submit_ai_support(jsonb,text,timestamp with time zone,text)'),
    ('public.pr99_submit_job_application(jsonb,text,timestamp with time zone,text)'),
    ('public.pr99_guard_submission(text,text,jsonb,timestamp with time zone,text)'),
    ('public.pr100_guard_ai_answer(text,jsonb)'),
    ('public.pr100_guard_password_reset(text,jsonb,timestamp with time zone,text)'),
    ('public.lookup_public_agency_application(text,text)'),
    ('public.lookup_public_service_request(text)')
)
select
  (select count(*) = 1 from supabase_migrations.schema_migrations
    where version = '20260810203000' and name = 'pr116_admin_oidc_boundary_lockdown') as anchor_history_exact,
  not has_table_privilege('authenticated', 'public.admin_permissions', 'INSERT')
    and not has_table_privilege('authenticated', 'public.admin_permissions', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.admin_permissions', 'DELETE') as admin_permissions_browser_dml_denied,
  has_table_privilege('service_role', 'public.admin_permissions', 'SELECT')
    and has_table_privilege('service_role', 'public.admin_permissions', 'INSERT')
    and has_table_privilege('service_role', 'public.admin_permissions', 'UPDATE')
    and has_table_privilege('service_role', 'public.admin_permissions', 'DELETE') as admin_permissions_service_contract_ok,
  exists(select 1 from gateway) as gateway_exists,
  coalesce((select has_function_privilege('anon', oid, 'EXECUTE') from gateway), false) as gateway_anon_execute,
  coalesce((select has_function_privilege('authenticated', oid, 'EXECUTE') from gateway), false) as gateway_authenticated_execute,
  coalesce((select has_function_privilege('service_role', oid, 'EXECUTE') from gateway), false) as gateway_service_execute,
  not exists (
    select 1
    from sensitive s
    cross join lateral (select to_regprocedure(s.signature)::oid as oid) f
    where f.oid is null
       or has_function_privilege('anon', f.oid, 'EXECUTE')
       or has_function_privilege('authenticated', f.oid, 'EXECUTE')
       or not has_function_privilege('service_role', f.oid, 'EXECUTE')
  ) as sensitive_rpc_acl_ok,
  exists(select 1 from actor) as trusted_actor_exists,
  coalesce((select prosecdef from actor), false) as trusted_actor_security_definer,
  coalesce((select 'search_path=pg_catalog, public' = any(coalesce(proconfig, '{}'::text[])) from actor), false) as trusted_actor_search_path_ok,
  exists (
    select 1
    from pg_db_role_setting s
    join pg_roles r on r.oid = s.setrole
    where r.rolname = 'authenticator'
      and 'pgrst.db_pre_request=public.pr116_apply_trusted_admin_actor_context' = any(s.setconfig)
  ) as authenticator_pre_request_ok,
  coalesce((select oid is not null from support), false) as support_rpc_exists,
  coalesce((select has_function_privilege('anon', oid, 'EXECUTE') from support), false) as support_anon_execute,
  coalesce((select has_function_privilege('authenticated', oid, 'EXECUTE') from support), false) as support_authenticated_execute,
  coalesce((select has_function_privilege('service_role', oid, 'EXECUTE') from support), false) as support_service_execute,
  coalesce((select position('support_request_create' in pg_get_functiondef(oid)) > 0 from gateway), false) as gateway_has_support_request_create;
