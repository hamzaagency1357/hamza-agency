-- Compatibility layer for the reviewed V1 security closeout.
-- Non-destructive: adds optional compatibility columns and BEFORE triggers only.

begin;

-- PublicAiSupport currently writes question/answer/source field names.
-- Preserve that client contract while normalizing into the canonical columns.
alter table public.ai_conversations
  add column if not exists question text,
  add column if not exists answer text,
  add column if not exists source text;

create or replace function public.normalize_public_ai_conversation_insert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.user_message := coalesce(nullif(btrim(new.user_message), ''), nullif(btrim(new.question), ''));
  new.ai_response := coalesce(new.ai_response, new.answer);
  new.question := coalesce(new.question, new.user_message);
  new.answer := coalesce(new.answer, new.ai_response);
  new.metadata := coalesce(new.metadata, '{}'::jsonb)
    || case
         when nullif(btrim(coalesce(new.source, '')), '') is null then '{}'::jsonb
         else jsonb_build_object('source', btrim(new.source))
       end;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.normalize_public_ai_conversation_insert() from public, anon, authenticated;

drop trigger if exists normalize_public_ai_conversation_insert_trigger on public.ai_conversations;
create trigger normalize_public_ai_conversation_insert_trigger
before insert or update on public.ai_conversations
for each row execute function public.normalize_public_ai_conversation_insert();

-- The notifications page detects available columns dynamically. Add the legacy
-- aliases it may persist, then normalize recipient/key fields before RLS checks.
alter table public.notifications
  add column if not exists item_key text,
  add column if not exists state_key text,
  add column if not exists description text,
  add column if not exists content text,
  add column if not exists href text,
  add column if not exists target_url text,
  add column if not exists link text,
  add column if not exists status text,
  add column if not exists priority text,
  add column if not exists source_table text,
  add column if not exists source_id text,
  add column if not exists admin_email text,
  add column if not exists user_email text,
  add column if not exists read boolean,
  add column if not exists archived boolean,
  add column if not exists deleted boolean,
  add column if not exists payload jsonb;

create or replace function public.normalize_notification_state_row()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.notification_key := coalesce(
    nullif(btrim(new.notification_key), ''),
    nullif(btrim(new.item_key), ''),
    nullif(btrim(new.state_key), ''),
    nullif(btrim(coalesce(new.metadata ->> 'notificationKey', '')), '')
  );
  new.recipient_email := lower(coalesce(
    nullif(btrim(new.recipient_email), ''),
    nullif(btrim(new.admin_email), ''),
    nullif(btrim(new.user_email), ''),
    nullif(btrim(coalesce(new.metadata ->> 'adminEmail', '')), '')
  ));
  new.admin_email := coalesce(new.admin_email, new.recipient_email);
  new.user_email := coalesce(new.user_email, new.recipient_email);
  new.is_read := coalesce(new.is_read, new.read, false);
  new.read := new.is_read;
  new.is_archived := coalesce(new.is_archived, new.archived, false);
  new.archived := new.is_archived;
  new.is_deleted := coalesce(new.is_deleted, new.deleted, false);
  new.deleted := new.is_deleted;
  new.metadata := coalesce(new.metadata, new.payload, '{}'::jsonb);
  new.payload := coalesce(new.payload, new.metadata);
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.normalize_notification_state_row() from public, anon, authenticated;

drop trigger if exists normalize_notification_state_row_trigger on public.notifications;
create trigger normalize_notification_state_row_trigger
before insert or update on public.notifications
for each row execute function public.normalize_notification_state_row();

commit;

-- Rollback: drop the two triggers and normalization functions.
-- Compatibility columns are intentionally retained to avoid destructive data loss.
