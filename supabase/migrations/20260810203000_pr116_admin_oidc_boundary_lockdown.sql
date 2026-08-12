begin;

-- PR116 Admin OIDC boundary lockdown. PREPARED ONLY; do not apply to Production without Owner approval.
-- Browser Admin writes use:
-- Browser -> typed Vercel route -> PR116 OIDC Admin Gateway -> verified actor/permission
-- -> service_role server-side PostgREST/RPC/Storage.
--
-- The entity privilege contract below is intentionally machine-readable and is kept in
-- lockstep with generated-dispatch-base.ts by scripts/verify-pr116-admin-entity-privileges.mjs.
-- tenant_admin_audit is intentionally absent because the dispatcher rejects it before runtime.

-- Six-state owner-approved application lifecycle.
alter table public.agency_applications drop constraint if exists applications_status_check;
alter table public.agency_applications add constraint applications_status_check
  check (status in ('new','under_review','contacted','accepted','rejected','archived')) not valid;
alter table public.agency_applications validate constraint applications_status_check;

-- One transaction-local source of truth for every runtime-reachable generated entity action.
create temp table pr116_entity_privilege_contract (
  table_name text primary key,
  methods text[] not null,
  check (cardinality(methods) > 0),
  check (methods <@ array['insert','update','upsert','delete']::text[])
) on commit drop;

-- PR116 GENERATED ENTITY PRIVILEGE CONTRACT BEGIN
insert into pr116_entity_privilege_contract(table_name, methods) values
  ('admin_permissions', array['delete','upsert']::text[]),
  ('agency_applications', array['update']::text[]),
  ('announcements', array['insert','update']::text[]),
  ('contact_messages', array['update']::text[]),
  ('content_translations', array['upsert']::text[]),
  ('faqs', array['insert','update']::text[]),
  ('gallery_items', array['insert','update']::text[]),
  ('incident_updates', array['insert']::text[]),
  ('incidents', array['insert','update']::text[]),
  ('job_applications', array['update']::text[]),
  ('jobs', array['insert','update']::text[]),
  ('marketplace_categories', array['insert']::text[]),
  ('marketplace_listing_translations', array['insert']::text[]),
  ('marketplace_listings', array['insert','update']::text[]),
  ('marketplace_orders', array['update']::text[]),
  ('media', array['delete','insert','update']::text[]),
  ('pages', array['insert','update']::text[]),
  ('partners', array['insert','update']::text[]),
  ('privacy_requests', array['update']::text[]),
  ('programs', array['insert','update']::text[]),
  ('reviews', array['insert','update']::text[]),
  ('sections', array['insert','update']::text[]),
  ('service_requests', array['update']::text[]),
  ('settings', array['insert','update']::text[]),
  ('sla_policies', array['insert']::text[]),
  ('success_stories', array['insert','update']::text[]),
  ('task_assignments', array['insert']::text[]),
  ('task_comments', array['insert']::text[]),
  ('tasks', array['insert','update']::text[]),
  ('tenant_branding', array['upsert']::text[]),
  ('tenant_domains', array['insert']::text[]),
  ('tenant_feature_flags', array['update']::text[]),
  ('tenant_settings', array['upsert']::text[]),
  ('tenants', array['update']::text[]),
  ('visual_experience_settings', array['insert','update']::text[]),
  ('white_label_projects', array['insert','update']::text[]),
  ('workflow_definitions', array['insert','update']::text[]),
  ('workflow_steps', array['insert']::text[]);
-- PR116 GENERATED ENTITY PRIVILEGE CONTRACT END

-- Browser DML is removed and service_role gets only the generated entity verbs.
-- SELECT is always required because PostgREST uses return=representation and may
-- evaluate filters/select/returned fields.
do $pr116_entity_grants$
declare
  r record;
