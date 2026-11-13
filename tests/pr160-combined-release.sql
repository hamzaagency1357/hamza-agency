-- HAMZA AGENCY PR160 — combined release contract on ONE local Supabase DB.
-- Run only AFTER migrations 20261111234553, 20261112121152, 20261113180500
-- have all succeeded in sequence in the same disposable database.
-- All probe data is synthetic and rolled back; no Production configuration.
\set ON_ERROR_STOP on
begin;

do $combined_preflight$
declare
  fn text;
  expected text;
begin
  if to_regclass('public.pr160_knowledge_rate_windows') is null
     or to_regprocedure('public.pr160_record_knowledge_suggestion(text,text,text)') is null
     or to_regprocedure('public.pr160_admin_data_api_pre_request()') is null
     or to_regprocedure('public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)') is null
  then raise exception 'combined_pr160_migrations_not_installed'; end if;

  if not (select relrowsecurity from pg_class where oid='public.pr160_knowledge_rate_windows'::regclass)
     or has_table_privilege('anon','public.pr160_knowledge_rate_windows','SELECT')
     or has_table_privilege('authenticated','public.pr160_knowledge_rate_windows','SELECT')
     or has_table_privilege('anon','public.pr160_knowledge_rate_windows','INSERT')
     or has_table_privilege('authenticated','public.pr160_knowledge_rate_windows','INSERT')
  then raise exception 'pr160_knowledge_counter_rls_or_acl_missing'; end if;

  foreach fn in array array[
    'pr4_suggest_knowledge(text,text)',
    'pr100_guard_public_lookup(text,text,text)',
    'pr100_lookup_public_agency_application_by_code(text,text)',
    'pr100_lookup_public_service_request(text,text)',
    'pr100_lookup_public_job_application(text,text)',
    'pr100_lookup_public_contact_message(text,text)',
    'pr160_record_knowledge_suggestion(text,text,text)'
  ] loop
    expected := 'public.' || fn;
    if has_function_privilege('anon',expected,'EXECUTE')
       or has_function_privilege('authenticated',expected,'EXECUTE')
       or not has_function_privilege('service_role',expected,'EXECUTE')
    then raise exception 'pr160_rpc_acl_invalid:%',expected; end if;
  end loop;
  if has_function_privilege('service_role','public.create_translation_candidate_draft(text,text,text,text,jsonb,jsonb)','EXECUTE')
     or not has_function_privilege('authenticated','public.create_translation_candidate_draft(text,text,text,text,jsonb,jsonb)','EXECUTE')
  then raise exception 'pr160_translation_user_jwt_contract_invalid'; end if;

  if not exists (
    select 1 from pg_db_role_setting s
    join pg_roles r on r.oid=s.setrole
    cross join lateral unnest(s.setconfig) value
    where r.rolname='authenticator'
      and value='pgrst.db_pre_request=public.pr160_admin_data_api_pre_request'
  ) then raise exception 'pr160_combined_mfa_pre_request_missing'; end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conname='pr100_gateway_nonces_action_check'
      and position('knowledge_suggest' in pg_get_constraintdef(c.oid))>0
  ) then raise exception 'pr160_nonce_action_contract_missing'; end if;

  if position('knowledge_suggest' in pg_get_functiondef(
      'public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)'::regprocedure
     ))=0
  then raise exception 'pr160_database_oidc_dispatch_missing'; end if;
end
$combined_preflight$;

set local role anon;
do $anonymous$
begin
  begin
    perform public.pr4_suggest_knowledge('unauthorized synthetic question','ar');
    raise exception 'anonymous_knowledge_write_was_allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.pr100_lookup_public_service_request('SR-2026-0000000000', repeat('a',64));
    raise exception 'anonymous_direct_tracking_rpc_was_allowed';
  exception when insufficient_privilege then null;
  end;
end
$anonymous$;

reset role;
set local role authenticated;
do $signed_in$
begin
  begin
    perform public.pr160_record_knowledge_suggestion('unauthorized synthetic question','tr',repeat('b',64));
    raise exception 'authenticated_suggestion_write_was_allowed';
  exception when insufficient_privilege then null;
  end;
end
$signed_in$;

reset role;
set local role service_role;
set local request.jwt.claim.role = 'service_role';

do $gateway$
declare
  source_hash text := repeat('c',64);
  request_body text;
  stamp bigint;
  nonce text;
  response jsonb;
  tries integer;
