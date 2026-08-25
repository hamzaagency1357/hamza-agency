-- HAMZA AGENCY — PR-A stage 1: trusted support gateway preparation.
-- This migration is intentionally backward-compatible. It prepares the trusted
-- support path while preserving the legacy public support RPC ACL until stage 2.

begin;

alter table public.pr100_gateway_nonces
  drop constraint if exists pr100_gateway_nonces_action_check;
alter table public.pr100_gateway_nonces
  add constraint pr100_gateway_nonces_action_check
  check (action in (
    'application_lookup','service_lookup','job_lookup','contact_lookup','ai_guard','password_reset_guard',
    'application_submit','service_request_submit','job_application_submit','contact_submit','ai_support_submit',
    'review_submit','support_request_create'
  )) not valid;
alter table public.pr100_gateway_nonces validate constraint pr100_gateway_nonces_action_check;

create or replace function public.pr100_oidc_gateway(
  p_action text,
  p_timestamp bigint,
  p_nonce text,
  p_body text,
  p_body_digest text,
  p_oidc_issuer text,
  p_oidc_subject text,
  p_oidc_audience text,
  p_oidc_team_id text,
  p_oidc_project_id text,
  p_oidc_project text,
  p_oidc_environment text,
  p_oidc_issued_at bigint,
  p_oidc_expires_at bigint
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  v_body jsonb;
  v_actual_digest text;
  v_now bigint := extract(epoch from clock_timestamp())::bigint;
  v_expected_subject text;
  v_request_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
    ''
  );
  v_guard jsonb;