begin
  for r in select table_name, methods from pr116_entity_privilege_contract order by table_name loop
    execute format('revoke insert, update, delete on table public.%I from authenticated', r.table_name);

    -- Normalize pre-existing server DML to this exact generated contract.
    execute format('revoke insert, update, delete on table public.%I from service_role', r.table_name);
    execute format('grant select on table public.%I to service_role', r.table_name);

    if 'insert' = any(r.methods) or 'upsert' = any(r.methods) then
      execute format('grant insert on table public.%I to service_role', r.table_name);
    end if;
    if 'update' = any(r.methods) or 'upsert' = any(r.methods) then
      execute format('grant update on table public.%I to service_role', r.table_name);
    end if;
    if 'delete' = any(r.methods) then
      execute format('grant delete on table public.%I to service_role', r.table_name);
    end if;
  end loop;
end
$pr116_entity_grants$;

-- Derive only sequence/default dependencies of INSERT/UPSERT entity tables.
create temp table pr116_required_sequence_contract (
  sequence_name text primary key
) on commit drop;

insert into pr116_required_sequence_contract(sequence_name)
select distinct pg_get_serial_sequence(format('public.%I', c.table_name), c.column_name)
from information_schema.columns c
join pr116_entity_privilege_contract p on p.table_name=c.table_name
where c.table_schema='public'
  and ('insert'=any(p.methods) or 'upsert'=any(p.methods))
  and pg_get_serial_sequence(format('public.%I', c.table_name), c.column_name) is not null;

do $pr116_sequence_grants$
declare
  r record;
begin
  for r in select sequence_name from pr116_required_sequence_contract order by sequence_name loop
    execute format('revoke usage, select, update on sequence %s from service_role', r.sequence_name);
    execute format('grant usage on sequence %s to service_role', r.sequence_name);
  end loop;
end
$pr116_sequence_grants$;

-- Stateful Admin RPCs are gateway-only. Read-only exceptions are intentionally absent here.
do $pr116_rpcs$
declare r record;
begin
  for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname = any(array['pr3_publish_blog_post', 'pr3_save_blog_post', 'pr3_unpublish_blog_post', 'pr4_notification_action', 'pr4_promote_suggestion', 'pr4_save_knowledge', 'pr4_support_action', 'pr99_backup_dry_run', 'pr99_create_private_backup', 'pr99_mark_notifications_read', 'pr99_permanent_delete_trash', 'pr99_restore_backup', 'pr99_restore_trash', 'pr99_unpublish_page', 'pr116_moderate_review_submission', 'publish_page_builder_page', 'publish_translation_candidate', 'refresh_product_kpis', 'review_translation_candidate', 'save_page_builder_draft', 'save_translation_candidate_fields']) loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;
end
$pr116_rpcs$;

-- Trusted actor bridge for gateway-owned PostgREST calls.
-- Only a service_role-authenticated request may supply these actor headers. Browser roles
-- remain unable to call the protected RPCs directly and spoofed browser headers fail closed.
create or replace function public.pr116_apply_trusted_admin_actor_context()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $pr116_actor$
declare
  v_claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_request_role text := coalesce(v_claims ->> 'role', '');
  v_path text := coalesce(current_setting('request.path', true), '');
  v_rpc_name text := case when v_path like '/rpc/%' then split_part(substr(v_path, 6), '?', 1) else '' end;
  v_user_id_text text := nullif(trim(v_headers ->> 'x-pr116-admin-user-id'), '');
  v_email text := lower(nullif(trim(v_headers ->> 'x-pr116-admin-email'), ''));
  v_user_id uuid;
  v_admin public.admin_users%rowtype;
