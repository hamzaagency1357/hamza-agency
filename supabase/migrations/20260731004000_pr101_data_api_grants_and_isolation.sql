-- HAMZA AGENCY PR101 Data API grants and tenant isolation completion
-- RLS remains the authorization boundary; server-only provider evidence remains non-writable by clients.
begin;

-- Public catalogue and legal reads are explicitly limited by their existing published-row policies.
grant select on public.marketplace_categories,public.marketplace_listings,public.marketplace_listing_translations,public.marketplace_reviews,public.legal_policy_versions to anon;

-- Tenant administration and portal identity.
grant select,update on public.tenants to authenticated;
grant select,insert,update,delete on public.tenant_domains,public.tenant_branding,public.tenant_settings,public.tenant_feature_flags to authenticated;
grant select,insert,update on public.tenant_memberships,public.portal_profiles to authenticated;
grant select,insert on public.tenant_admin_audit to authenticated;

-- Tasks, SLA and workflow operations.
grant select,insert,update,delete on public.tasks,public.task_assignments,public.sla_policies,public.sla_events,public.workflow_definitions,public.workflow_steps,public.workflow_runs,public.workflow_events to authenticated;
grant select,insert on public.task_comments,public.task_attachments to authenticated;
grant select on public.task_status_history to authenticated;

-- Marketplace and manual/offline commerce.
grant select on public.marketplace_categories,public.marketplace_listings,public.marketplace_listing_translations,public.marketplace_reviews to authenticated;
grant insert,update,delete on public.marketplace_categories,public.marketplace_listings,public.marketplace_listing_translations to authenticated;
grant select,insert,update on public.marketplace_orders,public.marketplace_order_items,public.marketplace_reviews,public.marketplace_disputes,public.payment_refunds to authenticated;
grant select,insert,update,delete on public.marketplace_carts,public.marketplace_cart_items,public.marketplace_favorites to authenticated;

-- User-controlled privacy, files, communication preferences and sessions.
grant select,insert,update on public.portal_files,public.portal_notification_preferences,public.communication_consents,public.push_subscriptions,public.privacy_requests,public.user_sessions to authenticated;
grant select,update on public.security_alerts to authenticated;

-- Staff-visible operations. Provider event writes remain server-only.
grant select on public.payment_providers,public.payment_intents,public.payment_transactions,public.payment_webhook_events,public.provider_message_events,public.provider_health_checks to authenticated;
grant insert,update on public.payment_providers to authenticated;
grant select,insert,update,delete on public.whatsapp_templates,public.incidents,public.incident_updates,public.legal_policy_versions to authenticated;
grant select,insert,update on public.product_kpi_daily to authenticated;
grant select on public.ai_sessions,public.ai_messages,public.ai_knowledge_documents to authenticated;

grant usage,select on all sequences in schema public to authenticated;

-- Portal files are owner-scoped; tenant staff can manage only within their tenant.
drop policy if exists "owners add portal files" on public.portal_files;
create policy "owners add portal files" on public.portal_files for insert to authenticated
with check (
  owner_user_id=(select auth.uid())
  and public.current_user_has_tenant_role(tenant_id,array['creator','client','employee','partner','tenant_admin','super_admin'])
);
drop policy if exists "owners update portal files" on public.portal_files;
create policy "owners update portal files" on public.portal_files for update to authenticated
using (owner_user_id=(select auth.uid()))
with check (owner_user_id=(select auth.uid()));
drop policy if exists "tenant staff manage portal files" on public.portal_files;
create policy "tenant staff manage portal files" on public.portal_files for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

-- Assigned participants and tenant operations staff can attach files to tasks.
drop policy if exists "task participants add attachments" on public.task_attachments;
create policy "task participants add attachments" on public.task_attachments for insert to authenticated
with check (
  uploaded_by=(select auth.uid())
  and (
    public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee'])
    or exists(select 1 from public.task_assignments a where a.task_id=task_attachments.task_id and a.user_id=(select auth.uid()))
  )
);
drop policy if exists "task staff remove attachments" on public.task_attachments;
create policy "task staff remove attachments" on public.task_attachments for delete to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

-- Commerce evidence is readable only by the order owner or tenant operations staff.
drop policy if exists "users read own payment intents" on public.payment_intents;
create policy "users read own payment intents" on public.payment_intents for select to authenticated
using (
  public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee'])
  or exists(select 1 from public.marketplace_orders o where o.id=payment_intents.order_id and o.client_user_id=(select auth.uid()) and o.tenant_id=payment_intents.tenant_id)
);
drop policy if exists "users read own payment transactions" on public.payment_transactions;
create policy "users read own payment transactions" on public.payment_transactions for select to authenticated
using (
  public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee'])
  or exists(
    select 1 from public.payment_intents pi
    join public.marketplace_orders o on o.id=pi.order_id
    where pi.id=payment_transactions.intent_id and pi.tenant_id=payment_transactions.tenant_id and o.client_user_id=(select auth.uid())
  )
);
drop policy if exists "users read own refunds" on public.payment_refunds;
create policy "users read own refunds" on public.payment_refunds for select to authenticated
using (
  public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee'])
  or exists(select 1 from public.marketplace_orders o where o.id=payment_refunds.order_id and o.client_user_id=(select auth.uid()) and o.tenant_id=payment_refunds.tenant_id)
);
drop policy if exists "tenant staff manage refunds" on public.payment_refunds;
create policy "tenant staff manage refunds" on public.payment_refunds for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
drop policy if exists "tenant staff update refunds" on public.payment_refunds;
create policy "tenant staff update refunds" on public.payment_refunds for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
drop policy if exists "tenant staff read payment webhooks" on public.payment_webhook_events;
create policy "tenant staff read payment webhooks" on public.payment_webhook_events for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

-- Client-side configuration can never activate a live payment provider.
drop policy if exists "tenant admins insert disabled payment providers" on public.payment_providers;
create policy "tenant admins insert disabled payment providers" on public.payment_providers for insert to authenticated
with check (
  mode in ('disabled','manual','sandbox')
  and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin'])
);
drop policy if exists "tenant admins update nonlive payment providers" on public.payment_providers;
create policy "tenant admins update nonlive payment providers" on public.payment_providers for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (
  mode in ('disabled','manual','sandbox')
  and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin'])
);

-- AI records and tenant knowledge are readable only in the matching tenant scope.
drop policy if exists "tenant staff read ai knowledge" on public.ai_knowledge_documents;
create policy "tenant staff read ai knowledge" on public.ai_knowledge_documents for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

-- Legal policy drafts remain tenant-admin only while the published policy remains public.
drop policy if exists "tenant staff read legal drafts" on public.legal_policy_versions;
create policy "tenant staff read legal drafts" on public.legal_policy_versions for select to authenticated
using (status='published' or public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

comment on table public.payment_webhook_events is 'Client reads are tenant-admin scoped; inserts remain available only through the signed server gateway.';
comment on table public.provider_message_events is 'Client reads are operations scoped; queue writes remain server-only and idempotent.';

commit;
