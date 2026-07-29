begin;

alter table public.admin_users
  add column if not exists user_id uuid references auth.users(id) on delete restrict;

update public.admin_users as admin_user
set user_id = auth_user.id
from auth.users as auth_user
where admin_user.user_id is null
  and lower(admin_user.email) = lower(auth_user.email);

create unique index if not exists admin_users_user_id_unique_idx
  on public.admin_users(user_id)
  where user_id is not null;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active = true
      and (
        admin_user.user_id = auth.uid()
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      )
  );
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active = true
      and admin_user.role in ('super_admin', 'deputy_super_admin')
      and (
        admin_user.user_id = auth.uid()
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce(
              auth.email(),
              auth.jwt() ->> 'email',
              current_setting('request.jwt.claim.email', true),
              ''
            )
          )
        )
      )
  );
$$;

revoke all on function public.current_user_is_admin() from public;
revoke all on function public.is_active_admin() from public;
grant execute on function public.current_user_is_admin() to anon, authenticated;
grant execute on function public.is_active_admin() to authenticated;

create table if not exists public.public_lookup_guards (
  id uuid primary key default gen_random_uuid(),
  lookup_type text not null check (lookup_type in ('application', 'service_request')),
  identity_hash text not null,
  fingerprint_hash text not null,
  accepted boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.public_lookup_guards enable row level security;
revoke all on table public.public_lookup_guards from public, anon, authenticated;

create index if not exists public_lookup_guards_identity_recent_idx
  on public.public_lookup_guards(lookup_type, identity_hash, created_at desc);
create index if not exists public_lookup_guards_fingerprint_recent_idx
  on public.public_lookup_guards(fingerprint_hash, created_at desc);

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
     or length(v_fingerprint) < 32 or length(v_fingerprint) > 160 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_identity_hash := encode(digest(convert_to(p_lookup_type || ':' || v_identity, 'UTF8'), 'sha256'), 'hex');
  v_fingerprint_hash := encode(digest(convert_to(v_fingerprint, 'UTF8'), 'sha256'), 'hex');

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
    lookup_type,
    identity_hash,
    fingerprint_hash,
    accepted,
    reason
  ) values (
    p_lookup_type,
    v_identity_hash,
    v_fingerprint_hash,
    v_reason is null,
    v_reason
  );

  return jsonb_build_object(
    'allowed', v_reason is null,
    'code', coalesce(v_reason, 'ok')
  );
end;
$$;

create or replace function public.pr100_lookup_public_agency_application(
  p_whatsapp text,
  p_platform text,
  p_request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_digits text;
  v_platform text;
  v_guard jsonb;
  v_record jsonb;
begin
  v_digits := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  v_platform := trim(coalesce(p_platform, ''));

  if length(v_digits) not between 8 and 20
     or length(v_platform) not between 2 and 80 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_guard := public.pr100_guard_public_lookup(
    'application',
    v_digits || ':' || lower(v_platform),
    p_request_fingerprint
  );
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then
    return v_guard;
  end if;

  select to_jsonb(application_record)
  into v_record
  from public.lookup_public_agency_application(v_digits, v_platform) as application_record
  limit 1;

  if v_record is not null then
    v_record := v_record - 'whatsapp';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'found', v_record is not null,
    'record', v_record
  );
end;
$$;

create or replace function public.pr100_lookup_public_service_request(
  p_request_code text,
  p_request_fingerprint text
)
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
  v_code := upper(regexp_replace(trim(coalesce(p_request_code, '')), '[[:space:]]+', '', 'g'));
  if length(v_code) not between 8 and 32 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_guard := public.pr100_guard_public_lookup(
    'service_request',
    v_code,
    p_request_fingerprint
  );
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then
    return v_guard;
  end if;

  select to_jsonb(service_record)
  into v_record
  from public.lookup_public_service_request(v_code) as service_record
  limit 1;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'found', v_record is not null,
    'record', v_record
  );
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
    p_identity,
    p_payload,
    p_started_at,
    p_honeypot
  );
$$;

alter table public.public_submission_guards
  drop constraint if exists public_submission_guards_form_type_check;
