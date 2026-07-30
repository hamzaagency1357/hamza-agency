-- Restored from supabase_migrations.schema_migrations version 20260729181851.
-- This version is already registered in project fvaurkfnsvsfohpzguho and must not be reapplied there.
-- PR #100 final additive closeout:
-- * JOB/CNT tracking codes and server-only public lookups
-- * user_id-first administrator permissions with a documented legacy fallback
-- * request notifications/audit coverage
-- * guard retention and free in-database backup verification schedules

create or replace function public.pr100_new_job_tracking_code()
returns text
language plpgsql
volatile
set search_path = pg_catalog, public, extensions
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('pr100-job-tracking-code', 0));
  loop
    v_attempt := v_attempt + 1;
    v_code := 'JOB-' || to_char(clock_timestamp(), 'YYYY') || '-' ||
      upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
    exit when not exists (
      select 1 from public.job_applications where tracking_code = v_code
    );
    if v_attempt >= 64 then
      raise exception 'Unable to allocate JOB tracking code' using errcode = '23505';
    end if;
  end loop;
  return v_code;
end;
$$;

create or replace function public.pr100_new_contact_tracking_code()
returns text
language plpgsql
volatile
set search_path = pg_catalog, public, extensions
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('pr100-contact-tracking-code', 0));
  loop
    v_attempt := v_attempt + 1;
    v_code := 'CNT-' || to_char(clock_timestamp(), 'YYYY') || '-' ||
      upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
    exit when not exists (
      select 1 from public.contact_messages where tracking_code = v_code
    );
    if v_attempt >= 64 then
      raise exception 'Unable to allocate CNT tracking code' using errcode = '23505';
    end if;
  end loop;
  return v_code;
end;
$$;

revoke all on function public.pr100_new_job_tracking_code() from public, anon, authenticated;
revoke all on function public.pr100_new_contact_tracking_code() from public, anon, authenticated;

alter table public.job_applications add column if not exists tracking_code text;
alter table public.contact_messages add column if not exists tracking_code text;

do $$
declare
  v_id bigint;
begin
  for v_id in select id from public.job_applications where tracking_code is null order by id loop
    update public.job_applications
    set tracking_code = public.pr100_new_job_tracking_code()
    where id = v_id and tracking_code is null;
  end loop;
  for v_id in select id from public.contact_messages where tracking_code is null order by id loop
    update public.contact_messages
    set tracking_code = public.pr100_new_contact_tracking_code()
    where id = v_id and tracking_code is null;
  end loop;
end;
$$;

alter table public.job_applications
  alter column tracking_code set default public.pr100_new_job_tracking_code(),
  alter column tracking_code set not null;
alter table public.contact_messages
  alter column tracking_code set default public.pr100_new_contact_tracking_code(),
  alter column tracking_code set not null;

create unique index if not exists job_applications_tracking_code_uidx on public.job_applications(tracking_code);
create unique index if not exists contact_messages_tracking_code_uidx on public.contact_messages(tracking_code);
create index if not exists job_applications_created_at_idx on public.job_applications(created_at desc);
create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages(status);

alter table public.job_applications drop constraint if exists job_applications_tracking_code_format_check;
alter table public.job_applications add constraint job_applications_tracking_code_format_check
  check (tracking_code ~ '^JOB-[0-9]{4}-[A-F0-9]{10}$') not valid;
alter table public.job_applications validate constraint job_applications_tracking_code_format_check;
alter table public.contact_messages drop constraint if exists contact_messages_tracking_code_format_check;
alter table public.contact_messages add constraint contact_messages_tracking_code_format_check
  check (tracking_code ~ '^CNT-[0-9]{4}-[A-F0-9]{10}$') not valid;
alter table public.contact_messages validate constraint contact_messages_tracking_code_format_check;

create or replace function public.pr100_touch_request_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists pr100_touch_job_application_updated_at on public.job_applications;
create trigger pr100_touch_job_application_updated_at
before update on public.job_applications
for each row execute function public.pr100_touch_request_updated_at();
drop trigger if exists pr100_touch_contact_message_updated_at on public.contact_messages;
create trigger pr100_touch_contact_message_updated_at
before update on public.contact_messages
for each row execute function public.pr100_touch_request_updated_at();
revoke all on function public.pr100_touch_request_updated_at() from public, anon, authenticated;

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
  v_tracking_code text;
  v_name text;
  v_phone text;
  v_job bigint;
  v_derived_identity text;
