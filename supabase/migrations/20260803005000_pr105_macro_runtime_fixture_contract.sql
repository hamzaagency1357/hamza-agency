-- HAMZA AGENCY PR105 macro runtime fixture and RLS contract hardening
-- Additive-only replacement of the public tenant-role predicate.
-- No business rows are changed and no access is granted to the private schema.

create or replace function public.current_user_has_tenant_role(
  target_tenant uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
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
$$;

revoke all on function public.current_user_has_tenant_role(uuid,text[]) from public;
grant execute on function public.current_user_has_tenant_role(uuid,text[]) to authenticated;

do $contract$
begin
  if not exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid=procedure.pronamespace
    where namespace.nspname='public'
      and procedure.proname='current_user_has_tenant_role'
      and procedure.prosecdef=true
  ) then
    raise exception 'tenant_role_predicate_must_be_security_definer';
  end if;

  if has_schema_privilege('authenticated','private','USAGE') then
    raise exception 'authenticated_private_schema_usage_not_allowed';
  end if;
end
$contract$;
