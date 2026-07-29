begin;

create or replace function public.pr99_guard_submission(
  p_form_type text,
  p_identity text,
  p_payload jsonb,
  p_started_at timestamptz,
  p_honeypot text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_identity_hash text;
  v_payload_hash text;
  v_recent integer;
  v_hourly integer;
  v_duplicate integer;
  v_global_recent integer;
  v_global_hourly integer;
  v_reason text;
begin
  if p_form_type not in ('application','service_request','job_application','contact','ai_support','password_reset') then
    raise exception 'Invalid form type';
  end if;
  if length(coalesce(p_payload::text,'')) > 30000 then
    v_reason := 'payload_too_large';
  elsif coalesce(trim(p_honeypot),'') <> '' then
    v_reason := 'honeypot';
  elsif p_started_at is null
     or p_started_at > now() + interval '30 seconds'
     or now() - p_started_at < interval '2 seconds' then
    v_reason := 'submitted_too_fast';
  elsif length(trim(coalesce(p_identity,''))) < 3
     or length(trim(coalesce(p_identity,''))) > 500 then
    v_reason := 'invalid_identity';
  end if;

  v_identity_hash := encode(
    digest(convert_to(lower(trim(coalesce(p_identity,''))) || ':' || p_form_type,'UTF8'),'sha256'),
    'hex'
  );
  v_payload_hash := encode(
    digest(convert_to(coalesce(p_payload,'{}'::jsonb)::text,'UTF8'),'sha256'),
    'hex'
  );

  select count(*) into v_recent
  from public.public_submission_guards
  where form_type=p_form_type
    and identity_hash=v_identity_hash
    and accepted=true
    and created_at>now()-interval '15 minutes';

  select count(*) into v_hourly
  from public.public_submission_guards
  where form_type=p_form_type
    and identity_hash=v_identity_hash
    and created_at>now()-interval '1 hour';

  select count(*) into v_duplicate
  from public.public_submission_guards
  where form_type=p_form_type
    and payload_hash=v_payload_hash
    and accepted=true
    and created_at>now()-interval '24 hours';

  select count(*) into v_global_recent
  from public.public_submission_guards
  where form_type=p_form_type
    and accepted=true
    and created_at>now()-interval '15 minutes';

  select count(*) into v_global_hourly
  from public.public_submission_guards
  where form_type=p_form_type
    and accepted=true
    and created_at>now()-interval '1 hour';

  if v_reason is null and (v_recent >= 3 or v_hourly >= 8) then
    v_reason := 'cooldown';
  end if;
  if v_reason is null and v_duplicate >= 1 then
    v_reason := 'duplicate';
  end if;
  if v_reason is null and (v_global_recent >= 60 or v_global_hourly >= 240) then
    v_reason := 'global_cooldown';
  end if;

  insert into public.public_submission_guards(
    form_type,
    identity_hash,
    payload_hash,
    accepted,
    reason
  ) values (
    p_form_type,
    v_identity_hash,
    v_payload_hash,
    v_reason is null,
    v_reason
  );

  return jsonb_build_object(
    'allowed',v_reason is null,
    'code',case when v_reason is null then 'ok' else 'try_again_later' end
  );
end;
$$;

create or replace function public.pr99_submit_application(
  p_payload jsonb,
  p_identity text,
  p_started_at timestamptz,
  p_honeypot text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_guard jsonb;
  v_id bigint;
  v_name text;
  v_country text;
  v_phone text;
  v_platform text;
  v_derived_identity text;
begin
  v_name:=trim(public.pr99_sanitize_text(p_payload->>'full_name',160));
  v_country:=trim(public.pr99_sanitize_text(p_payload->>'country',120));
  v_phone:=trim(public.pr99_sanitize_text(p_payload->>'whatsapp',40));
  v_platform:=trim(public.pr99_sanitize_text(p_payload->>'platform',120));
  if length(v_name)<2
     or length(v_country)<2
     or length(regexp_replace(v_phone,'[^0-9]','','g'))<8
     or length(v_platform)<2 then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  v_derived_identity:=regexp_replace(v_phone,'[^0-9]','','g')||':'||lower(v_platform);
  v_guard:=public.pr99_guard_submission('application',v_derived_identity,p_payload,p_started_at,p_honeypot);
  if not coalesce((v_guard->>'allowed')::boolean,false) then return v_guard; end if;

  insert into public.agency_applications(
    full_name,country,whatsapp,platform,previous_experience,notes,status,internal_notes
  ) values (
    v_name,v_country,v_phone,v_platform,
    nullif(public.pr99_sanitize_text(p_payload->>'previous_experience',4000),''),
    nullif(public.pr99_sanitize_text(p_payload->>'notes',4000),''),
    'new',null
  ) returning id into v_id;
  return jsonb_build_object('allowed',true,'code','ok','id',v_id);
end;
$$;

create or replace function public.pr99_submit_service_request(
  p_payload jsonb,
  p_identity text,
  p_started_at timestamptz,
  p_honeypot text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_guard jsonb;
  v_id bigint;
  v_code text;
  v_name text;
  v_phone text;
  v_type text;
  v_derived_identity text;
begin
  v_name:=trim(public.pr99_sanitize_text(p_payload->>'full_name',160));
  v_phone:=trim(public.pr99_sanitize_text(p_payload->>'whatsapp',40));
  v_type:=trim(public.pr99_sanitize_text(p_payload->>'service_type',120));
  if length(v_name)<2
     or length(regexp_replace(v_phone,'[^0-9]','','g'))<8
     or length(v_type)<2 then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  v_derived_identity:=regexp_replace(v_phone,'[^0-9]','','g')||':'||lower(v_type);
  v_guard:=public.pr99_guard_submission('service_request',v_derived_identity,p_payload,p_started_at,p_honeypot);
  if not coalesce((v_guard->>'allowed')::boolean,false) then return v_guard; end if;

  v_code:='SR-'||to_char(now(),'YYYY')||'-'||upper(substr(encode(gen_random_bytes(8),'hex'),1,10));
  insert into public.service_requests(
    request_code,full_name,country,whatsapp,service_type,platform,
    account_identifier,requested_amount,notes,status,internal_notes
  ) values (
    v_code,v_name,
    nullif(public.pr99_sanitize_text(p_payload->>'country',120),''),
    v_phone,v_type,
    nullif(public.pr99_sanitize_text(p_payload->>'platform',120),''),
    nullif(public.pr99_sanitize_text(p_payload->>'account_identifier',240),''),
    nullif(public.pr99_sanitize_text(p_payload->>'requested_amount',120),''),
    nullif(public.pr99_sanitize_text(p_payload->>'notes',4000),''),
    'new',null
  ) returning id into v_id;
  return jsonb_build_object('allowed',true,'code','ok','id',v_id,'tracking_code',v_code);
end;
$$;

create or replace function public.pr99_submit_job_application(
  p_payload jsonb,
  p_identity text,
  p_started_at timestamptz,
  p_honeypot text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_guard jsonb;
  v_id bigint;
  v_name text;
  v_phone text;
  v_job bigint;
  v_derived_identity text;
begin
  v_name:=trim(public.pr99_sanitize_text(p_payload->>'full_name',160));
  v_phone:=trim(public.pr99_sanitize_text(p_payload->>'whatsapp',40));
  begin
    v_job:=nullif(p_payload->>'job_id','')::bigint;
  exception when others then
    v_job:=null;
  end;
  if length(v_name)<2 or length(regexp_replace(v_phone,'[^0-9]','','g'))<8 then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  v_derived_identity:=regexp_replace(v_phone,'[^0-9]','','g')||':'||coalesce(v_job::text,'any');
  v_guard:=public.pr99_guard_submission('job_application',v_derived_identity,p_payload,p_started_at,p_honeypot);
  if not coalesce((v_guard->>'allowed')::boolean,false) then return v_guard; end if;

  insert into public.job_applications(
    job_id,full_name,country,whatsapp,email,experience,answers,notes,status,internal_notes
  ) values (
    v_job,v_name,
    nullif(public.pr99_sanitize_text(p_payload->>'country',120),''),
    v_phone,
    nullif(lower(public.pr99_sanitize_text(p_payload->>'email',254)),''),
    nullif(public.pr99_sanitize_text(p_payload->>'experience',5000),''),
    case when jsonb_typeof(p_payload->'answers')='object' then p_payload->'answers' else '{}'::jsonb end,
    nullif(public.pr99_sanitize_text(p_payload->>'notes',4000),''),
    'new',null
  ) returning id into v_id;
  return jsonb_build_object('allowed',true,'code','ok','id',v_id);
end;
$$;

create or replace function public.pr99_submit_contact(
  p_payload jsonb,
  p_identity text,
  p_started_at timestamptz,
  p_honeypot text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_guard jsonb;
  v_id bigint;
  v_name text;
  v_message text;
  v_email text;
  v_phone text;
  v_derived_identity text;
begin
  v_name:=trim(public.pr99_sanitize_text(p_payload->>'full_name',160));
  v_message:=trim(public.pr99_sanitize_text(p_payload->>'message',5000));
  v_email:=lower(trim(public.pr99_sanitize_text(p_payload->>'email',254)));
  v_phone:=trim(public.pr99_sanitize_text(p_payload->>'whatsapp',40));
  if length(v_name)<2 or length(v_message)<4 then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  v_derived_identity:=coalesce(
    nullif(v_email,''),
    nullif(regexp_replace(v_phone,'[^0-9]','','g'),''),
    encode(digest(convert_to(lower(v_name)||':'||left(v_message,128),'UTF8'),'sha256'),'hex')
  );
  v_guard:=public.pr99_guard_submission('contact',v_derived_identity,p_payload,p_started_at,p_honeypot);
  if not coalesce((v_guard->>'allowed')::boolean,false) then return v_guard; end if;

  insert into public.contact_messages(full_name,email,whatsapp,subject,message,status)
  values(
    v_name,nullif(v_email,''),nullif(v_phone,''),
    nullif(public.pr99_sanitize_text(p_payload->>'subject',240),''),
    v_message,'new'
  ) returning id into v_id;
  return jsonb_build_object('allowed',true,'code','ok','id',v_id);
end;
$$;

create or replace function public.pr99_submit_ai_support(
  p_payload jsonb,
  p_identity text,
  p_started_at timestamptz,
  p_honeypot text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_guard jsonb;
  v_id bigint;
  v_question text;
  v_phone text;
  v_derived_identity text;
begin
  v_question:=trim(public.pr99_sanitize_text(coalesce(p_payload->>'question',p_payload->>'message'),2000));
  v_phone:=regexp_replace(coalesce(p_payload->>'visitor_whatsapp',''),'[^0-9]','','g');
  if length(v_question)<2 then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  v_derived_identity:=coalesce(
    nullif(v_phone,''),
    nullif(p_payload->>'email_hash',''),
    nullif(p_payload->>'phone_hash',''),
    encode(digest(convert_to(left(lower(v_question),256),'UTF8'),'sha256'),'hex')
  );
  v_guard:=public.pr99_guard_submission('ai_support',v_derived_identity,p_payload,p_started_at,p_honeypot);
  if not coalesce((v_guard->>'allowed')::boolean,false) then return v_guard; end if;

  insert into public.ai_unanswered_questions(
    question,page_url,visitor_info,status,answer,internal_notes,context,source,
    visitor_name,visitor_whatsapp,metadata
  ) values (
    v_question,
    nullif(public.pr99_sanitize_text(p_payload->>'page_url',2000),''),
    jsonb_build_object(
      'email_hash',nullif(p_payload->>'email_hash',''),
      'phone_hash',nullif(p_payload->>'phone_hash','')
    ),
    'new',null,null,
    nullif(public.pr99_sanitize_text(p_payload->>'context',2000),''),
    'public_ai_support',
    nullif(public.pr99_sanitize_text(p_payload->>'visitor_name',160),''),
    nullif(public.pr99_sanitize_text(p_payload->>'visitor_whatsapp',40),''),
    '{}'::jsonb
  ) returning id into v_id;
  return jsonb_build_object('allowed',true,'code','ok','id',v_id);
end;
$$;

create or replace function public.pr100_guard_password_reset(
  p_identity text,
  p_payload jsonb,
  p_started_at timestamptz,
  p_honeypot text default ''
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.pr99_guard_submission(
    'password_reset',
    lower(trim(coalesce(p_payload->>'email',''))),
    p_payload,
    p_started_at,
    p_honeypot
  );
$$;

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
  if p_lookup_type not in ('application', 'service_request') then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_identity := lower(trim(coalesce(p_identity, '')));
  v_fingerprint := lower(trim(coalesce(p_request_fingerprint, '')));

  if length(v_identity) < 8 or length(v_identity) > 160
     or v_fingerprint !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_identity_hash := encode(
    digest(convert_to(p_lookup_type || ':' || v_identity, 'UTF8'), 'sha256'),
    'hex'
  );
  v_fingerprint_hash := encode(
    digest(convert_to(v_fingerprint, 'UTF8'), 'sha256'),
    'hex'
  );

  select count(*) into v_identity_attempts
  from public.public_lookup_guards
  where lookup_type = p_lookup_type
    and identity_hash = v_identity_hash
    and created_at > now() - interval '15 minutes';

  select count(*) into v_fingerprint_attempts
  from public.public_lookup_guards
  where fingerprint_hash = v_fingerprint_hash
    and created_at > now() - interval '1 hour';

  if v_identity_attempts >= 5 or v_fingerprint_attempts >= 30 then
    v_reason := 'rate_limited';
  end if;

  insert into public.public_lookup_guards(
    lookup_type, identity_hash, fingerprint_hash, accepted, reason
  ) values (
    p_lookup_type, v_identity_hash, v_fingerprint_hash, v_reason is null, v_reason
  );

  return jsonb_build_object(
    'allowed', v_reason is null,
    'code', coalesce(v_reason, 'ok')
  );
end;
$$;

drop policy if exists "deny direct lookup guard access" on public.public_lookup_guards;
create policy "deny direct lookup guard access"
on public.public_lookup_guards
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "public reads published pages" on public.pages;
drop policy if exists "admins read all pages" on public.pages;
create policy "public reads published pages"
on public.pages
for select
to anon, authenticated
using (
  is_published = true
  and publishing_status = 'published'
  and (scheduled_publish_at is null or scheduled_publish_at <= now())
  and (scheduled_unpublish_at is null or scheduled_unpublish_at > now())
);
create policy "admins read all pages"
on public.pages
for select
to authenticated
using (public.current_user_is_admin());

revoke execute on function public.current_user_is_admin() from anon;
grant execute on function public.current_user_is_admin() to authenticated;

comment on function public.pr99_guard_submission(text,text,jsonb,timestamptz,text)
is 'Public submission guard with payload-derived identities in caller wrappers, duplicate detection, per-identity limits, and global abuse backstop.';
comment on function public.pr100_guard_public_lookup(text,text,text)
is 'Public lookup guard. Lookup identity is authoritative; fingerprint must be a SHA-256 value and is an additional rate-limit dimension only.';

commit;
