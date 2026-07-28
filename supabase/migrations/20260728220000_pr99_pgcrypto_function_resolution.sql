begin;

-- Supabase installs pgcrypto in the extensions schema. These SECURITY DEFINER
-- functions keep an explicit, non-user-controlled search path while allowing
-- digest() and gen_random_bytes() to resolve at runtime.
alter function public.pr99_guard_submission(text,text,jsonb,timestamptz,text)
  set search_path = pg_catalog, public, extensions;
alter function public.pr99_submit_service_request(jsonb,text,timestamptz,text)
  set search_path = pg_catalog, public, extensions;
alter function public.pr99_create_private_backup(text[],text,text)
  set search_path = pg_catalog, public, extensions;
alter function public.pr99_backup_dry_run(jsonb,text[])
  set search_path = pg_catalog, public, extensions;
alter function public.pr99_scheduled_private_backup()
  set search_path = pg_catalog, public, extensions;

comment on function public.pr99_create_private_backup(text[],text,text) is
  'Creates a project-scoped private backup with checksum; pgcrypto is resolved only from the extensions schema.';

commit;