begin
  v_name := trim(public.pr99_sanitize_text(p_payload ->> 'full_name', 160));
  v_phone := trim(public.pr99_sanitize_text(p_payload ->> 'whatsapp', 40));
  begin
    v_job := nullif(p_payload ->> 'job_id', '')::bigint;
  exception when others then
    v_job := null;
  end;
  if length(v_name) < 2 or length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;
  v_derived_identity := regexp_replace(v_phone, '[^0-9]', '', 'g') || ':' || coalesce(v_job::text, 'any');
  v_guard := public.pr99_guard_submission('job_application', v_derived_identity, p_payload, p_started_at, p_honeypot);
  if not coalesce((v_guard ->> 'allowed')::boolean, false) then return v_guard; end if;
  insert into public.job_applications(
    job_id, full_name, country, whatsapp, email, experience, answers, notes, status, internal_notes
  ) values (
    v_job,
    v_name,
    nullif(public.pr99_sanitize_text(p_payload ->> 'country', 120), ''),
    v_phone,
    nullif(lower(public.pr99_sanitize_text(p_payload ->> 'email', 254)), ''),
    nullif(public.pr99_sanitize_text(p_payload ->> 'experience', 5000), ''),
    case when jsonb_typeof(p_payload -> 'answers') = 'object' then p_payload -> 'answers' else '{}'::jsonb end,
    nullif(public.pr99_sanitize_text(p_payload ->> 'notes', 4000), ''),
    'new',
    null
  ) returning id, tracking_code into v_id, v_tracking_code;
  return jsonb_build_object('allowed', true, 'code', 'ok', 'id', v_id, 'tracking_code', v_tracking_code);
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
  v_tracking_code text;
  v_name text;
  v_message text;
  v_email text;
  v_phone text;
  v_derived_identity text;
begin
  v_name := trim(public.pr99_sanitize_text(p_payload ->> 'full_name', 160));
  v_message := trim(public.pr99_sanitize_text(p_payload ->> 'message', 5000));
  v_email := lower(trim(public.pr99_sanitize_text(p_payload ->> 'email', 254)));
  v_phone := trim(public.pr99_sanitize_text(p_payload ->> 'whatsapp', 40));
  if length(v_name) < 2 or length(v_message) < 4 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;
  v_derived_identity := coalesce(
    nullif(v_email, ''),
    nullif(regexp_replace(v_phone, '[^0-9]', '', 'g'), ''),
    encode(digest(convert_to(lower(v_name) || ':' || left(v_message, 128), 'UTF8'), 'sha256'), 'hex')
  );
  v_guard := public.pr99_guard_submission('contact', v_derived_identity, p_payload, p_started_at, p_honeypot);
  if not coalesce((v_guard ->> 'allowed')::boolean, false) then return v_guard; end if;
  insert into public.contact_messages(full_name, email, whatsapp, subject, message, status)
  values (
    v_name,
    nullif(v_email, ''),
    nullif(v_phone, ''),
    nullif(public.pr99_sanitize_text(p_payload ->> 'subject', 240), ''),
    v_message,
    'new'
  ) returning id, tracking_code into v_id, v_tracking_code;
  return jsonb_build_object('allowed', true, 'code', 'ok', 'id', v_id, 'tracking_code', v_tracking_code);
end;
$$;

alter table public.public_lookup_guards drop constraint if exists public_lookup_guards_lookup_type_check;
alter table public.public_lookup_guards add constraint public_lookup_guards_lookup_type_check
  check (lookup_type in ('application', 'service_request', 'job_application', 'contact')) not valid;
alter table public.public_lookup_guards validate constraint public_lookup_guards_lookup_type_check;

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