alter table public.public_submission_guards
  add constraint public_submission_guards_form_type_check
  check (form_type in (
    'application',
    'service_request',
    'job_application',
    'contact',
    'ai_support',
    'password_reset',
    'ai_answer'
  ));

create or replace function public.pr100_guard_ai_answer(
  p_identity text,
  p_payload jsonb
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
  v_duplicate integer;
  v_reason text;
begin
  if length(trim(coalesce(p_identity, ''))) < 32
     or length(coalesce(p_payload::text, '')) > 5000 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_identity_hash := encode(
    digest(convert_to(lower(trim(p_identity)) || ':ai_answer', 'UTF8'), 'sha256'),
    'hex'
  );
  v_payload_hash := encode(
    digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select count(*) into v_recent
  from public.public_submission_guards
  where form_type = 'ai_answer'
    and identity_hash = v_identity_hash
    and created_at > now() - interval '15 minutes';

  select count(*) into v_duplicate
  from public.public_submission_guards
  where form_type = 'ai_answer'
    and payload_hash = v_payload_hash
    and accepted = true
    and created_at > now() - interval '5 minutes';

  if v_recent >= 12 then
    v_reason := 'cooldown';
  elsif v_duplicate >= 3 then
    v_reason := 'duplicate';
  end if;

  insert into public.public_submission_guards(
    form_type,
    identity_hash,
    payload_hash,
    accepted,
    reason
  ) values (
    'ai_answer',
    v_identity_hash,
    v_payload_hash,
    v_reason is null,
    v_reason
  );

  return jsonb_build_object(
    'allowed', v_reason is null,
    'code', case when v_reason is null then 'ok' else 'try_again_later' end
  );
end;
$$;

revoke all on function public.lookup_public_agency_application(text, text) from public, anon, authenticated;
revoke all on function public.lookup_public_service_request(text) from public, anon, authenticated;
revoke all on function public.pr99_guard_submission(text, text, jsonb, timestamptz, text) from public, anon, authenticated;
revoke all on function public.pr100_guard_public_lookup(text, text, text) from public, anon, authenticated;

revoke all on function public.pr100_lookup_public_agency_application(text, text, text) from public;
revoke all on function public.pr100_lookup_public_service_request(text, text) from public;
revoke all on function public.pr100_guard_password_reset(text, jsonb, timestamptz, text) from public;
revoke all on function public.pr100_guard_ai_answer(text, jsonb) from public;

grant execute on function public.pr100_lookup_public_agency_application(text, text, text) to anon, authenticated;
grant execute on function public.pr100_lookup_public_service_request(text, text) to anon, authenticated;
grant execute on function public.pr100_guard_password_reset(text, jsonb, timestamptz, text) to anon, authenticated;
grant execute on function public.pr100_guard_ai_answer(text, jsonb) to anon, authenticated;

drop policy if exists "Public can read visible sections" on public.sections;
drop policy if exists "Public can read published sections" on public.sections;

drop policy if exists "Public can read published pages" on public.pages;
drop policy if exists "public reads published pages" on public.pages;
create policy "public reads published pages"
on public.pages
for select
to anon, authenticated
using (
  (
    is_published = true
    and publishing_status = 'published'
    and (scheduled_publish_at is null or scheduled_publish_at <= now())
    and (scheduled_unpublish_at is null or scheduled_unpublish_at > now())
  )
  or public.current_user_is_admin()
);

drop policy if exists "Public can read visible page builder sections" on public.page_builder_sections;
create policy "public reads visible sections of published pages"
on public.page_builder_sections
for select
to anon, authenticated
using (
  is_visible = true
  and exists (
    select 1
    from public.pages as page_record
    where page_record.id = page_builder_sections.page_id
      and page_record.is_published = true
      and page_record.publishing_status = 'published'
      and (page_record.scheduled_publish_at is null or page_record.scheduled_publish_at <= now())
      and (page_record.scheduled_unpublish_at is null or page_record.scheduled_unpublish_at > now())
  )
);

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ]::text[]
where id = 'media-library';

commit;