begin

  -- This simulates the already-verified Edge's signed-claims handoff at the DB boundary.
  -- JWT signature verification itself is covered separately by the JOSE Edge tests.
  for tries in 1..9 loop
    request_body := jsonb_build_object(
       'question', 'PR160 combined isolated synthetic question ' || tries,
       'language', 'tr',
       'sourceFingerprint', source_hash
    )::text;
    stamp := floor(extract(epoch from clock_timestamp()))::bigint;
    nonce := encode(extensions.gen_random_bytes(18),'hex');
    response := public.pr100_oidc_gateway(
      'knowledge_suggest',stamp,nonce,request_body,
      encode(extensions.digest(request_body,'sha256'),'hex'),
      'https://oidc.vercel.com/hamzaagencysy-3009s-projects',
      'owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:production',
      'https://vercel.com/hamzaagencysy-3009s-projects',
      'team_gu9SOMWlOqS2uvLEZUYEbTPs',
      'prj_YQw97FRAAwcnpQkudzGr01kXASvN',
      'hamza-agency','production',stamp,stamp+90
    );
    if tries<=8 and response->>'allowed' is distinct from 'true'
       or tries=9 and response->>'code' is distinct from 'rate_limited'
    then raise exception 'pr160_combined_knowledge_budget_failed:%:%',tries,response; end if;
  end loop;


  -- Preview must be refused despite an otherwise valid OIDC identity.
  request_body := jsonb_build_object(
    'question','PR160 combined isolated preview must not persist','language','ar',
    'sourceFingerprint',repeat('d',64)
  )::text;
  stamp:=floor(extract(epoch from clock_timestamp()))::bigint;
  nonce:=encode(extensions.gen_random_bytes(18),'hex');
  response:=public.pr100_oidc_gateway(
    'knowledge_suggest',stamp,nonce,request_body,
    encode(extensions.digest(request_body,'sha256'),'hex'),
    'https://oidc.vercel.com/hamzaagencysy-3009s-projects',
    'owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:preview',
    'https://vercel.com/hamzaagencysy-3009s-projects',
    'team_gu9SOMWlOqS2uvLEZUYEbTPs',
    'prj_YQw97FRAAwcnpQkudzGr01kXASvN',
    'hamza-agency','preview',stamp,stamp+90
  );
  if response->>'code' is distinct from 'preview_write_denied'
  then raise exception 'pr160_preview_write_guard_failed:%',response; end if;
  -- Verify absence of a persisted Preview row under the local DB owner after RESET ROLE.

  -- Existing legitimate lookup actions must still travel through signed OIDC dispatcher.
  for tries in 1..4 loop
    request_body := case tries
      when 1 then jsonb_build_object('trackingCode','APP-2026-AAAAAAAAAA','requestFingerprint',repeat('e',64))::text
      when 2 then jsonb_build_object('requestCode','SR-2026-AAAAAAAAAA','requestFingerprint',repeat('f',64))::text
      when 3 then jsonb_build_object('trackingCode','JOB-2026-AAAAAAAAAA','requestFingerprint',repeat('a',64))::text
      else jsonb_build_object('trackingCode','CNT-2026-AAAAAAAAAA','requestFingerprint',repeat('b',64))::text
    end;
    stamp:=floor(extract(epoch from clock_timestamp()))::bigint;
    response:=public.pr100_oidc_gateway(
      (array['application_lookup','service_lookup','job_lookup','contact_lookup'])[tries],
      stamp,encode(extensions.gen_random_bytes(18),'hex'),request_body,
      encode(extensions.digest(request_body,'sha256'),'hex'),
      'https://oidc.vercel.com/hamzaagencysy-3009s-projects',
      'owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:production',
      'https://vercel.com/hamzaagencysy-3009s-projects',
      'team_gu9SOMWlOqS2uvLEZUYEbTPs',
      'prj_YQw97FRAAwcnpQkudzGr01kXASvN',
      'hamza-agency','production',stamp,stamp+90
    );
    if response->>'code' in ('unauthorized_gateway','invalid_action','invalid_oidc_claims','preview_write_denied')
       or response is null then
      raise exception 'pr160_combined_tracking_gateway_failed:%:%',tries,response;
    end if;
  end loop;
end
$gateway$;

reset role;
-- Test observer is the local isolated DB owner; service_role is deliberately
-- unable to SELECT the private suggestions table through the Data API.
do $proof$
declare observed integer;
begin
  select count(*) into observed from public.pr4_knowledge_suggestions
  where question_redacted like 'PR160 combined isolated synthetic question %';
  if observed <> 8 then
    raise exception 'pr160_combined_knowledge_persistence_failed:%',observed;
  end if;
  if exists(select 1 from public.pr4_knowledge_suggestions
    where question_redacted='PR160 combined isolated preview must not persist')
  then raise exception 'pr160_preview_knowledge_write_occurred'; end if;
end
$proof$;
rollback;
select 'PASS: all three migrations share one isolated DB; roles, RLS, MFA and trusted RPC/OIDC simulation' as result;