begin
  if v_request_role <> 'service_role' then
    if v_user_id_text is not null or v_email is not null then
      raise exception 'pr116_untrusted_actor_headers';
    end if;
    return;
  end if;

  -- Ordinary service-role server requests remain unchanged; the actor bridge is opt-in.
  if v_user_id_text is null and v_email is null then return; end if;
  if v_user_id_text is null or v_email is null then raise exception 'pr116_incomplete_actor_context'; end if;
  if v_rpc_name <> all(array[
    'pr3_publish_blog_post','pr3_save_blog_post','pr3_unpublish_blog_post',
    'pr4_notification_action','pr4_promote_suggestion','pr4_save_knowledge','pr4_support_action',
    'pr99_backup_dry_run','pr99_create_private_backup','pr99_mark_notifications_read',
    'pr99_permanent_delete_trash','pr99_restore_backup','pr99_restore_trash','pr99_unpublish_page',
    'pr116_moderate_review_submission','publish_page_builder_page','publish_translation_candidate',
    'refresh_product_kpis','review_translation_candidate','save_page_builder_draft','save_translation_candidate_fields'
  ]) then raise exception 'pr116_actor_context_rpc_not_allowed'; end if;

  begin
    v_user_id := v_user_id_text::uuid;
  exception when invalid_text_representation then
    raise exception 'pr116_invalid_actor_context';
  end;

  select * into v_admin
  from public.admin_users
  where is_active is not false
    and lower(email) = v_email
    and (user_id = v_user_id or user_id is null)
  order by case when user_id = v_user_id then 0 else 1 end
  limit 1;

  if not found then raise exception 'pr116_unverified_actor_context'; end if;

  v_claims := v_claims || jsonb_build_object(
    'role', 'authenticated',
    'sub', v_user_id::text,
    'email', lower(v_admin.email)
  );
  perform set_config('request.jwt.claims', v_claims::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config('request.jwt.claim.email', lower(v_admin.email), true);
end
$pr116_actor$;

revoke all on function public.pr116_apply_trusted_admin_actor_context() from public;
grant execute on function public.pr116_apply_trusted_admin_actor_context() to anon, authenticated, service_role;
alter role authenticator set pgrst.db_pre_request = 'public.pr116_apply_trusted_admin_actor_context';
notify pgrst, 'reload config';

-- Remove only authenticated write policies that explicitly target migrated Admin Storage buckets.
do $pr116_storage$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname='storage' and tablename='objects' and cmd in ('INSERT','UPDATE','DELETE','ALL')
      and ('authenticated' = any(roles) or 'public' = any(roles))
      and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ '(media-library)'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end
$pr116_storage$;

-- Fail-closed contract assertions.
do $pr116_assert$
declare
  r record;
  required_insert boolean;
  required_update boolean;
  required_delete boolean;
begin
  for r in select table_name, methods from pr116_entity_privilege_contract order by table_name loop
    -- A) Browser authenticated must not retain direct Admin DML.
    if has_table_privilege('authenticated', format('public.%I',r.table_name), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I',r.table_name), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I',r.table_name), 'DELETE') then
      raise exception 'pr116_authenticated_dml_still_exposed: %', r.table_name;
    end if;

    required_insert := 'insert'=any(r.methods) or 'upsert'=any(r.methods);
    required_update := 'update'=any(r.methods) or 'upsert'=any(r.methods);
    required_delete := 'delete'=any(r.methods);

    -- B) service_role must match the generated entity contract exactly for mutation verbs.
    if not has_table_privilege('service_role', format('public.%I',r.table_name), 'SELECT') then
      raise exception 'pr116_service_role_select_missing: %', r.table_name;
    end if;
    if has_table_privilege('service_role', format('public.%I',r.table_name), 'INSERT') <> required_insert then
      raise exception 'pr116_service_role_insert_contract_mismatch: %', r.table_name;
    end if;
    if has_table_privilege('service_role', format('public.%I',r.table_name), 'UPDATE') <> required_update then
      raise exception 'pr116_service_role_update_contract_mismatch: %', r.table_name;
    end if;
    if has_table_privilege('service_role', format('public.%I',r.table_name), 'DELETE') <> required_delete then
      raise exception 'pr116_service_role_delete_contract_mismatch: %', r.table_name;
    end if;
  end loop;

  -- C) INSERT/UPSERT sequence dependencies require only USAGE.
  for r in select sequence_name from pr116_required_sequence_contract order by sequence_name loop
    if not has_sequence_privilege('service_role', r.sequence_name, 'USAGE') then
      raise exception 'pr116_service_role_sequence_usage_missing: %', r.sequence_name;
    end if;
    if has_sequence_privilege('service_role', r.sequence_name, 'SELECT')
       or has_sequence_privilege('service_role', r.sequence_name, 'UPDATE') then
      raise exception 'pr116_service_role_sequence_privilege_too_broad: %', r.sequence_name;
    end if;
  end loop;
end
$pr116_assert$;

commit;
