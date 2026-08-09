-- HAMZA AGENCY PR #116 — Owner-approved additive schema closeout.
-- Additive / non-destructive only. No Production business rows are modified.
-- Production application remains deferred until the PR is approved and the migration is
-- verified by the repository's isolated/schema checks.

begin;

-- ---------------------------------------------------------------------------
-- Program media: keep hero_image_url as the canonical Cover Image.
-- ---------------------------------------------------------------------------
alter table public.programs add column if not exists hero_image_url text;
alter table public.programs add column if not exists mobile_image_url text;
alter table public.programs add column if not exists og_image_url text;
alter table public.programs add column if not exists alt_ar text;
alter table public.programs add column if not exists alt_en text;
alter table public.programs add column if not exists alt_tr text;
alter table public.programs add column if not exists media_display_mode text not null default 'logo';
alter table public.programs add column if not exists detail_layout smallint not null default 1;

do $program_contract$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.programs'::regclass
      and conname='programs_media_display_mode_check'
  ) then
    alter table public.programs add constraint programs_media_display_mode_check
      check (media_display_mode in ('logo','cover','logo_cover')) not valid;
  end if;
  alter table public.programs validate constraint programs_media_display_mode_check;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.programs'::regclass
      and conname='programs_detail_layout_check'
  ) then
    alter table public.programs add constraint programs_detail_layout_check
      check (detail_layout between 1 and 3) not valid;
  end if;
  alter table public.programs validate constraint programs_detail_layout_check;
end
$program_contract$;

comment on column public.programs.hero_image_url is 'Owner-managed canonical program Cover Image.';
comment on column public.programs.mobile_image_url is 'Optional mobile-specific Cover Image override.';
comment on column public.programs.media_display_mode is 'Per-program display mode: logo, cover, or logo_cover.';
comment on column public.programs.detail_layout is 'Per-program public details layout: 1, 2, or 3.';

-- ---------------------------------------------------------------------------
-- Public reviews: keep legacy rows unchanged while allowing the approved flexible form.
-- reviewer_name/content may be omitted; a published review must still contain useful
-- public content (rating or non-empty review content).
-- ---------------------------------------------------------------------------
alter table public.reviews alter column reviewer_name drop not null;
alter table public.reviews alter column content drop not null;

do $review_public_contract$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.reviews'::regclass
      and conname='reviews_rating_range_check'
  ) then
    alter table public.reviews add constraint reviews_rating_range_check
      check (rating is null or rating between 1 and 5) not valid;
  end if;
  alter table public.reviews validate constraint reviews_rating_range_check;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.reviews'::regclass
      and conname='reviews_published_useful_content_check'
  ) then
    alter table public.reviews add constraint reviews_published_useful_content_check
      check (
        status <> 'published'
        or rating is not null
        or nullif(btrim(content),'') is not null
      ) not valid;
  end if;
  alter table public.reviews validate constraint reviews_published_useful_content_check;
end
$review_public_contract$;

-- ---------------------------------------------------------------------------
-- Private review intake. No anonymous table access is granted.
-- ---------------------------------------------------------------------------
create table if not exists public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reviewer_name text,
  rating smallint,
  content text,
  program_id bigint references public.programs(id) on delete set null,
  service_type text,
  contact_method text,
  phone text,
  reference_number text,
  extra_fields jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_review_id bigint references public.reviews(id) on delete set null
);

-- Guard a partially-created table if a development database previously experimented
-- with this schema. These are no-ops on a clean application of this migration.
alter table public.review_submissions add column if not exists tenant_id uuid;
alter table public.review_submissions add column if not exists reviewer_name text;
alter table public.review_submissions add column if not exists rating smallint;
alter table public.review_submissions add column if not exists content text;
alter table public.review_submissions add column if not exists program_id bigint;
alter table public.review_submissions add column if not exists service_type text;
alter table public.review_submissions add column if not exists contact_method text;
alter table public.review_submissions add column if not exists phone text;
alter table public.review_submissions add column if not exists reference_number text;
alter table public.review_submissions add column if not exists extra_fields jsonb not null default '{}'::jsonb;
alter table public.review_submissions add column if not exists status text not null default 'pending';
alter table public.review_submissions add column if not exists created_at timestamptz not null default now();
alter table public.review_submissions add column if not exists updated_at timestamptz not null default now();
alter table public.review_submissions add column if not exists reviewed_at timestamptz;
alter table public.review_submissions add column if not exists reviewed_by uuid;
alter table public.review_submissions add column if not exists published_review_id bigint;

