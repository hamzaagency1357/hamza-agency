begin;

-- PR116 Admin OIDC boundary lockdown. PREPARED ONLY; do not apply to Production without Owner approval.
-- Browser Admin writes have been migrated to Vercel typed routes -> PR116 OIDC Edge gateway.

-- Six-state owner-approved application lifecycle.
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('new','under_review','contacted','accepted','rejected','archived')) not valid;
alter table public.applications validate constraint applications_status_check;

-- Revoke direct browser-role DML only from tables whose Admin mutation paths are now gateway-owned.
do $pr116_tables$
declare t text;
begin
  foreach t in array array['admin_permissions', 'agency_applications', 'announcements', 'contact_messages', 'content_translations', 'faqs', 'gallery_items', 'incident_updates', 'incidents', 'job_applications', 'jobs', 'marketplace_categories', 'marketplace_listing_translations', 'marketplace_listings', 'marketplace_orders', 'media', 'pages', 'partners', 'privacy_requests', 'programs', 'reviews', 'sections', 'service_requests', 'settings', 'sla_policies', 'success_stories', 'task_assignments', 'task_comments', 'tasks', 'tenant_branding', 'tenant_domains', 'tenant_feature_flags', 'tenant_settings', 'tenants', 'visual_experience_settings', 'white_label_projects', 'workflow_definitions', 'workflow_steps'] loop
    execute format('revoke insert, update, delete on table public.%I from authenticated', t);
  end loop;
end
$pr116_tables$;

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

-- Contract assertions: direct browser DML must be gone while service_role remains available.
do $pr116_assert$
declare t text;
begin
  foreach t in array array['admin_permissions', 'agency_applications', 'announcements', 'contact_messages', 'content_translations', 'faqs', 'gallery_items', 'incident_updates', 'incidents', 'job_applications', 'jobs', 'marketplace_categories', 'marketplace_listing_translations', 'marketplace_listings', 'marketplace_orders', 'media', 'pages', 'partners', 'privacy_requests', 'programs', 'reviews', 'sections', 'service_requests', 'settings', 'sla_policies', 'success_stories', 'task_assignments', 'task_comments', 'tasks', 'tenant_branding', 'tenant_domains', 'tenant_feature_flags', 'tenant_settings', 'tenants', 'visual_experience_settings', 'white_label_projects', 'workflow_definitions', 'workflow_steps'] loop
    if has_table_privilege('authenticated', format('public.%I',t), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I',t), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I',t), 'DELETE') then
      raise exception 'pr116_authenticated_dml_still_exposed: %', t;
    end if;
  end loop;
end
$pr116_assert$;

commit;
