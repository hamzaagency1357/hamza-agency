-- HAMZA AGENCY PR 1 Production compatibility hotfix.
-- Additive/replacement-only least-privilege repair for public wrappers.
-- No business rows are written.

create or replace function public.current_user_has_tenant_role(
  target_tenant uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select
    auth.uid() is not null
    and target_tenant is not null
    and allowed_roles is not null
    and exists (
      select 1
      from public.tenant_memberships membership
      where membership.tenant_id = target_tenant
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.role = any(allowed_roles)
    );
$function$;

alter function public.current_user_has_tenant_role(uuid,text[]) owner to postgres;
revoke all on function public.current_user_has_tenant_role(uuid,text[]) from public, anon;
revoke all on function public.current_user_has_tenant_role(uuid,text[]) from authenticated;
grant execute on function public.current_user_has_tenant_role(uuid,text[]) to authenticated;

create or replace function public.get_public_incident_status(p_hostname text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select private.get_public_incident_status(p_hostname);
$function$;

alter function public.get_public_incident_status(text) owner to postgres;
revoke all on function public.get_public_incident_status(text) from public, anon, authenticated;
grant execute on function public.get_public_incident_status(text) to anon, authenticated;

create or replace function public.resolve_public_tenant_runtime(p_hostname text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select private.public_tenant_runtime(p_hostname);
$function$;

alter function public.resolve_public_tenant_runtime(text) owner to postgres;
revoke all on function public.resolve_public_tenant_runtime(text) from public, anon, authenticated;
grant execute on function public.resolve_public_tenant_runtime(text) to anon, authenticated;

revoke all on function private.has_tenant_role(uuid,text[]) from public, anon, authenticated;
revoke all on function private.get_public_incident_status(text) from public, anon, authenticated;
revoke all on function private.public_tenant_runtime(text) from public, anon, authenticated;
revoke all on function private.consume_invitation_rate_limit(uuid,text,text) from public, anon, authenticated;
revoke all on function private.assign_primary_tenant() from public, anon, authenticated;

revoke usage on schema private from anon;
revoke usage on schema private from authenticated;

do $contract$
declare
  wrapper_oid oid;
  public_schema_acl boolean;
  wrapper_config text[];
begin
  if has_schema_privilege('anon','private','USAGE') then
    raise exception 'anon_private_schema_usage_not_allowed';
  end if;
  if has_schema_privilege('authenticated','private','USAGE') then
    raise exception 'authenticated_private_schema_usage_not_allowed';
  end if;

  select exists (
    select 1
    from pg_namespace namespace
    cross join lateral aclexplode(coalesce(namespace.nspacl,acldefault('n',namespace.nspowner))) acl
    where namespace.nspname='private'
      and acl.grantee=0
      and acl.privilege_type='USAGE'
  ) into public_schema_acl;
  if public_schema_acl then
    raise exception 'public_private_schema_usage_not_allowed';
  end if;

  if has_function_privilege('anon','private.has_tenant_role(uuid,text[])','EXECUTE')
     or has_function_privilege('authenticated','private.has_tenant_role(uuid,text[])','EXECUTE')
     or has_function_privilege('anon','private.get_public_incident_status(text)','EXECUTE')
     or has_function_privilege('authenticated','private.get_public_incident_status(text)','EXECUTE')
     or has_function_privilege('anon','private.public_tenant_runtime(text)','EXECUTE')
     or has_function_privilege('authenticated','private.public_tenant_runtime(text)','EXECUTE')
     or has_function_privilege('anon','private.consume_invitation_rate_limit(uuid,text,text)','EXECUTE')
     or has_function_privilege('authenticated','private.consume_invitation_rate_limit(uuid,text,text)','EXECUTE')
     or has_function_privilege('anon','private.assign_primary_tenant()','EXECUTE')
     or has_function_privilege('authenticated','private.assign_primary_tenant()','EXECUTE') then
    raise exception 'private_implementation_execute_exposed';
  end if;

  wrapper_oid:=to_regprocedure('public.current_user_has_tenant_role(uuid,text[])');
  if wrapper_oid is null then raise exception 'tenant_role_wrapper_missing'; end if;
  select procedure.proconfig into wrapper_config from pg_proc procedure where procedure.oid=wrapper_oid;
  if not exists (
    select 1 from pg_proc procedure
    where procedure.oid=wrapper_oid
      and procedure.prosecdef=true
      and procedure.proowner='postgres'::regrole
      and procedure.prorettype='boolean'::regtype
  ) then raise exception 'tenant_role_wrapper_contract_invalid'; end if;
  if wrapper_config is distinct from array['search_path=pg_catalog, public, auth']::text[] then
    raise exception 'tenant_role_wrapper_search_path_invalid';
  end if;
  if not has_function_privilege('authenticated',wrapper_oid,'EXECUTE')
     or has_function_privilege('anon',wrapper_oid,'EXECUTE') then
    raise exception 'tenant_role_wrapper_grants_invalid';
  end if;

  wrapper_oid:=to_regprocedure('public.get_public_incident_status(text)');
  if wrapper_oid is null then raise exception 'incident_wrapper_missing'; end if;
  select procedure.proconfig into wrapper_config from pg_proc procedure where procedure.oid=wrapper_oid;
  if not exists (
    select 1 from pg_proc procedure
    where procedure.oid=wrapper_oid
      and procedure.prosecdef=true
      and procedure.proowner='postgres'::regrole
      and procedure.prorettype='jsonb'::regtype
  ) then raise exception 'incident_wrapper_contract_invalid'; end if;
  if wrapper_config is distinct from array['search_path=pg_catalog, public']::text[] then
    raise exception 'incident_wrapper_search_path_invalid';
  end if;
  if not has_function_privilege('anon',wrapper_oid,'EXECUTE')
     or not has_function_privilege('authenticated',wrapper_oid,'EXECUTE') then
    raise exception 'incident_wrapper_grants_invalid';
  end if;

  wrapper_oid:=to_regprocedure('public.resolve_public_tenant_runtime(text)');
  if wrapper_oid is null then raise exception 'tenant_runtime_wrapper_missing'; end if;
  select procedure.proconfig into wrapper_config from pg_proc procedure where procedure.oid=wrapper_oid;
  if not exists (
    select 1 from pg_proc procedure
    where procedure.oid=wrapper_oid
      and procedure.prosecdef=true
      and procedure.proowner='postgres'::regrole
      and procedure.prorettype='jsonb'::regtype
  ) then raise exception 'tenant_runtime_wrapper_contract_invalid'; end if;
  if wrapper_config is distinct from array['search_path=pg_catalog, public']::text[] then
    raise exception 'tenant_runtime_wrapper_search_path_invalid';
  end if;
  if not has_function_privilege('anon',wrapper_oid,'EXECUTE')
     or not has_function_privilege('authenticated',wrapper_oid,'EXECUTE') then
    raise exception 'tenant_runtime_wrapper_grants_invalid';
  end if;
end
$contract$;