create or replace function public.pr100_public_request_status(p_status text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(coalesce(p_status, 'new'))
    when 'accepted' then 'completed'
    when 'approved' then 'completed'
    when 'completed' then 'completed'
    when 'done' then 'completed'
    when 'rejected' then 'closed'
    when 'declined' then 'closed'
    when 'cancelled' then 'closed'
    when 'closed' then 'closed'
    when 'archived' then 'closed'
    else 'in_progress'
  end;
$$;

create or replace function public.pr100_lookup_public_job_application(p_tracking_code text, p_request_fingerprint text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_code text;
  v_guard jsonb;
  v_record jsonb;
begin
  v_code := upper(regexp_replace(trim(coalesce(p_tracking_code, '')), '[[:space:]]+', '', 'g'));
  if v_code !~ '^JOB-[0-9]{4}-[A-F0-9]{10}$' then return jsonb_build_object('allowed', false, 'code', 'invalid_request'); end if;
  v_guard := public.pr100_guard_public_lookup('job_application', v_code, p_request_fingerprint);
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then return v_guard; end if;
  select jsonb_build_object(
    'tracking_code', application.tracking_code,
    'request_type', 'job_application',
    'status', public.pr100_public_request_status(application.status),
    'created_at', application.created_at,
    'updated_at', application.updated_at,
    'public_title', case when job.is_visible is true and job.status = 'open' then job.title else null end
  ) into v_record
  from public.job_applications as application
  left join public.jobs as job on job.id = application.job_id
  where application.tracking_code = v_code limit 1;
  return jsonb_build_object('allowed', true, 'code', 'ok', 'found', v_record is not null, 'record', v_record);
end;
$$;

create or replace function public.pr100_lookup_public_contact_message(p_tracking_code text, p_request_fingerprint text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_code text;
  v_guard jsonb;
  v_record jsonb;
begin
  v_code := upper(regexp_replace(trim(coalesce(p_tracking_code, '')), '[[:space:]]+', '', 'g'));
  if v_code !~ '^CNT-[0-9]{4}-[A-F0-9]{10}$' then return jsonb_build_object('allowed', false, 'code', 'invalid_request'); end if;
  v_guard := public.pr100_guard_public_lookup('contact', v_code, p_request_fingerprint);
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then return v_guard; end if;
  select jsonb_build_object(
    'tracking_code', message.tracking_code,
    'request_type', 'contact',
    'status', public.pr100_public_request_status(message.status),
    'created_at', message.created_at,
    'updated_at', message.updated_at
  ) into v_record from public.contact_messages as message where message.tracking_code = v_code limit 1;
  return jsonb_build_object('allowed', true, 'code', 'ok', 'found', v_record is not null, 'record', v_record);
end;
$$;

revoke all on function public.pr100_public_request_status(text) from public, anon, authenticated;
revoke all on function public.pr100_lookup_public_job_application(text, text) from public, anon, authenticated;
revoke all on function public.pr100_lookup_public_contact_message(text, text) from public, anon, authenticated;
grant execute on function public.pr100_lookup_public_job_application(text, text) to service_role;
grant execute on function public.pr100_lookup_public_contact_message(text, text) to service_role;

-- The gateway definition below mirrors the deployed service-role-only function.
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
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_body jsonb;
  v_actual_digest text;
  v_now bigint := extract(epoch from clock_timestamp())::bigint;
  v_expected_subject text;
  v_request_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
begin
  if v_request_role <> 'service_role' then return jsonb_build_object('allowed', false, 'code', 'unauthorized_gateway'); end if;
  if p_action is null or p_action not in (
    'application_lookup','service_lookup','job_lookup','contact_lookup','ai_guard','password_reset_guard',
    'application_submit','service_request_submit','job_application_submit','contact_submit','ai_support_submit'
  ) then return jsonb_build_object('allowed', false, 'code', 'invalid_action'); end if;
  if p_timestamp is null or p_timestamp < v_now - 120 or p_timestamp > v_now + 30 then
    return jsonb_build_object('allowed', false, 'code', 'stale_request');
  end if;
  if p_nonce is null or p_nonce !~ '^[A-Za-z0-9_-]{24,80}$' then return jsonb_build_object('allowed', false, 'code', 'invalid_nonce'); end if;
  if p_body is null or octet_length(p_body) > 40000 then return jsonb_build_object('allowed', false, 'code', 'invalid_payload'); end if;
  begin v_body := p_body::jsonb; exception when others then return jsonb_build_object('allowed', false, 'code', 'invalid_payload'); end;
  if jsonb_typeof(v_body) <> 'object' then return jsonb_build_object('allowed', false, 'code', 'invalid_payload'); end if;
  v_actual_digest := encode(digest(convert_to(p_body, 'UTF8'), 'sha256'), 'hex');
  if p_body_digest is null or lower(p_body_digest) <> v_actual_digest then return jsonb_build_object('allowed', false, 'code', 'digest_mismatch'); end if;
  if p_oidc_issuer <> 'https://oidc.vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_audience <> 'https://vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_team_id <> 'team_gu9SOMWlOqS2uvLEZUYEbTPs'
     or p_oidc_project_id <> 'prj_YQw97FRAAwcnpQkudzGr01kXASvN'
     or p_oidc_project <> 'hamza-agency'
     or p_oidc_environment not in ('preview', 'production') then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_claims');
  end if;
  v_expected_subject := 'owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:' || p_oidc_environment;
  if p_oidc_subject <> v_expected_subject then return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_subject'); end if;
  if p_oidc_issued_at is null or p_oidc_expires_at is null or p_oidc_issued_at > v_now + 30 or p_oidc_expires_at <= v_now or p_oidc_expires_at - p_oidc_issued_at > 7200 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_time');
  end if;
  begin
    insert into public.pr100_gateway_nonces(nonce, action, request_timestamp, expires_at)
    values (p_nonce, p_action, p_timestamp, greatest(to_timestamp(p_timestamp), clock_timestamp()) + interval '10 minutes');
  exception when unique_violation then return jsonb_build_object('allowed', false, 'code', 'replay_detected'); end;
  case p_action
    when 'application_lookup' then return public.pr100_lookup_public_agency_application_by_code(v_body ->> 'trackingCode', v_body ->> 'requestFingerprint');
    when 'service_lookup' then return public.pr100_lookup_public_service_request(v_body ->> 'requestCode', v_body ->> 'requestFingerprint');
    when 'job_lookup' then return public.pr100_lookup_public_job_application(v_body ->> 'trackingCode', v_body ->> 'requestFingerprint');
    when 'contact_lookup' then return public.pr100_lookup_public_contact_message(v_body ->> 'trackingCode', v_body ->> 'requestFingerprint');
    when 'ai_guard' then return public.pr100_guard_ai_answer(v_body ->> 'identity', v_body -> 'payload');
    when 'password_reset_guard' then return public.pr100_guard_password_reset(v_body ->> 'identity', v_body -> 'payload', (v_body ->> 'startedAt')::timestamptz, coalesce(v_body ->> 'honeypot', ''));
    when 'application_submit' then return public.pr99_submit_application(v_body -> 'payload', v_body ->> 'identity', (v_body ->> 'startedAt')::timestamptz, coalesce(v_body ->> 'honeypot', ''));
    when 'service_request_submit' then return public.pr99_submit_service_request(v_body -> 'payload', v_body ->> 'identity', (v_body ->> 'startedAt')::timestamptz, coalesce(v_body ->> 'honeypot', ''));
    when 'job_application_submit' then return public.pr99_submit_job_application(v_body -> 'payload', v_body ->> 'identity', (v_body ->> 'startedAt')::timestamptz, coalesce(v_body ->> 'honeypot', ''));
    when 'contact_submit' then return public.pr99_submit_contact(v_body -> 'payload', v_body ->> 'identity', (v_body ->> 'startedAt')::timestamptz, coalesce(v_body ->> 'honeypot', ''));
    when 'ai_support_submit' then return public.pr99_submit_ai_support(v_body -> 'payload', v_body ->> 'identity', (v_body ->> 'startedAt')::timestamptz, coalesce(v_body ->> 'honeypot', ''));
    else return jsonb_build_object('allowed', false, 'code', 'invalid_action');
  end case;
exception when invalid_text_representation or datetime_field_overflow then
  return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
end;
$$;

revoke all on function public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint) from public, anon, authenticated;
grant execute on function public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint) to service_role;

alter table public.admin_permissions add column if not exists admin_user_id bigint references public.admin_users(id) on delete cascade;
update public.admin_permissions as permission set admin_user_id = admin_user.id
from public.admin_users as admin_user
where permission.admin_user_id is null and lower(permission.admin_email) = lower(admin_user.email);
create index if not exists admin_permissions_admin_user_id_idx on public.admin_permissions(admin_user_id);
create unique index if not exists admin_permissions_admin_user_module_uidx on public.admin_permissions(admin_user_id,module_key) where admin_user_id is not null;

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.admin_users admin_user
    where admin_user.is_active is true and (
      admin_user.user_id = (select auth.uid()) or (
        admin_user.user_id is null and lower(admin_user.email) = lower(coalesce((select auth.jwt()) ->> 'email',''))
      )
    )
  );
