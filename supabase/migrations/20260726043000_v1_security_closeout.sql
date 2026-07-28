-- HAMZA AGENCY V1 security closeout
-- Non-destructive: no table/data deletion, no RLS disable, no owner changes.
-- Rollback notes are included at the end of this migration.

begin;

-- 1) Pin explicit safe search paths without changing function bodies.
alter function public.set_content_translations_updated_at() set search_path = pg_catalog, public;
alter function public.set_white_label_projects_updated_at() set search_path = pg_catalog, public;
alter function public.set_page_builder_sections_updated_at() set search_path = pg_catalog, public;
alter function public.set_version_history_updated_at() set search_path = pg_catalog, public;
alter function public.set_visual_experience_settings_updated_at() set search_path = pg_catalog, public;
alter function public.set_knowledge_base_updated_at() set search_path = pg_catalog, public;
alter function public.set_service_request_code_after_insert() set search_path = pg_catalog, public;
alter function public.set_service_requests_updated_at() set search_path = pg_catalog, public;
alter function public.set_updated_at() set search_path = pg_catalog, public;
alter function public.touch_admin_permissions_updated_at() set search_path = pg_catalog, public;
alter function public.set_ai_support_updated_at() set search_path = pg_catalog, public;

-- Trigger-only SECURITY DEFINER functions must not be callable through RPC.
revoke execute on function public.invalidate_content_translations_on_source_change() from public, anon, authenticated;
revoke execute on function public.mark_translation_revisions_stale_on_source_change() from public, anon, authenticated;
revoke execute on function public.set_service_request_code_after_insert() from public, anon, authenticated;

-- RLS helper functions are needed by signed-in users through policies, never by anon.
revoke execute on function public.is_active_admin() from public, anon;
grant execute on function public.is_active_admin() to authenticated;
revoke execute on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;
revoke execute on function public.current_admin_can_read_operations() from public, anon;
grant execute on function public.current_admin_can_read_operations() to authenticated;
revoke execute on function public.current_admin_is_super_admin() from public, anon;
grant execute on function public.current_admin_is_super_admin() to authenticated;
revoke execute on function public.is_active_platform_admin() from public, anon;
grant execute on function public.is_active_platform_admin() to authenticated;
revoke execute on function public.is_translation_revision_admin() from public, anon;
grant execute on function public.is_translation_revision_admin() to authenticated;
revoke execute on function public.require_translation_revision_admin() from public, anon;
grant execute on function public.require_translation_revision_admin() to authenticated;
revoke execute on function public.create_translation_candidate_draft(text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.create_translation_candidate_draft(text, text, text, text, jsonb, jsonb) to authenticated;
revoke execute on function public.save_translation_candidate_fields(uuid, jsonb) from public, anon;
grant execute on function public.save_translation_candidate_fields(uuid, jsonb) to authenticated;
revoke execute on function public.review_translation_candidate(uuid, text) from public, anon;
grant execute on function public.review_translation_candidate(uuid, text) to authenticated;
revoke execute on function public.publish_translation_candidate(uuid) from public, anon;
grant execute on function public.publish_translation_candidate(uuid) to authenticated;

-- Public translation reader is intentionally retained for published fields only.
revoke execute on function public.read_published_translation_revision_fields(text, text[], text) from public;
grant execute on function public.read_published_translation_revision_fields(text, text[], text) to anon, authenticated;

-- 2) Replace broad write policies with constrained public form policies.
drop policy if exists "allow_public_application_insert" on public.agency_applications;
create policy "allow_public_application_insert"
on public.agency_applications
for insert
to anon, authenticated
with check (
  status = 'new'
  and internal_notes is null
  and length(btrim(full_name)) between 2 and 160
  and length(btrim(country)) between 2 and 120
  and length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) between 8 and 20
  and length(btrim(platform)) between 2 and 120
  and length(coalesce(previous_experience, '')) <= 4000
  and length(coalesce(notes, '')) <= 4000
);

drop policy if exists "Public can create service requests" on public.service_requests;
create policy "Public can create service requests"
on public.service_requests
for insert
to anon, authenticated
with check (
  status = 'new'
  and internal_notes is null
  and request_code ~ '^SR-[0-9]{4}-[A-Z0-9]{6,12}$'
  and length(btrim(full_name)) between 2 and 160
  and length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) between 8 and 20
  and length(btrim(service_type)) between 2 and 120
  and length(coalesce(country, '')) <= 120
  and length(coalesce(platform, '')) <= 120
  and length(coalesce(account_identifier, '')) <= 240
  and length(coalesce(requested_amount, '')) <= 120
  and length(coalesce(notes, '')) <= 4000
);

drop policy if exists "Public can create job applications" on public.job_applications;
create policy "Public can create job applications"
on public.job_applications
for insert
to anon, authenticated
with check (
  status = 'new'
  and internal_notes is null
  and length(btrim(full_name)) between 2 and 160
  and length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) between 8 and 20
  and length(coalesce(country, '')) <= 120
  and length(coalesce(email, '')) <= 254
  and length(coalesce(experience, '')) <= 5000
  and length(coalesce(notes, '')) <= 4000
  and jsonb_typeof(answers) = 'object'
);

drop policy if exists "Public can create unanswered ai questions" on public.ai_unanswered_questions;
create policy "Public can create unanswered ai questions"
on public.ai_unanswered_questions
for insert
to anon, authenticated
with check (
  status = 'new'
  and answer is null
  and internal_notes is null
  and length(btrim(question)) between 2 and 2000
  and length(coalesce(page_url, '')) <= 2000
  and length(coalesce(source, '')) <= 120
  and jsonb_typeof(coalesce(visitor_info, '{}'::jsonb)) = 'object'
  and jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object'
);

