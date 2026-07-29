begin;

create table if not exists public.pr100_gateway_nonces (
  nonce text primary key,
  action text not null,
  request_timestamp bigint not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint pr100_gateway_nonces_action_check check (action in (
    'application_lookup','service_lookup','ai_guard','password_reset_guard',
    'application_submit','service_request_submit','job_application_submit',
    'contact_submit','ai_support_submit'
  )),
  constraint pr100_gateway_nonces_nonce_check check (nonce ~ '^[A-Za-z0-9_-]{24,80}$')
);

alter table public.pr100_gateway_nonces enable row level security;
alter table public.pr100_gateway_nonces force row level security;
revoke select, insert, update, delete on table public.pr100_gateway_nonces from public, anon, authenticated;

create index if not exists pr100_gateway_nonces_expires_at_idx
  on public.pr100_gateway_nonces(expires_at);

create or replace function public.pr100_server_gateway(
  p_action text,
  p_timestamp bigint,
  p_nonce text,
  p_body text,
  p_body_digest text,
  p_signature text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, vault
as $$
declare
  v_secret text;
  v_body jsonb;
  v_actual_digest text;
  v_canonical text;
  v_expected bytea;
  v_supplied bytea;
  v_diff integer := 0;
  v_i integer;
  v_now bigint := extract(epoch from clock_timestamp())::bigint;
begin
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

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'PR100_RPC_SIGNING_SECRET'
  order by updated_at desc
  limit 1;
  if v_secret is null or length(v_secret) < 32 then
    raise exception 'PR100 signed gateway is not configured' using errcode = '55000';
  end if;

  v_canonical := p_action || E'\n' || p_timestamp::text || E'\n' || p_nonce || E'\n' || v_actual_digest;
  v_expected := extensions.hmac(convert_to(v_canonical, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256');
  begin
    v_supplied := decode(lower(p_signature), 'hex');
  exception when others then
    return jsonb_build_object('allowed', false, 'code', 'invalid_signature');
  end;
  if octet_length(v_supplied) <> octet_length(v_expected) then
    return jsonb_build_object('allowed', false, 'code', 'invalid_signature');
  end if;
  for v_i in 0..octet_length(v_expected)-1 loop
    v_diff := v_diff | (get_byte(v_supplied, v_i) # get_byte(v_expected, v_i));
  end loop;
  if v_diff <> 0 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_signature');
  end if;

  begin
    insert into public.pr100_gateway_nonces(nonce, action, request_timestamp, expires_at)
    values (p_nonce, p_action, p_timestamp, to_timestamp(p_timestamp) + interval '10 minutes');
  exception when unique_violation then
    return jsonb_build_object('allowed', false, 'code', 'replay_detected');
  end;

  case p_action
    when 'application_lookup' then
      return public.pr100_lookup_public_agency_application_by_code(
        v_body->>'trackingCode', v_body->>'requestFingerprint'
      );
    when 'service_lookup' then
      return public.pr100_lookup_public_service_request(
        v_body->>'requestCode', v_body->>'requestFingerprint'
      );
    when 'ai_guard' then
      return public.pr100_guard_ai_answer(v_body->>'identity', v_body->'payload');
    when 'password_reset_guard' then
      return public.pr100_guard_password_reset(
        v_body->>'identity', v_body->'payload', (v_body->>'startedAt')::timestamptz,
        coalesce(v_body->>'honeypot','')
      );
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

revoke execute on function public.pr100_server_gateway(text,bigint,text,text,text,text) from public;
grant execute on function public.pr100_server_gateway(text,bigint,text,text,text,text) to anon, authenticated;

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;
revoke usage, select, update on all sequences in schema public from anon;

revoke select on table
  public.activity_logs,
  public.admin_permissions,
  public.admin_users,
  public.agency_applications,
  public.ai_conversations,
  public.ai_unanswered_questions,
  public.backups,
  public.contact_messages,
  public.content_translation_revision_fields,
  public.content_translation_revisions,
  public.job_applications,
  public.notifications,
  public.permissions,
  public.program_admins,
  public.public_lookup_guards,
  public.public_submission_guards,
  public.restore_operations,
  public.role_permissions,
  public.roles,
  public.service_requests,
  public.translation_source_revisions,
  public.trash_items,
  public.users,
  public.version_history,
  public.white_label_projects
from anon;

create index if not exists content_translation_revision_fields_created_by_idx
  on public.content_translation_revision_fields(created_by);
create index if not exists content_translation_revision_fields_updated_by_idx
  on public.content_translation_revision_fields(updated_by);
create index if not exists content_translation_revisions_created_by_idx
  on public.content_translation_revisions(created_by);
create index if not exists content_translation_revisions_published_by_idx
  on public.content_translation_revisions(published_by);
create index if not exists content_translation_revisions_reviewed_by_idx
  on public.content_translation_revisions(reviewed_by);
create index if not exists content_translation_revisions_source_revision_idx
  on public.content_translation_revisions(source_type, source_id, source_revision_id);
create index if not exists content_translation_revisions_supersedes_idx
  on public.content_translation_revisions(supersedes_translation_revision_id);
create index if not exists job_applications_job_id_idx
  on public.job_applications(job_id);
create index if not exists role_permissions_permission_id_idx
  on public.role_permissions(permission_id);
create index if not exists translation_source_revisions_created_by_idx
  on public.translation_source_revisions(created_by);
create index if not exists translation_source_revisions_previous_idx
  on public.translation_source_revisions(previous_source_revision_id);

drop index if exists public.section_templates_template_key_idx;

commit;