$$;
create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.admin_users admin_user
    where admin_user.is_active is true and admin_user.role in ('super_admin','deputy_super_admin') and (
      admin_user.user_id = (select auth.uid()) or (
        admin_user.user_id is null and lower(admin_user.email) = lower(coalesce((select auth.jwt()) ->> 'email',''))
      )
    )
  );
$$;
create or replace function public.is_active_platform_admin()
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.admin_users admin_user
    where admin_user.is_active is true and lower(admin_user.role) in ('super_admin','deputy_super_admin') and (
      admin_user.user_id = (select auth.uid()) or (
        admin_user.user_id is null and lower(admin_user.email) = lower(coalesce((select auth.jwt()) ->> 'email',''))
      )
    )
  );
$$;
create or replace function public.current_admin_is_super_admin()
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.admin_users admin_user
    where admin_user.is_active is true and admin_user.role='super_admin' and (
      admin_user.user_id=(select auth.uid()) or (
        admin_user.user_id is null and lower(admin_user.email)=lower(coalesce((select auth.jwt())->>'email',''))
      )
    )
  );
$$;
create or replace function public.current_admin_can_read_operations()
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.admin_users admin_user
    where admin_user.is_active is true and admin_user.role in ('super_admin','deputy_super_admin') and (
      admin_user.user_id=(select auth.uid()) or (
        admin_user.user_id is null and lower(admin_user.email)=lower(coalesce((select auth.jwt())->>'email',''))
      )
    )
  );
