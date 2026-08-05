\set ON_ERROR_STOP on

begin;
do $assert$
declare
  gateway regprocedure := to_regprocedure('public.pr101_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)');
  policy_text text;
begin
  if gateway is null then raise exception 'gateway signature missing'; end if;
  if not has_function_privilege('service_role',gateway,'EXECUTE') then raise exception 'service role gateway execute missing'; end if;
  if has_function_privilege('anon',gateway,'EXECUTE') or has_function_privilege('authenticated',gateway,'EXECUTE') then
    raise exception 'gateway exposed to public roles';
  end if;
  if not has_function_privilege('service_role','public.pr101_oidc_health_probe()','EXECUTE') then raise exception 'probe service role execute missing'; end if;
  if has_function_privilege('anon','public.pr101_oidc_health_probe()','EXECUTE') or has_function_privilege('authenticated','public.pr101_oidc_health_probe()','EXECUTE') then
    raise exception 'probe exposed to public roles';
  end if;
  select pg_get_expr(polqual,polrelid) into policy_text from pg_policy
   where polrelid='public.sections'::regclass and polname='public reads published visible sections';
  if policy_text is null or policy_text ilike '%current_user_is_admin%' then raise exception 'public policy still depends on admin helper'; end if;
end
$assert$;
rollback;

-- PostgreSQL itself enforces a read-only transaction while the service role executes the probe.
begin read only;
set local role service_role;
do $probe$
declare result jsonb;
begin
  select public.pr101_oidc_health_probe() into result;
  if result <> '{"ok": true, "status": "healthy"}'::jsonb then
    raise exception 'unexpected probe result';
  end if;
end
$probe$;
rollback;
