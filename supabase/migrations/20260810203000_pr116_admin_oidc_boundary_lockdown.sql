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
  foreach t in array array["admin_permissions", "agency_applications", "announcements", "contact_messages", "content_translations", "faqs", "gallery_items", "incident_updates", "incidents", "job_applications", "jobs", "marketplace_categories", "marketplace_listing_translations", "marketplace_listings", "marketplace_orders", "media", "pages", "partners", "privacy_requests", "programs", "reviews", "sections", "service_requests", "settings", "sla_policies", "success_stories", "task_assignments", "task_comments", "tasks", "tenant_branding", "tenant_domains", "tenant_feature_flags", "tenant_settings", "tenants", "visual_experience_settings", "white_label_projects", "workflow_definitions", "workflow_steps"] loop
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
  foreach t in array array["admin_permissions", "agency_applications", "announcements", "contact_messages", "content_translations", "faqs", "gallery_items", "incident_updates", "incidents", "job_applications", "jobs", "marketplace_categories", "marketplace_listing_translations", "marketplace_listings", "marketplace_orders", "media", "pages", "partners", "privacy_requests", "programs", "reviews", "sections", "service_requests", "settings", "sla_policies", "success_stories", "task_assignments", "task_comments", "tasks", "tenant_branding", "tenant_domains", "tenant_feature_flags", "tenant_settings", "tenants", "visual_experience_settings", "white_label_projects", "workflow_definitions", "workflow_steps"] loop
    if has_table_privilege('authenticated', format('public.%I',t), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I',t), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I',t), 'DELETE') then
      raise exception 'pr116_authenticated_dml_still_exposed: %', t;
    end if;
  end loop;
end
$pr116_assert$;

commit;