$$;

create or replace function public.current_admin_has_module_permission(p_module text,p_action text default 'can_view')
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1
    from public.admin_users admin_user
    left join public.admin_permissions permission
      on permission.module_key=p_module
     and (permission.admin_user_id=admin_user.id or (permission.admin_user_id is null and lower(permission.admin_email)=lower(admin_user.email)))
    where admin_user.is_active is true
      and (admin_user.user_id=(select auth.uid()) or (admin_user.user_id is null and lower(admin_user.email)=lower(coalesce((select auth.jwt())->>'email',''))))
      and (
        admin_user.role='super_admin'
        or (admin_user.role='deputy_super_admin' and (
          permission.module_key is null or permission.can_manage is true or
          case p_action when 'can_create' then permission.can_create when 'can_edit' then permission.can_edit when 'can_delete' then permission.can_delete when 'can_export' then permission.can_export when 'can_manage' then permission.can_manage else permission.can_view end is true
        ))
        or (admin_user.role='program_admin' and (
          permission.can_manage is true or
          case p_action when 'can_create' then permission.can_create when 'can_edit' then permission.can_edit when 'can_delete' then permission.can_delete when 'can_export' then permission.can_export when 'can_manage' then permission.can_manage else permission.can_view end is true
        ))
      )
  );
$$;

create or replace function public.pr99_require_admin()
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_email text;
begin
  select lower(admin_user.email) into v_email
  from public.admin_users admin_user
  where admin_user.is_active is true and (
    admin_user.user_id=(select auth.uid()) or (
      admin_user.user_id is null and lower(admin_user.email)=lower(coalesce((select auth.jwt())->>'email',''))
    )
  )
  order by (admin_user.user_id=(select auth.uid())) desc limit 1;
  if v_email is null then raise exception 'Not authorized' using errcode='42501'; end if;
  return v_email;
end;
$$;

revoke all on function public.current_user_is_admin() from public, anon;
revoke all on function public.is_active_admin() from public, anon;
revoke all on function public.is_active_platform_admin() from public, anon;
revoke all on function public.current_admin_is_super_admin() from public, anon;
revoke all on function public.current_admin_can_read_operations() from public, anon;
revoke all on function public.current_admin_has_module_permission(text,text) from public, anon;
revoke all on function public.pr99_require_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.is_active_platform_admin() to authenticated;
grant execute on function public.current_admin_is_super_admin() to authenticated;
grant execute on function public.current_admin_can_read_operations() to authenticated;
grant execute on function public.current_admin_has_module_permission(text,text) to authenticated;
grant execute on function public.pr99_require_admin() to authenticated;

drop policy if exists "Active platform admins can read admin users" on public.admin_users;
create policy "Active platform admins can read admin users" on public.admin_users for select to authenticated
using (
  user_id=(select auth.uid())
  or (user_id is null and lower(email)=lower(coalesce((select auth.jwt())->>'email','')))
  or public.is_active_platform_admin()
);

drop policy if exists "admin_permissions_select" on public.admin_permissions;
drop policy if exists "admin_permissions_insert" on public.admin_permissions;
drop policy if exists "admin_permissions_update" on public.admin_permissions;
drop policy if exists "admin_permissions_delete" on public.admin_permissions;
create policy "admin_permissions_select" on public.admin_permissions for select to authenticated
using (
  public.current_admin_is_super_admin()
  or exists (
    select 1 from public.admin_users admin_user
    where admin_user.id=admin_permissions.admin_user_id and admin_user.user_id=(select auth.uid()) and admin_user.is_active is true
  )
  or (admin_user_id is null and lower(admin_email)=lower(coalesce((select auth.jwt())->>'email','')))
);
create policy "admin_permissions_insert" on public.admin_permissions for insert to authenticated with check (public.current_admin_is_super_admin());
create policy "admin_permissions_update" on public.admin_permissions for update to authenticated using (public.current_admin_is_super_admin()) with check (public.current_admin_is_super_admin());
create policy "admin_permissions_delete" on public.admin_permissions for delete to authenticated using (public.current_admin_is_super_admin());

