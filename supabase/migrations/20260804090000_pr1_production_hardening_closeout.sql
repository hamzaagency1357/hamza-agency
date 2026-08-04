-- HAMZA AGENCY PR 1 production hardening closeout
-- Additive/replacement-only security repair. No business rows are written.

create or replace function public.pr101_oidc_health_probe()
returns jsonb
language sql
stable
security invoker
set search_path=pg_catalog
as $$
  select jsonb_build_object('ok',true,'status','healthy');
$$;

revoke all on function public.pr101_oidc_health_probe() from public,anon,authenticated;
grant execute on function public.pr101_oidc_health_probe() to service_role;

-- The Edge Function authenticates the Vercel OIDC token and invokes this RPC
-- with the Supabase service role. Production currently has no EXECUTE grant,
-- which causes the observed database_gateway_rejected / HTTP 502 response.
revoke all on function public.pr101_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) from public,anon,authenticated;
grant execute on function public.pr101_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) to service_role;

-- Public visitors must not evaluate an admin-only helper while reading published
-- content. Administrative access remains covered by the separate authenticated
-- admin policies already present on public.sections.
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
  'Read-only service-role probe used after Vercel OIDC verification; never writes application data.';

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
