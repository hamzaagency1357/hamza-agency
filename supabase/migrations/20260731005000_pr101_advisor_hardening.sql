-- HAMZA AGENCY PR101 advisor hardening
-- Consolidates overlapping product policies, adds FK indexes, and makes server-only tables explicitly deny direct client access.
begin;

-- Explicit server-only policy evidence. Service-role and database-owner execution continue to bypass RLS.
drop policy if exists "deny direct consent record access" on public.consent_records;
create policy "deny direct consent record access" on public.consent_records for all to anon,authenticated
using (false) with check (false);
drop policy if exists "deny direct pr101 nonce access" on public.pr101_gateway_nonces;
create policy "deny direct pr101 nonce access" on public.pr101_gateway_nonces for all to anon,authenticated
using (false) with check (false);
drop policy if exists "deny direct pr100 nonce access" on public.pr100_gateway_nonces;
create policy "deny direct pr100 nonce access" on public.pr100_gateway_nonces for all to anon,authenticated
using (false) with check (false);

-- Communication preferences: one policy per action.
drop policy if exists "users manage communication consent" on public.communication_consents;
drop policy if exists "tenant staff read communication consent" on public.communication_consents;
create policy "communication consent select" on public.communication_consents for select to authenticated
using (user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "communication consent insert own" on public.communication_consents for insert to authenticated
with check (user_id=(select auth.uid()));
create policy "communication consent update own" on public.communication_consents for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "communication consent delete own" on public.communication_consents for delete to authenticated
using (user_id=(select auth.uid()));

drop policy if exists "owners manage notification preferences" on public.portal_notification_preferences;
drop policy if exists "tenant staff read notification preferences" on public.portal_notification_preferences;
create policy "notification preferences select" on public.portal_notification_preferences for select to authenticated
using (user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "notification preferences insert own" on public.portal_notification_preferences for insert to authenticated
with check (user_id=(select auth.uid()));
create policy "notification preferences update own" on public.portal_notification_preferences for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "notification preferences delete own" on public.portal_notification_preferences for delete to authenticated
using (user_id=(select auth.uid()));

-- Portal files: owners and operations staff are expressed in single action policies.
drop policy if exists "owners read portal files" on public.portal_files;
drop policy if exists "owners add portal files" on public.portal_files;
drop policy if exists "owners update portal files" on public.portal_files;
drop policy if exists "tenant staff manage portal files" on public.portal_files;
create policy "portal files select" on public.portal_files for select to authenticated
using (owner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "portal files insert" on public.portal_files for insert to authenticated
with check (
  (owner_user_id=(select auth.uid()) and public.current_user_has_tenant_role(tenant_id,array['creator','client','employee','partner','tenant_admin','super_admin']))
  or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee'])
);
create policy "portal files update" on public.portal_files for update to authenticated
using (owner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (owner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "portal files delete staff" on public.portal_files for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
grant delete on public.portal_files to authenticated;

-- Task policies without overlapping ALL/SELECT rules.
drop policy if exists "tenant members read tasks" on public.tasks;
drop policy if exists "tenant staff manage tasks" on public.tasks;
create policy "tasks select" on public.tasks for select to authenticated
using (
  public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee'])
  or exists(select 1 from public.task_assignments ta where ta.task_id=tasks.id and ta.user_id=(select auth.uid()))
);
create policy "tasks insert staff" on public.tasks for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tasks update staff" on public.tasks for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tasks delete staff" on public.tasks for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

drop policy if exists "task members read assignments" on public.task_assignments;
drop policy if exists "task staff manage assignments" on public.task_assignments;
create policy "task assignments select" on public.task_assignments for select to authenticated
using (user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "task assignments insert staff" on public.task_assignments for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "task assignments update staff" on public.task_assignments for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "task assignments delete staff" on public.task_assignments for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

-- Tenant configuration policies. Secret tenant settings are never client-readable.
drop policy if exists "tenant members read branding" on public.tenant_branding;
drop policy if exists "tenant admins manage branding" on public.tenant_branding;
create policy "tenant branding select" on public.tenant_branding for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','creator','client','employee','partner']));
create policy "tenant branding insert admin" on public.tenant_branding for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant branding update admin" on public.tenant_branding for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant branding delete admin" on public.tenant_branding for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

drop policy if exists "tenant members read domains" on public.tenant_domains;
drop policy if exists "tenant admins manage domains" on public.tenant_domains;
create policy "tenant domains select" on public.tenant_domains for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant domains insert admin" on public.tenant_domains for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant domains update admin" on public.tenant_domains for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant domains delete admin" on public.tenant_domains for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

drop policy if exists "tenant members read feature flags" on public.tenant_feature_flags;
drop policy if exists "tenant admins manage feature flags" on public.tenant_feature_flags;
create policy "tenant flags select" on public.tenant_feature_flags for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','creator','client','employee','partner']));
create policy "tenant flags insert admin" on public.tenant_feature_flags for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant flags update admin" on public.tenant_feature_flags for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant flags delete admin" on public.tenant_feature_flags for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

drop policy if exists "tenant admins read settings" on public.tenant_settings;
drop policy if exists "tenant admins manage public settings" on public.tenant_settings;
create policy "tenant public settings select admin" on public.tenant_settings for select to authenticated
using (is_secret=false and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant public settings insert admin" on public.tenant_settings for insert to authenticated
with check (is_secret=false and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant public settings update admin" on public.tenant_settings for update to authenticated
using (is_secret=false and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (is_secret=false and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant public settings delete admin" on public.tenant_settings for delete to authenticated
using (is_secret=false and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

-- Marketplace read/write separation keeps public access published-only and prevents overlapping authenticated policies.
drop policy if exists "public reads published categories" on public.marketplace_categories;
drop policy if exists "tenant staff manage categories" on public.marketplace_categories;
create policy "anon reads active categories" on public.marketplace_categories for select to anon using (active=true);
create policy "authenticated reads tenant categories" on public.marketplace_categories for select to authenticated
using (active=true or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant staff insert categories" on public.marketplace_categories for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant staff update categories" on public.marketplace_categories for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant staff delete categories" on public.marketplace_categories for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));

drop policy if exists "public reads published listings" on public.marketplace_listings;
drop policy if exists "tenant sellers manage listings" on public.marketplace_listings;
create policy "anon reads published listings" on public.marketplace_listings for select to anon using (status='published');
create policy "authenticated reads tenant listings" on public.marketplace_listings for select to authenticated
using (status='published' or partner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant sellers insert listings" on public.marketplace_listings for insert to authenticated
with check (partner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant sellers update listings" on public.marketplace_listings for update to authenticated
using (partner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (partner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant sellers delete listings" on public.marketplace_listings for delete to authenticated
using (partner_user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

drop policy if exists "public reads listing translations" on public.marketplace_listing_translations;
drop policy if exists "tenant sellers manage translations" on public.marketplace_listing_translations;
create policy "anon reads published listing translations" on public.marketplace_listing_translations for select to anon
using (exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.status='published'));
create policy "authenticated reads listing translations" on public.marketplace_listing_translations for select to authenticated
using (
  exists(select 1 from public.marketplace_listings l where l.id=listing_id and (l.status='published' or l.partner_user_id=(select auth.uid())))
  or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner'])
);
create policy "tenant sellers insert translations" on public.marketplace_listing_translations for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant sellers update translations" on public.marketplace_listing_translations for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant sellers delete translations" on public.marketplace_listing_translations for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));

drop policy if exists "public reads published reviews" on public.marketplace_reviews;
create policy "anon reads published reviews" on public.marketplace_reviews for select to anon using (status='published');
create policy "authenticated reads published reviews" on public.marketplace_reviews for select to authenticated
using (status='published' or user_id=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

drop policy if exists "owners read cart items" on public.marketplace_cart_items;
drop policy if exists "clients add cart items" on public.marketplace_cart_items;
create policy "cart items select own" on public.marketplace_cart_items for select to authenticated
using (exists(select 1 from public.marketplace_carts c where c.id=cart_id and c.user_id=(select auth.uid())));
create policy "cart items insert own" on public.marketplace_cart_items for insert to authenticated
with check (exists(select 1 from public.marketplace_carts c where c.id=cart_id and c.user_id=(select auth.uid())));
create policy "cart items update own" on public.marketplace_cart_items for update to authenticated
using (exists(select 1 from public.marketplace_carts c where c.id=cart_id and c.user_id=(select auth.uid())))
with check (exists(select 1 from public.marketplace_carts c where c.id=cart_id and c.user_id=(select auth.uid())));
create policy "cart items delete own" on public.marketplace_cart_items for delete to authenticated
using (exists(select 1 from public.marketplace_carts c where c.id=cart_id and c.user_id=(select auth.uid())));

drop policy if exists "tenant staff manage disputes" on public.marketplace_disputes;
drop policy if exists "users read own disputes" on public.marketplace_disputes;
create policy "disputes select" on public.marketplace_disputes for select to authenticated
using (opened_by=(select auth.uid()) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "clients open disputes" on public.marketplace_disputes for insert to authenticated
with check (
  opened_by=(select auth.uid())
  and exists(select 1 from public.marketplace_orders o where o.id=order_id and o.tenant_id=marketplace_disputes.tenant_id and o.client_user_id=(select auth.uid()))
);
create policy "tenant staff update disputes" on public.marketplace_disputes for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

drop policy if exists "tenant staff manage order items" on public.marketplace_order_items;
drop policy if exists "clients insert own order items" on public.marketplace_order_items;
drop policy if exists "clients read order items" on public.marketplace_order_items;
create policy "order items select" on public.marketplace_order_items for select to authenticated
using (exists(select 1 from public.marketplace_orders o where o.id=order_id and o.tenant_id=marketplace_order_items.tenant_id and (o.client_user_id=(select auth.uid()) or public.current_user_has_tenant_role(o.tenant_id,array['super_admin','tenant_admin','employee','partner']))));
create policy "order items insert" on public.marketplace_order_items for insert to authenticated
with check (exists(select 1 from public.marketplace_orders o where o.id=order_id and o.tenant_id=marketplace_order_items.tenant_id and (o.client_user_id=(select auth.uid()) or public.current_user_has_tenant_role(o.tenant_id,array['super_admin','tenant_admin','employee']))));
create policy "order items update staff" on public.marketplace_order_items for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "order items delete staff" on public.marketplace_order_items for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
grant delete on public.marketplace_order_items to authenticated;

-- Legal, WhatsApp and workflow policies are split by operation.
drop policy if exists "public reads published legal versions" on public.legal_policy_versions;
drop policy if exists "tenant staff read legal drafts" on public.legal_policy_versions;
drop policy if exists "tenant admins manage legal versions" on public.legal_policy_versions;
create policy "anon reads published legal versions" on public.legal_policy_versions for select to anon using (status='published');
create policy "authenticated reads legal versions" on public.legal_policy_versions for select to authenticated
using (status='published' or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant admins insert legal versions" on public.legal_policy_versions for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant admins update legal versions" on public.legal_policy_versions for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant admins delete legal versions" on public.legal_policy_versions for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

drop policy if exists "tenant staff read approved whatsapp templates" on public.whatsapp_templates;
drop policy if exists "tenant admins manage whatsapp templates" on public.whatsapp_templates;
create policy "whatsapp templates select" on public.whatsapp_templates for select to authenticated
using ((status='approved' and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee'])) or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant admins insert whatsapp templates" on public.whatsapp_templates for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant admins update whatsapp templates" on public.whatsapp_templates for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant admins delete whatsapp templates" on public.whatsapp_templates for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

drop policy if exists "tenant staff read workflow runs" on public.workflow_runs;
drop policy if exists "tenant staff manage workflow runs" on public.workflow_runs;
create policy "workflow runs select" on public.workflow_runs for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "workflow runs insert" on public.workflow_runs for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "workflow runs update" on public.workflow_runs for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "workflow runs delete" on public.workflow_runs for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

drop policy if exists "tenant staff read provider health" on public.provider_health_checks;
drop policy if exists "tenant operations read provider health" on public.provider_health_checks;
create policy "provider health select" on public.provider_health_checks for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

-- Foreign-key indexes identified by the post-migration Performance Advisor.
create index if not exists ai_messages_session_id_idx on public.ai_messages(session_id);
create index if not exists ai_sessions_tenant_id_idx on public.ai_sessions(tenant_id);
create index if not exists ai_sessions_user_id_idx on public.ai_sessions(user_id);
create index if not exists communication_consents_user_id_idx on public.communication_consents(user_id);
create index if not exists consent_records_tenant_id_idx on public.consent_records(tenant_id);
create index if not exists consent_records_user_id_idx on public.consent_records(user_id);
create index if not exists incident_updates_created_by_idx on public.incident_updates(created_by);
create index if not exists incident_updates_incident_id_idx on public.incident_updates(incident_id);
create index if not exists incident_updates_tenant_id_idx on public.incident_updates(tenant_id);
create index if not exists incidents_owner_id_idx on public.incidents(owner_id);
create index if not exists legal_policy_versions_created_by_idx on public.legal_policy_versions(created_by);
create index if not exists marketplace_cart_items_listing_id_idx on public.marketplace_cart_items(listing_id);
create index if not exists marketplace_carts_user_id_idx on public.marketplace_carts(user_id);
create index if not exists marketplace_disputes_opened_by_idx on public.marketplace_disputes(opened_by);
create index if not exists marketplace_disputes_order_id_idx on public.marketplace_disputes(order_id);
create index if not exists marketplace_disputes_tenant_id_idx on public.marketplace_disputes(tenant_id);
create index if not exists marketplace_favorites_tenant_id_idx on public.marketplace_favorites(tenant_id);
create index if not exists marketplace_favorites_user_id_idx on public.marketplace_favorites(user_id);
create index if not exists marketplace_listing_translations_tenant_id_idx on public.marketplace_listing_translations(tenant_id);
create index if not exists marketplace_listings_category_id_idx on public.marketplace_listings(category_id);
create index if not exists marketplace_listings_partner_user_id_idx on public.marketplace_listings(partner_user_id);
create index if not exists marketplace_order_items_listing_id_idx on public.marketplace_order_items(listing_id);
create index if not exists marketplace_order_items_order_id_idx on public.marketplace_order_items(order_id);
create index if not exists marketplace_order_items_tenant_id_idx on public.marketplace_order_items(tenant_id);
create index if not exists marketplace_orders_client_user_id_idx on public.marketplace_orders(client_user_id);
create index if not exists marketplace_reviews_order_id_idx on public.marketplace_reviews(order_id);
create index if not exists marketplace_reviews_tenant_id_idx on public.marketplace_reviews(tenant_id);
create index if not exists marketplace_reviews_user_id_idx on public.marketplace_reviews(user_id);
create index if not exists payment_intents_order_id_idx on public.payment_intents(order_id);
create index if not exists payment_intents_provider_id_idx on public.payment_intents(provider_id);
create index if not exists payment_refunds_created_by_idx on public.payment_refunds(created_by);
create index if not exists payment_refunds_order_id_idx on public.payment_refunds(order_id);
create index if not exists payment_refunds_tenant_id_idx on public.payment_refunds(tenant_id);
create index if not exists payment_refunds_transaction_id_idx on public.payment_refunds(transaction_id);
create index if not exists payment_transactions_intent_id_idx on public.payment_transactions(intent_id);
create index if not exists portal_files_owner_user_id_idx on public.portal_files(owner_user_id);
create index if not exists portal_files_tenant_id_idx on public.portal_files(tenant_id);
create index if not exists portal_notification_preferences_user_id_idx on public.portal_notification_preferences(user_id);
create index if not exists privacy_requests_user_id_idx on public.privacy_requests(user_id);
create index if not exists provider_message_events_user_id_idx on public.provider_message_events(user_id);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists security_alerts_user_id_idx on public.security_alerts(user_id);
create index if not exists sla_events_policy_id_idx on public.sla_events(policy_id);
create index if not exists sla_policies_tenant_id_idx on public.sla_policies(tenant_id);
create index if not exists task_assignments_user_id_idx on public.task_assignments(user_id);
create index if not exists task_attachments_task_id_idx on public.task_attachments(task_id);
create index if not exists task_attachments_tenant_id_idx on public.task_attachments(tenant_id);
create index if not exists task_attachments_uploaded_by_idx on public.task_attachments(uploaded_by);
create index if not exists task_comments_author_id_idx on public.task_comments(author_id);
create index if not exists task_comments_task_id_idx on public.task_comments(task_id);
create index if not exists task_status_history_changed_by_idx on public.task_status_history(changed_by);
create index if not exists task_status_history_task_id_idx on public.task_status_history(task_id);
create index if not exists task_status_history_tenant_id_idx on public.task_status_history(tenant_id);
create index if not exists tasks_created_by_idx on public.tasks(created_by);
create index if not exists tasks_sla_policy_id_idx on public.tasks(sla_policy_id);
create index if not exists tenant_admin_audit_actor_id_idx on public.tenant_admin_audit(actor_id);
create index if not exists user_sessions_revoked_by_idx on public.user_sessions(revoked_by);
create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);
create index if not exists workflow_definitions_created_by_idx on public.workflow_definitions(created_by);
create index if not exists workflow_events_run_id_idx on public.workflow_events(run_id);
create index if not exists workflow_events_step_id_idx on public.workflow_events(step_id);
create index if not exists workflow_runs_workflow_id_idx on public.workflow_runs(workflow_id);
create index if not exists workflow_steps_tenant_id_idx on public.workflow_steps(tenant_id);

comment on policy "tenant public settings select admin" on public.tenant_settings is 'Secrets are never returned through the authenticated Data API.';
comment on policy "deny direct consent record access" on public.consent_records is 'Consent writes use the verified Vercel OIDC gateway only.';

commit;