drop policy if exists "admins manage contact messages" on public.contact_messages;
drop policy if exists "Admins can read contact messages" on public.contact_messages;
drop policy if exists "Admins can update contact messages" on public.contact_messages;
create policy "Admins can read contact messages" on public.contact_messages for select to authenticated
using (public.current_admin_has_module_permission('contact','can_view'));
create policy "Admins can update contact messages" on public.contact_messages for update to authenticated
using (public.current_admin_has_module_permission('contact','can_edit'))
with check (public.current_admin_has_module_permission('contact','can_edit'));

drop policy if exists "Admins can read service requests" on public.service_requests;
drop policy if exists "Admins can update service requests" on public.service_requests;
create policy "Admins can read service requests" on public.service_requests for select to authenticated using (public.current_user_is_admin());
create policy "Admins can update service requests" on public.service_requests for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "Public can read visible jobs" on public.jobs;
drop policy if exists "Public can read visible open jobs" on public.jobs;
create policy "Public can read visible open jobs" on public.jobs for select to anon using (is_visible is true and status='open');

create or replace function public.pr100_admin_requests_index(
  p_search text default null,
  p_type text default null,
  p_status text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_offset integer default 0,
  p_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $$
declare
  v_admin public.admin_users%rowtype;
  v_search text := left(trim(coalesce(p_search,'')),120);
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_limit integer := least(greatest(coalesce(p_limit,25),1),50);
  v_rows jsonb;
  v_total bigint;
begin
  select admin_user.* into v_admin
  from public.admin_users admin_user
  where admin_user.is_active is true and (
    admin_user.user_id=(select auth.uid()) or (
      admin_user.user_id is null and lower(admin_user.email)=lower(coalesce((select auth.jwt())->>'email',''))
    )
  ) order by (admin_user.user_id=(select auth.uid())) desc limit 1;
  if v_admin.id is null or not public.current_admin_has_module_permission('requests','can_view') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_type is not null and p_type not in ('application','service_request','job_application','contact') then
    raise exception 'Invalid request type' using errcode='22023';
  end if;
  with request_rows as materialized (
    select application.id,application.tracking_code,'application'::text request_type,application.full_name,application.whatsapp,null::text email,application.status,application.created_at,
      coalesce(nullif(to_jsonb(application)->>'updated_at','')::timestamptz,application.created_at) updated_at
    from public.agency_applications application
    where (v_admin.role<>'program_admin' or lower(coalesce(application.platform,''))=lower(coalesce(v_admin.assigned_program,'')))
    union all
    select request.id,request.request_code,'service_request'::text,request.full_name,request.whatsapp,null::text,request.status,request.created_at,coalesce(request.updated_at,request.created_at)
    from public.service_requests request where v_admin.role<>'program_admin'
    union all
    select application.id,application.tracking_code,'job_application'::text,application.full_name,application.whatsapp,application.email,application.status,application.created_at,coalesce(application.updated_at,application.created_at)
    from public.job_applications application where v_admin.role<>'program_admin'
    union all
    select message.id,message.tracking_code,'contact'::text,message.full_name,message.whatsapp,message.email,message.status,message.created_at,coalesce(message.updated_at,message.created_at)
    from public.contact_messages message where v_admin.role<>'program_admin'
  ), filtered as materialized (
    select * from request_rows
    where (p_type is null or request_type=p_type)
      and (p_status is null or status=p_status)
      and (p_from is null or created_at>=p_from)
      and (p_to is null or created_at<p_to)
      and (v_search='' or tracking_code ilike '%'||v_search||'%' or full_name ilike '%'||v_search||'%' or whatsapp ilike '%'||v_search||'%' or email ilike '%'||v_search||'%')
  ), page as (
    select * from filtered order by created_at desc,request_type,id desc offset v_offset limit v_limit
  )
  select coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),(select count(*) from filtered)
  into v_rows,v_total;
  return jsonb_build_object('rows',v_rows,'total',v_total,'offset',v_offset,'limit',v_limit);
end;
$$;
revoke all on function public.pr100_admin_requests_index(text,text,text,timestamptz,timestamptz,integer,integer) from public,anon;
grant execute on function public.pr100_admin_requests_index(text,text,text,timestamptz,timestamptz,integer,integer) to authenticated;

