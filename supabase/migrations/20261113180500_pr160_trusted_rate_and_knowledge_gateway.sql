-- PR160 — trusted anonymous knowledge collection + source-stable lookup limits.
-- Candidate only. Deploy OIDC Edge allowlist and Next.js changes in a reviewed
-- cutover before running this in Production. No Production operation in CI.
begin;

create table if not exists public.pr160_knowledge_rate_windows (
  scope text not null check (scope in ('source','global')),
  source_hash text not null,
  minute_start timestamptz not null,
  accepted integer not null default 0 check (accepted >= 0),
  primary key (scope,source_hash,minute_start)
);
alter table public.pr160_knowledge_rate_windows enable row level security;
revoke all on public.pr160_knowledge_rate_windows from public, anon, authenticated;

-- Prevent the existing lookup COUNT-then-INSERT race without widening its API.
create or replace function public.pr100_guard_public_lookup(
  p_lookup_type text,
  p_identity text,
  p_request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_identity text;
  v_fingerprint text;
  v_identity_hash text;
  v_fingerprint_hash text;
  v_identity_attempts integer;
  v_fingerprint_attempts integer;
  v_reason text;
begin
  if p_lookup_type not in ('application', 'service_request', 'job_application', 'contact') then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;
  v_identity := lower(trim(coalesce(p_identity, ''));
  v_fingerprint := lower(trim(coalesce(p_request_fingerprint, ''));
  if length(v_identity) < 8 or length(v_identity) > 160 or v_fingerprint !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;
  v_identity_hash := encode(digest(convert_to(p_lookup_type || ':' || v_identity, 'UTF8'), 'sha256'), 'hex');
  v_fingerprint_hash := encode(digest(convert_to(v_fingerprint, 'UTF8'), 'sha256'), 'hex');
  -- Two stable lock dimensions in fixed order prevent concurrent transactions
  -- from both passing pre-insert COUNT checks. These are not user grants.
  perform pg_advisory_xact_lock(hashtextextended('pr160:lookup:identity:' || v_identity_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended('pr160:lookup:source:' || v_fingerprint_hash, 0));
  select count(*) into v_identity_attempts from public.public_lookup_guards
  where lookup_type = p_lookup_type and identity_hash = v_identity_hash and created_at > now() - interval '15 minutes';
  select count(*) into v_fingerprint_attempts from public.public_lookup_guards
  where fingerprint_hash = v_fingerprint_hash and created_at > now() - interval '1 hour';
  if v_identity_attempts >= 5 or v_fingerprint_attempts >= 30 then v_reason := 'rate_limited'; end if;
  insert into public.public_lookup_guards(lookup_type, identity_hash, fingerprint_hash, accepted, reason)
  values (p_lookup_type, v_identity_hash, v_fingerprint_hash, v_reason is null, v_reason);
  return jsonb_build_object('allowed', v_reason is null, 'code', coalesce(v_reason, 'ok'));
end;
$$;

-- The only writer for new AI suggestions is the service-role OIDC dispatcher.
-- Each request consumes one source and one global budget unit, in one database
-- transaction. Counters hold no question text, IP, email, or phone number.
create or replace function public.pr160_record_knowledge_suggestion(
  p_question text, p_language text, p_source_fingerprint text
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,public,extensions as $pr160$
declare
  v_role text := coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'');
  v_source text;
  v_minute timestamptz := date_trunc('minute',clock_timestamp());
  v_start timestamptz := date_trunc('minute',clock_timestamp()-interval '15 minutes');
  v_source_used integer;
  v_global_used integer;
begin
  if v_role <> 'service_role' then
    return jsonb_build_object('allowed',false,'code','forbidden');
  end if;
  if p_question is null or length(trim(p_question)) < 4 or length(p_question)>800
     or octet_length(p_question)>3200 or p_language not in ('ar','en','tr')
     or p_source_fingerprint is null or p_source_fingerprint !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;
  v_source := encode(digest(convert_to(p_source_fingerprint,'UTF8'),'sha256'),'hex');
  -- Global serialization prevents race conditions even when an attacker uses
  -- multiple unique question strings. The source limit protects shared access.
  perform pg_advisory_xact_lock(20261113,1601);
  select coalesce(sum(accepted),0) into v_source_used
    from public.pr160_knowledge_rate_windows
    where scope='source' and source_hash=v_source and minute_start>=v_start;
  select coalesce(sum(accepted),0) into v_global_used
    from public.pr160_knowledge_rate_windows
    where scope='global' and source_hash='all' and minute_start>=v_start;
  if v_source_used >= 8 or v_global_used >= 160 then
    return jsonb_build_object('allowed',false,'code','rate_limited');
  end if;
  insert into public.pr160_knowledge_rate_windows(scope,source_hash,minute_start,accepted)
    values('source',v_source,v_minute,1)
    on conflict(scope,source_hash,minute_start) do update
    set accepted=public.pr160_knowledge_rate_windows.accepted+1;
  insert into public.pr160_knowledge_rate_windows(scope,source_hash,minute_start,accepted)
    values('global','all',v_minute,1)
    on conflict(scope,source_hash,minute_start) do update
    set accepted=public.pr160_knowledge_rate_windows.accepted+1;
  perform public.pr4_suggest_knowledge(p_question,p_language);
  return jsonb_build_object('allowed',true,'code','ok');
end
$pr160$;
revoke all on function public.pr160_record_knowledge_suggestion(text,text,text) from public,anon,authenticated;
grant execute on function public.pr160_record_knowledge_suggestion(text,text,text) to service_role;

-- Extend signed gateway nonce/action contract before dispatching the new action.
alter table public.pr100_gateway_nonces drop constraint if exists pr100_gateway_nonces_action_check;
alter table public.pr100_gateway_nonces
  add constraint pr100_gateway_nonces_action_check
  check (action in (
    'application_lookup','service_lookup','job_lookup','contact_lookup','ai_guard','password_reset_guard',
    'application_submit','service_request_submit','job_application_submit','contact_submit','ai_support_submit',
    'review_submit','support_request_create','knowledge_suggest'
  ));
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
    'review_submit','support_request_create','knowledge_suggest'
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
    'review_submit','support_request_create','knowledge_suggest'
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
    when 'knowledge_suggest' then
      return public.pr160_record_knowledge_suggestion(
        v_body->>'question', v_body->>'language', v_body->>'sourceFingerprint'
      );
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
alter function public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint) owner to postgres;
revoke all on function public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint) to service_role;

-- The trusted /api/track and status routes already call the OIDC dispatcher.
-- Remove *direct* browser RPC bypasses only as part of this coordinated change.
revoke all on function public.pr4_suggest_knowledge(text,text) from public,anon,authenticated;
grant execute on function public.pr4_suggest_knowledge(text,text) to service_role;
revoke all on function public.pr100_guard_public_lookup(text,text,text) from public,anon,authenticated;
grant execute on function public.pr100_guard_public_lookup(text,text,text) to service_role;
revoke all on function public.pr100_lookup_public_agency_application(text,text,text) from public,anon,authenticated;
revoke all on function public.pr100_lookup_public_agency_application_by_code(text,text) from public,anon,authenticated;
revoke all on function public.pr100_lookup_public_service_request(text,text) from public,anon,authenticated;
revoke all on function public.pr100_lookup_public_job_application(text,text) from public,anon,authenticated;
revoke all on function public.pr100_lookup_public_contact_message(text,text) from public,anon,authenticated;
grant execute on function public.pr100_lookup_public_agency_application_by_code(text,text),
  public.pr100_lookup_public_service_request(text,text),
  public.pr100_lookup_public_job_application(text,text),
  public.pr100_lookup_public_contact_message(text,text) to service_role;

do $contract$
begin
  if has_function_privilege('anon','public.pr4_suggest_knowledge(text,text)','EXECUTE')
  or has_function_privilege('authenticated','public.pr4_suggest_knowledge(text,text)','EXECUTE')
  or has_function_privilege('anon','public.pr100_lookup_public_service_request(text,text)','EXECUTE')
  or has_function_privilege('anon','public.pr100_lookup_public_agency_application_by_code(text,text)','EXECUTE')
  or has_function_privilege('anon','public.pr160_record_knowledge_suggestion(text,text,text)','EXECUTE')
  or not has_function_privilege('service_role','public.pr160_record_knowledge_suggestion(text,text,text)','EXECUTE') then
    raise exception 'pr160_rpc_access_contract_failed';
  end if;
end
$contract$;

comment on function public.pr160_record_knowledge_suggestion(text,text,text) is
 'Service-role OIDC-only, serialized source+global budget for redacted suggestions; no visitor data persisted in counters.';
commit;
