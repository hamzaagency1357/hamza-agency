-- HAMZA AGENCY PR101 exact-host public tenant runtime hardening
begin;

create or replace function private.public_tenant_runtime(target_hostname text)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
declare
  normalized_host text := lower(split_part(split_part(trim(coalesce(target_hostname,'')),',',1),':',1));
  selected_tenant public.tenants%rowtype;
  result jsonb;
begin
  if normalized_host !~ '^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' then
    return null;
  end if;

  select t.* into selected_tenant
  from public.tenant_domains d
  join public.tenants t on t.id=d.tenant_id
  where d.hostname=normalized_host
    and d.status in ('verified','active')
    and t.status='active'
  order by d.is_primary desc,d.verified_at desc nulls last,d.id
  limit 1;

  if selected_tenant.id is null then return null; end if;

  select jsonb_build_object(
    'id',selected_tenant.id,
    'slug',selected_tenant.slug,
    'name',selected_tenant.name,
    'defaultLocale',selected_tenant.default_locale,
    'supportedLocales',selected_tenant.supported_locales,
    'branding',coalesce((select to_jsonb(b)-'tenant_id' from public.tenant_branding b where b.tenant_id=selected_tenant.id),'{}'::jsonb),
    'featureFlags',coalesce((select jsonb_object_agg(f.feature_key,jsonb_build_object('enabled',f.enabled,'configuration',f.configuration)) from public.tenant_feature_flags f where f.tenant_id=selected_tenant.id),'{}'::jsonb),
    'settings',coalesce((select jsonb_object_agg(s.key,s.value) from public.tenant_settings s where s.tenant_id=selected_tenant.id and s.is_secret=false),'{}'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function private.public_tenant_runtime(text) from public;
grant execute on function private.public_tenant_runtime(text) to anon,authenticated;
grant execute on function public.resolve_public_tenant_runtime(text) to anon,authenticated;

comment on function private.public_tenant_runtime(text) is
  'Resolves only an exact verified or active tenant hostname. Unknown and malformed hosts return NULL and never fall back to the primary tenant.';

commit;