drop policy if exists "Public can create ai conversations" on public.ai_conversations;
create policy "Public can create ai conversations"
on public.ai_conversations
for insert
to anon, authenticated
with check (
  status in ('answered', 'escalated')
  and length(btrim(user_message)) between 1 and 2000
  and length(coalesce(ai_response, '')) <= 10000
  and length(coalesce(page_url, '')) <= 2000
  and length(coalesce(visitor_email, '')) <= 254
  and length(coalesce(visitor_whatsapp, '')) <= 40
  and coalesce(escalated_to_whatsapp, false) is false
  and coalesce(escalated, false) is false
  and jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object'
  and jsonb_typeof(coalesce(messages, '[]'::jsonb)) = 'array'
);

-- Only active admins can manage program definitions.
drop policy if exists "allow_authenticated_programs_manage" on public.programs;
create policy "allow_authenticated_programs_manage"
on public.programs
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- 3) Safe public tracking RPCs expose only status fields and never open base tables.
create or replace function public.lookup_public_service_request(p_request_code text)
returns table (
  id bigint,
  request_code text,
  service_type text,
  platform text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    request.id,
    request.request_code,
    request.service_type,
    request.platform,
    request.status,
    request.created_at,
    request.updated_at
  from public.service_requests as request
  where length(btrim(coalesce(p_request_code, ''))) between 8 and 32
    and request.request_code = upper(regexp_replace(btrim(p_request_code), '[[:space:]]+', '', 'g'))
  order by request.created_at desc
  limit 1;
$$;
revoke execute on function public.lookup_public_service_request(text) from public;
grant execute on function public.lookup_public_service_request(text) to anon, authenticated;

create or replace function public.lookup_public_agency_application(
  p_whatsapp text,
  p_platform text
)
returns table (
  id bigint,
  whatsapp text,
  platform text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    application.id,
    '0000' || right(regexp_replace(application.whatsapp, '[^0-9]', '', 'g'), 4) as whatsapp,
    application.platform,
    application.status,
    application.created_at
  from public.agency_applications as application
  where length(regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g')) between 8 and 20
    and regexp_replace(application.whatsapp, '[^0-9]', '', 'g') = regexp_replace(p_whatsapp, '[^0-9]', '', 'g')
    and (
      (btrim(p_platform) = 'منصة أخرى' and lower(application.platform) not in ('tiktok', 'bigo live', 'yaahlan', 'xena', 'catchii'))
      or lower(btrim(application.platform)) = lower(btrim(p_platform))
    )
  order by application.created_at desc
  limit 1;
$$;
revoke execute on function public.lookup_public_agency_application(text, text) from public;
grant execute on function public.lookup_public_agency_application(text, text) to anon, authenticated;

-- 4) Prevent public bucket enumeration. Direct URLs for the existing public bucket remain functional.
drop policy if exists "Public can view media library files" on storage.objects;

-- 5) Add recipient identity fields and explicit RLS policies for notifications.
alter table public.notifications
  add column if not exists recipient_user_id uuid,
  add column if not exists recipient_email text,
  add column if not exists notification_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists is_archived boolean not null default false,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists notifications_recipient_key_uidx
  on public.notifications (lower(recipient_email), notification_key)
  where recipient_email is not null and notification_key is not null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_recipient_or_top_admin" on public.notifications;
create policy "notifications_select_recipient_or_top_admin"
on public.notifications
for select
to authenticated
using (
  auth.uid() is not null
  and (
    recipient_user_id = auth.uid()
    or lower(coalesce(recipient_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.current_admin_is_super_admin()
  )
);

drop policy if exists "notifications_insert_authorized_admin" on public.notifications;
create policy "notifications_insert_authorized_admin"
on public.notifications
for insert
to authenticated
with check (
  auth.uid() is not null
  and public.current_user_is_admin()
  and recipient_email is not null
  and length(btrim(recipient_email)) between 3 and 254
  and notification_key is not null
  and length(btrim(notification_key)) between 3 and 240
);

drop policy if exists "notifications_update_recipient_or_top_admin" on public.notifications;
create policy "notifications_update_recipient_or_top_admin"
on public.notifications
for update
to authenticated
using (
  auth.uid() is not null
  and (
    recipient_user_id = auth.uid()
    or lower(coalesce(recipient_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.current_admin_is_super_admin()
  )
)
with check (
  auth.uid() is not null
  and (
    recipient_user_id = auth.uid()
    or lower(coalesce(recipient_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.current_admin_is_super_admin()
  )
);

drop policy if exists "notifications_delete_top_admin" on public.notifications;
create policy "notifications_delete_top_admin"
on public.notifications
for delete
to authenticated
using (auth.uid() is not null and public.current_admin_is_super_admin());

revoke all on table public.notifications from anon;
grant select, insert, update, delete on table public.notifications to authenticated;

commit;

-- Rollback path (manual, reviewed, run only if a verified regression occurs):
-- 1. Drop lookup_public_service_request(text) and lookup_public_agency_application(text,text).
-- 2. Drop the four notifications policies and the notifications_recipient_key_uidx index.
-- 3. Restore prior public form/program policies from the preceding migration history.
-- 4. Recreate storage policy "Public can view media library files" only if public listing is intentionally required.
-- 5. ALTER FUNCTION ... RESET search_path and restore prior EXECUTE grants only where verified necessary.
-- Added notification columns are intentionally retained during rollback to avoid destructive data loss.