create or replace function public.pr99_enqueue_notification()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_id text := new.id::text;
  v_status text := coalesce(to_jsonb(new)->>'status','new');
  v_tracking_code text := to_jsonb(new)->>'tracking_code';
  v_event text := case when tg_op='INSERT' then 'created' else 'status_changed' end;
  v_key text := tg_table_name||':'||new.id::text||':'||v_event||':'||v_status;
begin
  if tg_op='UPDATE' and coalesce(to_jsonb(old)->>'status','')=v_status then return new; end if;
  insert into public.notifications(
    title,message,type,is_read,recipient_role,notification_key,metadata,is_archived,is_deleted,updated_at,
    event_key,event_type,entity_type,entity_id,occurred_at,href,source_table,source_id,priority
  ) values (
    case tg_table_name when 'agency_applications' then 'طلب انضمام' when 'service_requests' then 'طلب خدمة' else 'طلب وظيفة' end,
    case when tg_op='INSERT' then 'تم استلام سجل جديد'||case when v_tracking_code is null then '.' else ' برقم '||v_tracking_code||'.' end else 'تم تغيير حالة السجل إلى '||v_status||'.' end,
    tg_table_name,false,'admin',v_key,
    jsonb_build_object('operation',tg_op,'status',v_status,'tracking_code',v_tracking_code),
    false,false,now(),v_key,v_event,tg_table_name,v_id,now(),
    case tg_table_name when 'agency_applications' then '/admin/applications' when 'service_requests' then '/admin/service-requests' else '/admin/jobs#job-application-'||v_id end,
    tg_table_name,v_id,case when tg_op='INSERT' then 'high' else 'normal' end
  ) on conflict(event_key) where event_key is not null do nothing;
  return new;
end;
$$;

create or replace function public.pr99_contact_notification()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  insert into public.notifications(
    title,message,type,is_read,recipient_role,notification_key,metadata,is_archived,is_deleted,updated_at,
    event_key,event_type,entity_type,entity_id,occurred_at,href,source_table,source_id,priority
  ) values (
    'رسالة تواصل جديدة','تم استلام رسالة تواصل جديدة برقم '||new.tracking_code||'.','contact',false,'admin',
    'contact_messages:'||new.id||':created',jsonb_build_object('tracking_code',new.tracking_code,'status',new.status),
    false,false,now(),'contact_messages:'||new.id||':created','created','contact_messages',new.id::text,now(),
    '/admin/contact#contact-'||new.id,'contact_messages',new.id::text,'high'
  ) on conflict(event_key) where event_key is not null do nothing;
  return new;
end;
$$;
revoke all on function public.pr99_enqueue_notification() from public,anon,authenticated;
revoke all on function public.pr99_contact_notification() from public,anon,authenticated;
drop trigger if exists pr99_job_application_notification on public.job_applications;
create trigger pr99_job_application_notification after insert or update of status on public.job_applications
for each row execute function public.pr99_enqueue_notification();
drop trigger if exists pr99_contact_notification on public.contact_messages;
create trigger pr99_contact_notification after insert on public.contact_messages
for each row execute function public.pr99_contact_notification();

create or replace function public.pr99_audit_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_email text := lower(coalesce((select auth.jwt())->>'email','system'));
  v_entity_id text;
  v_action text;
  v_old jsonb;
  v_new jsonb;
begin
  v_old := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  v_new := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  v_entity_id := coalesce(v_new->>'id',v_old->>'id','unknown');
  v_action := lower(tg_op)||'_'||tg_table_name;
  if tg_table_name='pages' and tg_op='UPDATE' and coalesce(v_old->>'publishing_status','')<>coalesce(v_new->>'publishing_status','') then v_action:='page_status_changed'; end if;
  if tg_table_name in ('agency_applications','service_requests','job_applications','contact_messages') and tg_op='UPDATE' and coalesce(v_old->>'status','')<>coalesce(v_new->>'status','') then v_action:='request_status_changed'; end if;
  insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,old_data,new_data,metadata,source_route,outcome)
  values (v_email,(select auth.uid()),v_action,tg_table_name,v_entity_id,coalesce(v_old,'{}'::jsonb)::text,coalesce(v_new,'{}'::jsonb)::text,jsonb_build_object('operation',tg_op),'database','success');
  return coalesce(new,old);
end;
$$;
revoke all on function public.pr99_audit_mutation() from public,anon,authenticated;
drop trigger if exists pr99_audit_mutation on public.contact_messages;
create trigger pr99_audit_mutation after insert or update or delete on public.contact_messages
for each row execute function public.pr99_audit_mutation();

