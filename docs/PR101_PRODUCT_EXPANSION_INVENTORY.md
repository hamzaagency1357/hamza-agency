# HAMZA AGENCY — PR101 Product Expansion Preflight Inventory

Internal batch name: **PR101 Product Expansion**

- Starting `main`: `a9951bd459bfbf684d03cfdcb2f645f47d9969a1`
- Final PR #100 head: `53386b26b3a4a2b2bf5f60796132509a62d03b53`
- Development branch: `feat/pr101-complete-product-expansion`
- Production post-deploy revocation remains intentionally deferred.
- Dependabot PRs #101–#104 remain separate and must not be merged into this feature batch.

## Existing foundations to extend

- Arabic/English/Turkish public experience and localization verification.
- Supabase Auth, administrator identity, roles, permissions and program scoping.
- Unified APP/SR/JOB/CNT tracking and safe public status envelopes.
- Page Builder, media, notifications, KPI/analytics, audit log, trash and backup/restore foundations.
- Vercel OIDC server gateway and replay protection.
- Existing `white_label_projects` foundation.
- Existing PWA-adjacent public metadata and production deployment workflow.

## Partial foundations

- White-label data exists but is not a complete tenant isolation model.
- Public AI support exists but lacks provider-neutral RAG governance and portal copilots.
- Notifications exist but do not yet cover portal, task, SLA, provider, privacy, security and incident events.
- Backup/restore exists but must cover all new tenant-scoped tables.
- Analytics exists but requires product-expansion KPIs.
- Auth exists but requires shared portal memberships, device sessions and privacy controls.

## New product domains in this batch

1. Tenant and white-label isolation.
2. Creator, client, employee and partner portal identity.
3. Tasks, SLA and declarative workflows.
4. Marketplace, orders and provider-neutral payments.
5. WhatsApp, push and AI provider adapters in disabled-by-default mode.
6. Privacy Center, cookie consent and legal versioning.
7. Full PWA safety rules and mobile-client readiness.
8. Advanced device/session management.
9. Monitoring, incidents and provider health.
10. Extensions to KPI, notifications, audit, backup and permissions.

## External-provider boundaries

The repository can deliver safe adapters, queues, signature verification contracts, disabled mode and mock tests. Real WhatsApp, payment, push and AI delivery remains disabled until an owner selects a provider and enters server-only credentials outside GitHub and chat. No billing, trial, card, crypto or store publishing is part of this batch.

## Owner-only/manual boundaries

- Provider account creation and business verification.
- MFA enrollment and recovery-code custody.
- Google Play / Apple Developer enrollment and store signing.
- Final Production QA approval.
- Explicit approval before merge and before guarded PR #100 post-deploy revocation.

## Safety decision

All schema work is additive. Existing production records remain attached to a deterministic primary HAMZA AGENCY tenant through a guarded backfill. New authorization is tenant- and membership-scoped; client-supplied tenant IDs are never trusted as authority.
