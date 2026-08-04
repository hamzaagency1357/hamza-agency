-- HAMZA AGENCY PR101 tenant administration RLS matrix
-- Additive and transactional. Existing administrator identities are linked without deleting data.
begin;

insert into public.tenant_memberships(tenant_id,user_id,role,status,permissions,mfa_required)
select t.id,a.user_id,
  case when a.role='super_admin' then 'super_admin' else 'tenant_admin' end,
  'active',
  jsonb_build_object('source','admin_users_backfill'),
  a.role in ('super_admin','deputy_super_admin')
from public.admin_users a
cross join lateral (select id from public.tenants where is_primary=true limit 1) t
where a.user_id is not null and a.is_active=true and a.role in ('super_admin','deputy_super_admin')
on conflict (tenant_id,user_id,role) do update set status='active',mfa_required=excluded.mfa_required;

create or replace function private.can_manage_tenant_member(target_tenant uuid,target_role text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists(
    select 1 from public.tenant_memberships me
    where me.tenant_id=target_tenant and me.user_id=(select auth.uid()) and me.status='active'
      and (
        me.role='super_admin'
        or (me.role='tenant_admin' and target_role in ('creator','client','employee','partner'))
      )
  );
$$;
revoke all on function private.can_manage_tenant_member(uuid,text) from public;
grant execute on function private.can_manage_tenant_member(uuid,text) to authenticated;

create policy "tenant admins update tenant" on public.tenants
for update to authenticated
using (public.current_user_has_tenant_role(id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(id,array['super_admin','tenant_admin']));

create policy "tenant members read domains" on public.tenant_domains
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant admins manage domains" on public.tenant_domains
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

create policy "tenant members read branding" on public.tenant_branding
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','creator','client','employee','partner']));
create policy "tenant admins manage branding" on public.tenant_branding
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

create policy "tenant admins read settings" on public.tenant_settings
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant admins manage public settings" on public.tenant_settings
for all to authenticated
using (is_secret=false and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (is_secret=false and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

create policy "tenant members read feature flags" on public.tenant_feature_flags
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','creator','client','employee','partner']));
create policy "tenant admins manage feature flags" on public.tenant_feature_flags
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

create policy "tenant admins create memberships" on public.tenant_memberships
for insert to authenticated
with check (private.can_manage_tenant_member(tenant_id,role));
create policy "tenant admins update memberships" on public.tenant_memberships
for update to authenticated
using (private.can_manage_tenant_member(tenant_id,role))
with check (private.can_manage_tenant_member(tenant_id,role));

create policy "users insert own portal profile" on public.portal_profiles
for insert to authenticated
with check (user_id=(select auth.uid()));

create policy "tenant admins write tenant audit" on public.tenant_admin_audit
for insert to authenticated
with check (actor_id=(select auth.uid()) and public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));

create policy "tenant staff manage categories" on public.marketplace_categories
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant sellers manage translations" on public.marketplace_listing_translations
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee','partner']));
create policy "tenant staff update orders" on public.marketplace_orders
for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant staff manage order items" on public.marketplace_order_items
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant staff manage disputes" on public.marketplace_disputes
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

create policy "tenant staff update privacy requests" on public.privacy_requests
for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

create policy "tenant staff create sla events" on public.sla_events
for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant staff manage workflow runs" on public.workflow_runs
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant staff add workflow events" on public.workflow_events
for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

create policy "tenant admins manage whatsapp templates" on public.whatsapp_templates
for all to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant admins read provider configuration" on public.payment_providers
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin']));
create policy "tenant staff read provider events" on public.provider_message_events
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

-- Health records contain redacted operational metadata only and may be read by tenant operations roles.
grant select on public.provider_health_checks to authenticated;
create policy "tenant operations read provider health" on public.provider_health_checks
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

commit;