create or replace function public.pr100_cleanup_security_guards()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_submission bigint; v_lookup bigint; v_nonces bigint;
begin
  delete from public.public_submission_guards where created_at<now()-interval '90 days'; get diagnostics v_submission=row_count;
  delete from public.public_lookup_guards where created_at<now()-interval '90 days'; get diagnostics v_lookup=row_count;
  delete from public.pr100_gateway_nonces where created_at<now()-interval '90 days' or expires_at<now()-interval '7 days'; get diagnostics v_nonces=row_count;
  return jsonb_build_object('submission_guards',v_submission,'lookup_guards',v_lookup,'gateway_nonces',v_nonces);
end;
$$;
revoke all on function public.pr100_cleanup_security_guards() from public,anon,authenticated;

create or replace function public.pr100_monthly_backup_dry_run()
returns void language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
declare
  v_backup record;
  v_payload jsonb;
  v_without_checksum jsonb;
  v_actual_checksum text;
  v_scope text[];
  v_table text;
  v_before bigint;
  v_backup_count bigint;
  v_summary jsonb := '{}'::jsonb;
begin
  select id,backup_code,details,checksum,scope into v_backup
  from public.backups where status='completed' and details is not null
  order by completed_at desc nulls last,created_at desc limit 1;
  if v_backup.id is null then
    perform public.pr99_scheduled_private_backup();
    select id,backup_code,details,checksum,scope into v_backup
    from public.backups where status='completed' and details is not null
    order by completed_at desc nulls last,created_at desc limit 1;
  end if;
  v_payload:=v_backup.details;
  v_without_checksum:=v_payload-'checksum';
  v_actual_checksum:=encode(digest(convert_to(v_without_checksum::text,'UTF8'),'sha256'),'hex');
  if v_payload->>'format'<>'hamza-agency-private-backup'
     or v_payload->>'project_ref'<>'fvaurkfnsvsfohpzguho'
     or coalesce((v_payload->>'schema_version')::integer,0)<>1
     or coalesce(v_payload->>'checksum','')<>v_actual_checksum
     or coalesce(v_backup.checksum,'')<>v_actual_checksum then
    raise exception 'Scheduled backup validation failed';
  end if;
  select coalesce(array_agg(value),public.pr99_operations_allowlist()) into v_scope
  from jsonb_array_elements_text(coalesce(v_payload->'scope',to_jsonb(v_backup.scope)));
  foreach v_table in array v_scope loop
    execute format('select count(*) from public.%I',v_table) into v_before;
    v_backup_count:=jsonb_array_length(coalesce(v_payload->'entities'->v_table,'[]'::jsonb));
    v_summary:=v_summary||jsonb_build_object(v_table,jsonb_build_object('before',v_before,'backup',v_backup_count,'delta',v_backup_count-v_before));
  end loop;
  insert into public.restore_operations(project_ref,backup_code,mode,status,scope,summary,checksum,created_by,completed_at)
  values ('fvaurkfnsvsfohpzguho',v_backup.backup_code,'dry_run','validated',v_scope,v_summary,v_actual_checksum,'system',now());
end;
$$;
revoke all on function public.pr100_monthly_backup_dry_run() from public,anon,authenticated;

do $$
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in (
      'pr99-private-daily-backup','pr100-private-weekly-backup','pr100-monthly-backup-dry-run','pr100-security-guard-retention'
    );
    perform cron.schedule('pr100-private-weekly-backup','17 2 * * 0','select public.pr99_scheduled_private_backup();');
    perform cron.schedule('pr100-monthly-backup-dry-run','37 3 1 * *','select public.pr100_monthly_backup_dry_run();');
    perform cron.schedule('pr100-security-guard-retention','47 3 * * *','select public.pr100_cleanup_security_guards();');
  end if;
end;
$$;

comment on column public.job_applications.tracking_code is 'Public JOB tracking identifier. No applicant PII is exposed through lookup.';
comment on column public.contact_messages.tracking_code is 'Public CNT tracking identifier. No sender PII or message body is exposed through lookup.';
comment on function public.pr100_lookup_public_job_application(text,text) is 'Server-only JOB lookup returning a public status envelope and an optional visible job title.';
comment on function public.pr100_lookup_public_contact_message(text,text) is 'Server-only CNT lookup returning only tracking code, request type, public status, and timestamps.';
comment on function public.pr100_cleanup_security_guards() is 'Deletes operational guard rows older than 90 days and expired nonces after a safety window.';
comment on function public.pr100_monthly_backup_dry_run() is 'Internal monthly checksum, identity, schema, and entity-count validation of the latest private backup.';