do $submission_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.review_submissions'::regclass
      and conname='review_submissions_rating_check'
  ) then
    alter table public.review_submissions add constraint review_submissions_rating_check
      check (rating is null or rating between 1 and 5) not valid;
  end if;
  alter table public.review_submissions validate constraint review_submissions_rating_check;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.review_submissions'::regclass
      and conname='review_submissions_status_check'
  ) then
    alter table public.review_submissions add constraint review_submissions_status_check
      check (status in ('pending','approved','rejected')) not valid;
  end if;
  alter table public.review_submissions validate constraint review_submissions_status_check;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.review_submissions'::regclass
      and conname='review_submissions_extra_fields_check'
  ) then
    alter table public.review_submissions add constraint review_submissions_extra_fields_check
      check (
        jsonb_typeof(extra_fields)='object'
        and octet_length(extra_fields::text) <= 4000
      ) not valid;
  end if;
  alter table public.review_submissions validate constraint review_submissions_extra_fields_check;
end
$submission_constraints$;

create index if not exists review_submissions_tenant_status_created_idx
  on public.review_submissions(tenant_id,status,created_at desc);
create index if not exists review_submissions_program_idx
  on public.review_submissions(program_id) where program_id is not null;

alter table public.review_submissions enable row level security;
revoke all on public.review_submissions from anon, authenticated;
grant select on public.review_submissions to authenticated;

drop policy if exists "review admins read private submissions" on public.review_submissions;
create policy "review admins read private submissions"
  on public.review_submissions
  for select
  to authenticated
  using (public.current_admin_has_module_permission('reviews','can_view'));

-- ---------------------------------------------------------------------------
-- Extend the existing public submission guard. It stays fail-closed and keeps the
-- project's existing per-identity, duplicate, and global rate limits.
-- ---------------------------------------------------------------------------
alter table public.public_submission_guards
  drop constraint if exists public_submission_guards_form_type_check;
alter table public.public_submission_guards
  add constraint public_submission_guards_form_type_check
  check (form_type in (
    'application','service_request','job_application','contact','ai_support',
    'password_reset','ai_answer','review'
  )) not valid;
alter table public.public_submission_guards
  validate constraint public_submission_guards_form_type_check;

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
as $function$
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
  if p_form_type not in ('application','service_request','job_application','contact','ai_support','password_reset','review') then
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

  if v_reason is null and (v_recent >= 3 or v_hourly >= 8) then v_reason := 'cooldown'; end if;
  if v_reason is null and v_duplicate >= 1 then v_reason := 'duplicate'; end if;
  if v_reason is null and (v_global_recent >= 60 or v_global_hourly >= 240) then v_reason := 'global_cooldown'; end if;

  insert into public.public_submission_guards(
    form_type,identity_hash,payload_hash,accepted,reason
  ) values (
    p_form_type,v_identity_hash,v_payload_hash,v_reason is null,v_reason
  );

  return jsonb_build_object(
    'allowed',v_reason is null,
    'code',case when v_reason is null then 'ok' else 'try_again_later' end
  );
end
$function$;

