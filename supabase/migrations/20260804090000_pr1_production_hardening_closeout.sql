-- HAMZA AGENCY PR 1 production hardening closeout
-- Additive/replacement-only security repair. No business rows are written.

create or replace function public.pr101_oidc_health_probe()
returns jsonb
language plpgsql
stable
security invoker
set search_path=pg_catalog
as $function$
declare
  gateway_signature constant text := 'public.pr101_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)';
  gateway_oid oid := to_regprocedure(gateway_signature);
begin
  if current_user <> 'service_role' then
    return jsonb_build_object('ok',false,'status','degraded','reason','executor_not_authorized');
  end if;
  if gateway_oid is null then
    return jsonb_build_object('ok',false,'status','degraded','reason','gateway_missing');
  end if;
  if not has_function_privilege(current_user,gateway_oid,'EXECUTE')
     or not has_function_privilege('service_role',gateway_oid,'EXECUTE') then
    return jsonb_build_object('ok',false,'status','degraded','reason','service_role_execute_missing');
  end if;
  if has_function_privilege('anon',gateway_oid,'EXECUTE')
     or has_function_privilege('authenticated',gateway_oid,'EXECUTE') then
    return jsonb_build_object('ok',false,'status','degraded','reason','public_execute_exposed');
  end if;
  if not has_function_privilege('service_role','public.pr101_oidc_health_probe()','EXECUTE')
     or has_function_privilege('anon','public.pr101_oidc_health_probe()','EXECUTE')
     or has_function_privilege('authenticated','public.pr101_oidc_health_probe()','EXECUTE') then
    return jsonb_build_object('ok',false,'status','degraded','reason','probe_execute_contract_invalid');
  end if;
  return jsonb_build_object('ok',true,'status','healthy');
end
$function$;

revoke all on function public.pr101_oidc_health_probe() from public,anon,authenticated;
grant execute on function public.pr101_oidc_health_probe() to service_role;

revoke all on function public.pr101_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) from public,anon,authenticated;
grant execute on function public.pr101_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) to service_role;

alter policy "public reads published visible sections" on public.sections
  to anon,authenticated
  using (
    is_visible=true
    and is_published=true
    and publishing_status='published'
    and (scheduled_publish_at is null or scheduled_publish_at<=now())
    and (scheduled_unpublish_at is null or scheduled_unpublish_at>now())
  );

comment on function public.pr101_oidc_health_probe() is
  'Read-only service-role runtime verification after Vercel OIDC validation; never writes application data.';

do $contract$
declare gateway_oid oid;
begin
  gateway_oid:=to_regprocedure('public.pr101_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)');
  if gateway_oid is null then raise exception 'pr101_oidc_gateway_missing'; end if;
  if not has_function_privilege('service_role',gateway_oid,'EXECUTE') then
    raise exception 'pr101_oidc_gateway_service_role_execute_missing';
  end if;
  if has_function_privilege('anon',gateway_oid,'EXECUTE')
     or has_function_privilege('authenticated',gateway_oid,'EXECUTE') then
    raise exception 'pr101_oidc_gateway_excessive_execute';
  end if;
  if not has_function_privilege('service_role','public.pr101_oidc_health_probe()','EXECUTE') then
    raise exception 'pr101_oidc_health_probe_service_role_execute_missing';
  end if;
  if has_function_privilege('anon','public.pr101_oidc_health_probe()','EXECUTE')
     or has_function_privilege('authenticated','public.pr101_oidc_health_probe()','EXECUTE') then
    raise exception 'pr101_oidc_health_probe_excessive_execute';
  end if;
  if exists(
    select 1 from pg_policy p
    where p.polrelid='public.sections'::regclass
      and p.polname='public reads published visible sections'
      and pg_get_expr(p.polqual,p.polrelid) ilike '%current_user_is_admin%'
  ) then raise exception 'public_sections_policy_calls_admin_helper'; end if;
end
$contract$;