begin
  if v_request_role <> 'service_role' then
    return jsonb_build_object('allowed', false, 'code', 'unauthorized_gateway');
  end if;

  if p_action is null or p_action not in (
    'application_lookup','service_lookup','job_lookup','contact_lookup','ai_guard','password_reset_guard',
    'application_submit','service_request_submit','job_application_submit','contact_submit','ai_support_submit',
    'review_submit','support_request_create'
  ) then
    return jsonb_build_object('allowed', false, 'code', 'invalid_action');
  end if;
  if p_timestamp is null or p_timestamp < v_now - 120 or p_timestamp > v_now + 30 then
    return jsonb_build_object('allowed', false, 'code', 'stale_request');
  end if;
  if p_nonce is null or p_nonce !~ '^[A-Za-z0-9_-]{24,80}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_nonce');
  end if;
  if p_body is null or octet_length(p_body) > 40000 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
  end if;

  begin
    v_body := p_body::jsonb;
  exception when others then
    return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
  end;
  if jsonb_typeof(v_body) <> 'object' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
  end if;

  v_actual_digest := encode(extensions.digest(convert_to(p_body, 'UTF8'), 'sha256'), 'hex');
  if p_body_digest is null or lower(p_body_digest) <> v_actual_digest then
    return jsonb_build_object('allowed', false, 'code', 'digest_mismatch');
  end if;

  if p_oidc_issuer <> 'https://oidc.vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_audience <> 'https://vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_team_id <> 'team_gu9SOMWlOqS2uvLEZUYEbTPs'
     or p_oidc_project_id <> 'prj_YQw97FRAAwcnpQkudzGr01kXASvN'
     or p_oidc_project <> 'hamza-agency'
     or p_oidc_environment not in ('preview','production') then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_claims');
  end if;

  v_expected_subject := 'owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:' || p_oidc_environment;
  if p_oidc_subject <> v_expected_subject then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_subject');
  end if;
  if p_oidc_issued_at is null or p_oidc_expires_at is null
     or p_oidc_issued_at > v_now + 30
     or p_oidc_expires_at <= v_now
     or p_oidc_expires_at - p_oidc_issued_at > 7200 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_time');
  end if;

  if p_oidc_environment = 'preview' and p_action in (
    'application_submit','service_request_submit','job_application_submit','contact_submit','ai_support_submit',
    'review_submit','support_request_create'
  ) then
    return jsonb_build_object('allowed', false, 'code', 'preview_write_denied');
  end if;

  begin
    insert into public.pr100_gateway_nonces(nonce, action, request_timestamp, expires_at)
    values (
      p_nonce,
      p_action,
      p_timestamp,
      greatest(to_timestamp(p_timestamp), clock_timestamp()) + interval '10 minutes'
    );
  exception when unique_violation then
    return jsonb_build_object('allowed', false, 'code', 'replay_detected');
  end;

  case p_action
    when 'application_lookup' then
      return public.pr100_lookup_public_agency_application_by_code(v_body->>'trackingCode', v_body->>'requestFingerprint');
    when 'service_lookup' then
      return public.pr100_lookup_public_service_request(v_body->>'requestCode', v_body->>'requestFingerprint');
    when 'job_lookup' then
      return public.pr100_lookup_public_job_application(v_body->>'trackingCode', v_body->>'requestFingerprint');
    when 'contact_lookup' then
      return public.pr100_lookup_public_contact_message(v_body->>'trackingCode', v_body->>'requestFingerprint');
    when 'ai_guard' then
      return public.pr100_guard_ai_answer(v_body->>'identity', v_body->'payload');
    when 'password_reset_guard' then
      return public.pr100_guard_password_reset(v_body->>'identity', v_body->'payload', (v_body->>'startedAt')::timestamptz, coalesce(v_body->>'honeypot',''));
    when 'application_submit' then
      return public.pr99_submit_application(v_body->'payload', v_body->>'identity', (v_body->>'startedAt')::timestamptz, coalesce(v_body->>'honeypot',''));
    when 'service_request_submit' then
      return public.pr99_submit_service_request(v_body->'payload', v_body->>'identity', (v_body->>'startedAt')::timestamptz, coalesce(v_body->>'honeypot',''));
    when 'job_application_submit' then
      return public.pr99_submit_job_application(v_body->'payload', v_body->>'identity', (v_body->>'startedAt')::timestamptz, coalesce(v_body->>'honeypot',''));
    when 'contact_submit' then
      return public.pr99_submit_contact(v_body->'payload', v_body->>'identity', (v_body->>'startedAt')::timestamptz, coalesce(v_body->>'honeypot',''));
    when 'ai_support_submit' then
      return public.pr99_submit_ai_support(v_body->'payload', v_body->>'identity', (v_body->>'startedAt')::timestamptz, coalesce(v_body->>'honeypot',''));
    when 'review_submit' then
      return public.pr99_submit_review(v_body->'payload', v_body->>'identity', (v_body->>'startedAt')::timestamptz, coalesce(v_body->>'honeypot',''));
    when 'support_request_create' then
      if coalesce(jsonb_typeof(v_body->'payload'), '') <> 'object' then
        return jsonb_build_object('allowed', false, 'code', 'invalid_request');
      end if;
      v_guard := public.pr100_guard_ai_answer(
        v_body->>'identity',
        jsonb_build_object('question', 'handoff:' || left(coalesce(v_body->'payload'->>'subject',''), 300))
      );
      if coalesce((v_guard->>'allowed')::boolean, false) is not true then
        return v_guard;
      end if;
      return public.pr4_create_support_request(
        case when v_body->'payload'->>'language' in ('ar','en','tr') then v_body->'payload'->>'language' else 'ar' end,
        left(coalesce(v_body->'payload'->>'subject','طلب دعم'), 300),
        left(coalesce(v_body->'payload'->>'context',''), 4000),
        nullif(v_body->'payload'->>'contactType',''),
        nullif(left(coalesce(v_body->'payload'->>'contactValue',''), 320), ''),
        coalesce((v_body->'payload'->>'consent')::boolean, false)
      );
    else
      return jsonb_build_object('allowed', false, 'code', 'invalid_action');
  end case;
exception when invalid_text_representation or datetime_field_overflow then
  return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
end
$function$;

alter function public.pr100_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) owner to postgres;
revoke all on function public.pr100_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) from public, anon, authenticated;
grant execute on function public.pr100_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) to service_role;

do $preparation_contract$
declare
  support_oid oid := to_regprocedure('public.pr4_create_support_request(text,text,text,text,text,boolean)');
  gateway_oid oid := to_regprocedure('public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)');
begin
  if support_oid is null or gateway_oid is null then
    raise exception 'pr_a_preparation_required_function_missing';
  end if;
  if position('support_request_create' in pg_get_functiondef(gateway_oid)) = 0 then
    raise exception 'pr_a_preparation_gateway_action_missing';
  end if;
  if not has_function_privilege('anon', support_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', support_oid, 'EXECUTE') then
    raise exception 'pr_a_preparation_old_support_acl_not_preserved';
  end if;
  if has_function_privilege('anon', gateway_oid, 'EXECUTE')
     or has_function_privilege('authenticated', gateway_oid, 'EXECUTE')
     or not has_function_privilege('service_role', gateway_oid, 'EXECUTE') then
    raise exception 'pr_a_preparation_gateway_acl_invalid';
  end if;
end
$preparation_contract$;

commit;