-- Public callers do not get a direct review RPC. Only the already protected OIDC
-- service-role gateway may execute this function.
create or replace function public.pr99_submit_review(
  p_payload jsonb,
  p_identity text,
  p_started_at timestamptz,
  p_honeypot text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  v_guard jsonb;
  v_id uuid;
  v_tenant_id uuid;
  v_config jsonb := jsonb_build_object(
    'reviewer_name',jsonb_build_object('enabled',true,'required',false),
    'rating',jsonb_build_object('enabled',true,'required',true),
    'content',jsonb_build_object('enabled',true,'required',false),
    'program_id',jsonb_build_object('enabled',false,'required',false),
    'service_type',jsonb_build_object('enabled',false,'required',false),
    'contact_method',jsonb_build_object('enabled',false,'required',false),
    'phone',jsonb_build_object('enabled',false,'required',false),
    'reference_number',jsonb_build_object('enabled',false,'required',false),
    'extra_fields',jsonb_build_object('enabled',false,'required',false)
  );
  v_setting text;
  v_name text;
  v_content text;
  v_service_type text;
  v_contact_method text;
  v_phone text;
  v_reference text;
  v_rating smallint;
  v_program_id bigint;
  v_extra jsonb := '{}'::jsonb;
  v_extra_clean jsonb := '{}'::jsonb;
  v_extra_count integer := 0;
  v_key text;
  v_value jsonb;
  v_clean_value text;
  v_enabled boolean;
  v_required boolean;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_payload) as input_key(key)
    where input_key.key not in (
      'reviewer_name','rating','content','program_id','service_type','contact_method',
      'phone','reference_number','extra_fields'
    )
  ) then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  select setting_value into v_setting
  from public.settings
  where setting_key='review_form_config' and is_public=true
  order by updated_at desc nulls last,id desc
  limit 1;

  if nullif(btrim(coalesce(v_setting,'')),'') is not null then
    begin
      if jsonb_typeof(v_setting::jsonb)='object' then v_config:=v_setting::jsonb; end if;
    exception when others then
      return jsonb_build_object('allowed',false,'code','invalid_configuration');
    end;
  end if;

  -- Name.
  v_enabled := lower(coalesce(v_config#>>'{reviewer_name,enabled}','true'))='true';
  v_required := lower(coalesce(v_config#>>'{reviewer_name,required}','false'))='true';
  if v_enabled then v_name:=nullif(btrim(public.pr99_sanitize_text(p_payload->>'reviewer_name',160)),''); end if;
  if v_required and v_name is null then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  -- Rating.
  v_enabled := lower(coalesce(v_config#>>'{rating,enabled}','true'))='true';
  v_required := lower(coalesce(v_config#>>'{rating,required}','true'))='true';
  if v_enabled and nullif(btrim(coalesce(p_payload->>'rating','')),'') is not null then
    begin v_rating:=(p_payload->>'rating')::smallint; exception when others then v_rating:=null; end;
    if v_rating is null or v_rating not between 1 and 5 then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;
  end if;
  if v_required and v_rating is null then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  -- Review content.
  v_enabled := lower(coalesce(v_config#>>'{content,enabled}','true'))='true';
  v_required := lower(coalesce(v_config#>>'{content,required}','false'))='true';
  if v_enabled then v_content:=nullif(btrim(public.pr99_sanitize_text(p_payload->>'content',3000)),''); end if;
  if v_required and v_content is null then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  -- Program.
  v_enabled := lower(coalesce(v_config#>>'{program_id,enabled}','false'))='true';
  v_required := lower(coalesce(v_config#>>'{program_id,required}','false'))='true';
  if v_enabled and nullif(btrim(coalesce(p_payload->>'program_id','')),'') is not null then
    begin v_program_id:=(p_payload->>'program_id')::bigint; exception when others then v_program_id:=null; end;
    if v_program_id is null or not exists(
      select 1 from public.programs where id=v_program_id and is_visible=true and is_active=true
    ) then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;
  end if;
  if v_required and v_program_id is null then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  -- Optional private-only fields.
  v_enabled := lower(coalesce(v_config#>>'{service_type,enabled}','false'))='true';
  v_required := lower(coalesce(v_config#>>'{service_type,required}','false'))='true';
  if v_enabled then v_service_type:=nullif(btrim(public.pr99_sanitize_text(p_payload->>'service_type',120)),''); end if;
  if v_required and v_service_type is null then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  v_enabled := lower(coalesce(v_config#>>'{contact_method,enabled}','false'))='true';
  v_required := lower(coalesce(v_config#>>'{contact_method,required}','false'))='true';
  if v_enabled then v_contact_method:=nullif(btrim(public.pr99_sanitize_text(p_payload->>'contact_method',80)),''); end if;
  if v_required and v_contact_method is null then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  v_enabled := lower(coalesce(v_config#>>'{phone,enabled}','false'))='true';
  v_required := lower(coalesce(v_config#>>'{phone,required}','false'))='true';
  if v_enabled then v_phone:=nullif(btrim(public.pr99_sanitize_text(p_payload->>'phone',40)),''); end if;
  if v_phone is not null and length(regexp_replace(v_phone,'[^0-9]','','g')) < 7 then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;
  if v_required and v_phone is null then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  v_enabled := lower(coalesce(v_config#>>'{reference_number,enabled}','false'))='true';
  v_required := lower(coalesce(v_config#>>'{reference_number,required}','false'))='true';
  if v_enabled then v_reference:=nullif(btrim(public.pr99_sanitize_text(p_payload->>'reference_number',120)),''); end if;
  if v_required and v_reference is null then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  -- extra_fields is private-only, bounded and allowlisted. Internal workflow keys,
  -- statuses, permissions and arbitrary JSON never pass this boundary.
  v_enabled := lower(coalesce(v_config#>>'{extra_fields,enabled}','false'))='true';
  v_required := lower(coalesce(v_config#>>'{extra_fields,required}','false'))='true';
  if v_enabled and p_payload ? 'extra_fields' then
    v_extra:=p_payload->'extra_fields';
    if jsonb_typeof(v_extra)<>'object' or octet_length(v_extra::text)>2500 then
      return jsonb_build_object('allowed',false,'code','invalid_request');
    end if;
    select count(*) into v_extra_count from jsonb_object_keys(v_extra);
    if v_extra_count>6 then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

    for v_key,v_value in select key,value from jsonb_each(v_extra) loop
      if v_key not in ('email','account_username','order_number','service_notes')
         or jsonb_typeof(v_value)<>'string' then
        return jsonb_build_object('allowed',false,'code','invalid_request');
      end if;
      v_clean_value:=nullif(btrim(public.pr99_sanitize_text(v_value#>>'{}',500)),'');
      if v_clean_value is not null then
        v_extra_clean:=v_extra_clean||jsonb_build_object(v_key,v_clean_value);
      end if;
    end loop;
  end if;
  if v_required and v_extra_clean='{}'::jsonb then return jsonb_build_object('allowed',false,'code','invalid_request'); end if;

  -- A public review can never be approved as an empty shell. Name alone does not count.
  if v_rating is null and v_content is null then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  select id into v_tenant_id
  from public.tenants
  where is_primary=true and status='active'
  order by created_at,id
  limit 1;
  if v_tenant_id is null then return jsonb_build_object('allowed',false,'code','tenant_unavailable'); end if;

  v_guard:=public.pr99_guard_submission('review',p_identity,p_payload,p_started_at,p_honeypot);
  if not coalesce((v_guard->>'allowed')::boolean,false) then return v_guard; end if;

  insert into public.review_submissions(
    tenant_id,reviewer_name,rating,content,program_id,service_type,
    contact_method,phone,reference_number,extra_fields,status
  ) values (
    v_tenant_id,v_name,v_rating,v_content,v_program_id,v_service_type,
    v_contact_method,v_phone,v_reference,v_extra_clean,'pending'
  ) returning id into v_id;

  return jsonb_build_object('allowed',true,'code','ok','id',v_id);
end
$function$;

alter function public.pr99_submit_review(jsonb,text,timestamptz,text) owner to postgres;
revoke all on function public.pr99_submit_review(jsonb,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.pr99_submit_review(jsonb,text,timestamptz,text) to service_role;

-- Transactional moderation. Only an authenticated review admin may decide a private
-- submission. Approval copies ONLY safe public fields into public.reviews.
create or replace function public.pr116_moderate_review_submission(
  p_submission_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_submission public.review_submissions%rowtype;
  v_program_name text;
  v_public_review_id bigint;
begin
  if auth.uid() is null or not public.current_admin_has_module_permission('reviews','can_edit') then
    raise exception 'review_admin_required' using errcode='42501';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'invalid_review_decision' using errcode='22023';
  end if;

  select * into v_submission
  from public.review_submissions
  where id=p_submission_id
  for update;
  if not found then raise exception 'review_submission_not_found' using errcode='22023'; end if;

  if v_submission.status<>'pending' then
    if v_submission.status=p_decision then
      return jsonb_build_object(
        'ok',true,'status',v_submission.status,'publishedReviewId',v_submission.published_review_id
      );
    end if;
    raise exception 'review_submission_already_decided' using errcode='22023';
  end if;

  if p_decision='rejected' then
    update public.review_submissions
    set status='rejected',reviewed_at=now(),reviewed_by=auth.uid(),updated_at=now()
    where id=p_submission_id;
    return jsonb_build_object('ok',true,'status','rejected');
  end if;

  if v_submission.rating is null and nullif(btrim(v_submission.content),'') is null then
    raise exception 'review_has_no_public_content' using errcode='22023';
  end if;

  if v_submission.program_id is not null then
    select name into v_program_name from public.programs where id=v_submission.program_id;
  end if;

  insert into public.reviews(
    reviewer_name,platform,rating,content,is_featured,sort_order,status,is_visible,tenant_id
  ) values (
    nullif(btrim(v_submission.reviewer_name),''),
    nullif(btrim(v_program_name),''),
    v_submission.rating,
    nullif(btrim(v_submission.content),''),
    false,0,'published',true,v_submission.tenant_id
  ) returning id into v_public_review_id;

  update public.review_submissions
  set status='approved',reviewed_at=now(),reviewed_by=auth.uid(),
      published_review_id=v_public_review_id,updated_at=now()
  where id=p_submission_id;

  return jsonb_build_object('ok',true,'status','approved','publishedReviewId',v_public_review_id);
end
$function$;

alter function public.pr116_moderate_review_submission(uuid,text) owner to postgres;
revoke all on function public.pr116_moderate_review_submission(uuid,text) from public,anon;
revoke all on function public.pr116_moderate_review_submission(uuid,text) from authenticated;
grant execute on function public.pr116_moderate_review_submission(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Add review_submit to the existing Vercel OIDC gateway contract.
-- ---------------------------------------------------------------------------
alter table public.pr100_gateway_nonces drop constraint if exists pr100_gateway_nonces_action_check;
alter table public.pr100_gateway_nonces add constraint pr100_gateway_nonces_action_check
  check (action in (
    'application_lookup','service_lookup','job_lookup','contact_lookup','ai_guard','password_reset_guard',
    'application_submit','service_request_submit','job_application_submit','contact_submit','ai_support_submit',
    'review_submit'
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
begin
  if v_request_role <> 'service_role' then
    return jsonb_build_object('allowed', false, 'code', 'unauthorized_gateway');
  end if;

  if p_action is null or p_action not in (
    'application_lookup','service_lookup','job_lookup','contact_lookup','ai_guard','password_reset_guard',
    'application_submit','service_request_submit','job_application_submit','contact_submit','ai_support_submit',
    'review_submit'
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

  begin v_body:=p_body::jsonb;
  exception when others then return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
  end;
  if jsonb_typeof(v_body)<>'object' then return jsonb_build_object('allowed', false, 'code', 'invalid_payload'); end if;

  v_actual_digest:=encode(extensions.digest(convert_to(p_body,'UTF8'),'sha256'),'hex');
  if p_body_digest is null or lower(p_body_digest)<>v_actual_digest then
    return jsonb_build_object('allowed', false, 'code', 'digest_mismatch');
  end if;

  if p_oidc_issuer<>'https://oidc.vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_audience<>'https://vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_team_id<>'team_gu9SOMWlOqS2uvLEZUYEbTPs'
     or p_oidc_project_id<>'prj_YQw97FRAAwcnpQkudzGr01kXASvN'
     or p_oidc_project<>'hamza-agency'
     or p_oidc_environment not in ('preview','production') then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_claims');
  end if;

  v_expected_subject:='owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:'||p_oidc_environment;
  if p_oidc_subject<>v_expected_subject then return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_subject'); end if;
  if p_oidc_issued_at is null or p_oidc_expires_at is null
     or p_oidc_issued_at>v_now+30 or p_oidc_expires_at<=v_now
     or p_oidc_expires_at-p_oidc_issued_at>7200 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_time');
  end if;

  begin
    insert into public.pr100_gateway_nonces(nonce,action,request_timestamp,expires_at)
    values(p_nonce,p_action,p_timestamp,greatest(to_timestamp(p_timestamp),clock_timestamp())+interval '10 minutes');
  exception when unique_violation then
    return jsonb_build_object('allowed', false, 'code', 'replay_detected');
  end;

  case p_action
    when 'application_lookup' then return public.pr100_lookup_public_agency_application_by_code(v_body->>'trackingCode',v_body->>'requestFingerprint');
    when 'service_lookup' then return public.pr100_lookup_public_service_request(v_body->>'requestCode',v_body->>'requestFingerprint');
    when 'job_lookup' then return public.pr100_lookup_public_job_application(v_body->>'trackingCode',v_body->>'requestFingerprint');
    when 'contact_lookup' then return public.pr100_lookup_public_contact_message(v_body->>'trackingCode',v_body->>'requestFingerprint');
    when 'ai_guard' then return public.pr100_guard_ai_answer(v_body->>'identity',v_body->'payload');
    when 'password_reset_guard' then return public.pr100_guard_password_reset(v_body->>'identity',v_body->'payload',(v_body->>'startedAt')::timestamptz,coalesce(v_body->>'honeypot',''));
    when 'application_submit' then return public.pr99_submit_application(v_body->'payload',v_body->>'identity',(v_body->>'startedAt')::timestamptz,coalesce(v_body->>'honeypot',''));
    when 'service_request_submit' then return public.pr99_submit_service_request(v_body->'payload',v_body->>'identity',(v_body->>'startedAt')::timestamptz,coalesce(v_body->>'honeypot',''));
    when 'job_application_submit' then return public.pr99_submit_job_application(v_body->'payload',v_body->>'identity',(v_body->>'startedAt')::timestamptz,coalesce(v_body->>'honeypot',''));
    when 'contact_submit' then return public.pr99_submit_contact(v_body->'payload',v_body->>'identity',(v_body->>'startedAt')::timestamptz,coalesce(v_body->>'honeypot',''));
    when 'ai_support_submit' then return public.pr99_submit_ai_support(v_body->'payload',v_body->>'identity',(v_body->>'startedAt')::timestamptz,coalesce(v_body->>'honeypot',''));
    when 'review_submit' then return public.pr99_submit_review(v_body->'payload',v_body->>'identity',(v_body->>'startedAt')::timestamptz,coalesce(v_body->>'honeypot',''));
    else return jsonb_build_object('allowed', false, 'code', 'invalid_action');
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
) from public,anon,authenticated;
grant execute on function public.pr100_oidc_gateway(
  text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint
) to service_role;

-- ---------------------------------------------------------------------------
-- Post-migration security/compatibility contract. This intentionally fails closed.
-- ---------------------------------------------------------------------------
do $pr116_contract$
declare
  gateway_oid oid;
  review_submit_oid oid;
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='programs' and column_name='hero_image_url')
     or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='programs' and column_name='media_display_mode')
     or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='programs' and column_name='detail_layout') then
    raise exception 'pr116_program_media_columns_missing';
  end if;

  if not exists(select 1 from pg_class where oid='public.review_submissions'::regclass and relrowsecurity=true) then
    raise exception 'pr116_review_submissions_rls_missing';
  end if;
  if has_table_privilege('anon','public.review_submissions','SELECT')
     or has_table_privilege('anon','public.review_submissions','INSERT')
     or has_table_privilege('anon','public.review_submissions','UPDATE')
     or has_table_privilege('anon','public.review_submissions','DELETE') then
    raise exception 'pr116_review_submissions_anon_privilege_exposed';
  end if;
  if has_table_privilege('authenticated','public.review_submissions','INSERT')
     or has_table_privilege('authenticated','public.review_submissions','UPDATE')
     or has_table_privilege('authenticated','public.review_submissions','DELETE') then
    raise exception 'pr116_review_submissions_authenticated_write_exposed';
  end if;

  review_submit_oid:=to_regprocedure('public.pr99_submit_review(jsonb,text,timestamp with time zone,text)');
  if review_submit_oid is null then raise exception 'pr116_review_submit_missing'; end if;
  if not has_function_privilege('service_role',review_submit_oid,'EXECUTE')
     or has_function_privilege('anon',review_submit_oid,'EXECUTE')
     or has_function_privilege('authenticated',review_submit_oid,'EXECUTE') then
    raise exception 'pr116_review_submit_execute_contract_invalid';
  end if;

  gateway_oid:=to_regprocedure('public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)');
  if gateway_oid is null then raise exception 'pr116_gateway_missing'; end if;
  if not has_function_privilege('service_role',gateway_oid,'EXECUTE')
     or has_function_privilege('anon',gateway_oid,'EXECUTE')
     or has_function_privilege('authenticated',gateway_oid,'EXECUTE') then
    raise exception 'pr116_gateway_execute_contract_invalid';
  end if;
end
$pr116_contract$;

comment on table public.review_submissions is 'Private review intake. Never publicly readable; contact/reference data remains private after moderation.';
comment on function public.pr99_submit_review(jsonb,text,timestamptz,text) is 'Validated/rate-limited review intake callable only through the service-role OIDC gateway.';
comment on function public.pr116_moderate_review_submission(uuid,text) is 'Transactional admin moderation; publishes only safe review fields and never copies private contact/reference data.';

commit;
