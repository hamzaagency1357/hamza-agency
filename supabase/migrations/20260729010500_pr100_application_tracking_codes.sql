begin;

alter table public.agency_applications
  add column if not exists tracking_code text;

update public.agency_applications
set tracking_code = 'APP-'
  || to_char(coalesce(created_at, now()), 'YYYY')
  || '-'
  || upper(substr(md5(id::text || ':' || coalesce(created_at::text, '')), 1, 10))
where tracking_code is null or trim(tracking_code) = '';

alter table public.agency_applications
  alter column tracking_code set not null;

create unique index if not exists agency_applications_tracking_code_uidx
  on public.agency_applications(tracking_code);

create or replace function public.pr99_submit_application(
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
  v_country text;
  v_phone text;
  v_platform text;
  v_derived_identity text;
  v_tracking_code text;
  v_attempt integer;
begin
  v_name := trim(public.pr99_sanitize_text(p_payload ->> 'full_name', 160));
  v_country := trim(public.pr99_sanitize_text(p_payload ->> 'country', 120));
  v_phone := trim(public.pr99_sanitize_text(p_payload ->> 'whatsapp', 40));
  v_platform := trim(public.pr99_sanitize_text(p_payload ->> 'platform', 120));

  if length(v_name) < 2
     or length(v_country) < 2
     or length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8
     or length(v_platform) < 2 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_derived_identity := regexp_replace(v_phone, '[^0-9]', '', 'g') || ':' || lower(v_platform);
  v_guard := public.pr99_guard_submission(
    'application',
    v_derived_identity,
    p_payload,
    p_started_at,
    p_honeypot
  );
  if not coalesce((v_guard ->> 'allowed')::boolean, false) then
    return v_guard;
  end if;

  for v_attempt in 1..5 loop
    v_tracking_code := 'APP-'
      || to_char(now(), 'YYYY')
      || '-'
      || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));

    begin
      insert into public.agency_applications(
        tracking_code,
        full_name,
        country,
        whatsapp,
        platform,
        previous_experience,
        notes,
        status,
        internal_notes
      ) values (
        v_tracking_code,
        v_name,
        v_country,
        v_phone,
        v_platform,
        nullif(public.pr99_sanitize_text(p_payload ->> 'previous_experience', 4000), ''),
        nullif(public.pr99_sanitize_text(p_payload ->> 'notes', 4000), ''),
        'new',
        null
      ) returning id into v_id;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then
        raise;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'id', v_id,
    'tracking_code', v_tracking_code
  );
end;
$$;

create or replace function public.pr100_lookup_public_agency_application_by_code(
  p_tracking_code text,
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
  v_code := upper(regexp_replace(trim(coalesce(p_tracking_code, '')), '[[:space:]]+', '', 'g'));

  if v_code !~ '^APP-[0-9]{4}-[A-F0-9]{10}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_guard := public.pr100_guard_public_lookup(
    'application',
    v_code,
    p_request_fingerprint
  );
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then
    return v_guard;
  end if;

  select jsonb_build_object(
    'tracking_code', application.tracking_code,
    'platform', application.platform,
    'status', application.status,
    'created_at', application.created_at
  )
  into v_record
  from public.agency_applications as application
  where application.tracking_code = v_code
  limit 1;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'found', v_record is not null,
    'record', v_record
  );
end;
$$;

revoke all on function public.pr100_lookup_public_agency_application_by_code(text, text)
  from public;
grant execute on function public.pr100_lookup_public_agency_application_by_code(text, text)
  to anon, authenticated;

comment on column public.agency_applications.tracking_code
is 'Public tracking code shown to the applicant and used instead of WhatsApp for status lookup.';

comment on function public.pr100_lookup_public_agency_application_by_code(text, text)
is 'Privacy-preserving public application lookup by tracking code only.';

commit;
