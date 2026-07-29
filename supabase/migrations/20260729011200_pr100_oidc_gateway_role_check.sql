begin;

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
as $$
declare
  v_body jsonb;
  v_actual_digest text;
  v_now bigint := extract(epoch from clock_timestamp())::bigint;
  v_expected_subject text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    return jsonb_build_object('allowed', false, 'code', 'unauthorized_gateway');
  end if;

  if p_action is null or p_action not in (
    'application_lookup','service_lookup','ai_guard','password_reset_guard',
    'application_submit','service_request_submit','job_application_submit',
    'contact_submit','ai_support_submit'
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

  begin
    insert into public.pr100_gateway_nonces(nonce, action, request_timestamp, expires_at)
    values (p_nonce, p_action, p_timestamp, greatest(to_timestamp(p_timestamp), clock_timestamp()) + interval '10 minutes');
  exception when unique_violation then
    return jsonb_build_object('allowed', false, 'code', 'replay_detected');
  end;

  case p_action
    when 'application_lookup' then
      return public.pr100_lookup_public_agency_application_by_code(v_body->>'trackingCode', v_body->>'requestFingerprint');
    when 'service_lookup' then
      return public.pr100_lookup_public_service_request(v_body->>'requestCode', v_body->>'requestFingerprint');
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
    else
      return jsonb_build_object('allowed', false, 'code', 'invalid_action');
  end case;
exception when invalid_text_representation or datetime_field_overflow then
  return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
end;
$$;

revoke all on function public.pr100_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) from public, anon, authenticated;
grant execute on function public.pr100_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) to service_role;

commit;
