# HAMZA AGENCY

HAMZA AGENCY is a production-oriented multilingual platform for operating a creator, client-services, partner, and digital-commerce agency. It combines a public Arabic/English/Turkish experience, tenant-aware white-label administration, role-specific portals, unified request tracking, tasks/SLA/workflows, marketplace and payment foundations, privacy controls, PWA/mobile readiness, operational analytics, backups, audit logs, and server-side security controls.

> Status: **PR101 Product Expansion is implemented in actual GitHub PR #105.** Database migrations are applied additively with verified pre/post backups. PR #105 remains unmerged until final exact-head verification and explicit owner approval. Production launch and guarded PR #100 post-deploy revocation are separate later gates.

## Platform

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS |
| Database/Auth | Supabase/PostgreSQL/Auth/Storage |
| Hosting | Vercel |
| Languages | Arabic, English, Turkish |
| Tenant model | Trusted-domain resolution + tenant memberships + RLS |
| Security gateway | Server-only Vercel OIDC to Supabase Edge Function/RPC |
| Web app | Installable PWA with privacy-safe offline shell |
| Mobile | Capacitor Android debug artifact + iOS readiness |

## Completed capabilities

### Public experience and tracking

- Arabic, English, and Turkish URL-owned locales.
- Programs, services, jobs, reviews, success stories, partners, gallery, knowledge, contact, FAQ, legal pages, marketplace, public status, and offline page.
- Responsive language switcher, mobile navigation, AI-support escalation, SEO metadata, sitemap, robots, OpenGraph, JSON-LD, canonicals, and locale alternates.
- Creator applications `APP-YYYY-XXXXXXXXXX`, service requests `SR-YYYY-XXXXXXXXXX`, job applications `JOB-YYYY-XXXXXXXXXX`, and contact requests `CNT-YYYY-XXXXXXXXXX`.
- Tracking uses the issued code only and exposes no private applicant data.

### Tenant and white-label administration

- Primary HAMZA AGENCY tenant plus trusted custom domains.
- Tenant branding, logo/favicon references, colors, contact metadata, social links, locale settings, legal overrides, settings, and feature flags.
- Super Admin tenant switcher, members, permissions, audit, provider status, backups, analytics, incidents, and system health.
- Tenant/user isolation enforced by database RLS and explicit Data API grants.
- Existing CMS, tracking, notifications, KPI, audit, backup, trash, translation, and Page Builder systems are extended rather than rebuilt.

### Role portals

- Creator Portal: profile, application/tracking, tasks, announcements, knowledge, support, files, privacy, sessions, and notifications.
- Client Portal: service requests, tracking, secure files, execution state, marketplace orders/payment state, support, privacy, sessions, and notifications.
- Employee Portal: assigned tasks, queue, SLA, internal notes, escalations, notifications, and performance summary.
- Partner Portal: profile, listings/offers, referrals/leads, documents, reports, communication, privacy, sessions, and notifications.
- Signed-out and suspended accounts fail closed.

### Operations and commerce

- Tasks, assignments, watchers, comments, attachments, status history, related entities, filters, pagination foundation, notifications, audit, and KPI.
- SLA policies/events for first response, resolution, business hours, warning, breach, pause, and escalation.
- Declarative workflows with ordered steps, idempotent runs/events, bounded retries, and no arbitrary code execution.
- Marketplace categories, AR/EN/TR listings, favorites, cart/direct order, orders/items, reviews, refunds, and disputes.
- Provider-neutral payments with manual/offline mode, signed webhook evidence, idempotency, and no card storage.

### Providers, privacy, PWA, and mobile

- WhatsApp templates/consent/queue, Web Push preferences/subscriptions, and AI RAG/rule fallback with PII redaction and prompt-injection protection.
- WhatsApp, push, external AI, and real payment providers are disabled by default and require server-only credentials.
- Privacy request queue, consent history, sessions/devices, communications preferences, AI/marketing opt-out, and versioned legal policies.
- Cookie consent for necessary, analytics, preferences, and marketing categories.
- Installable PWA, offline shell, update prompt, app shortcuts, and service-worker cache denylist for authenticated/private paths.
- HTTPS-only Capacitor wrapper, Android CI artifact, and iOS readiness without paid store publication.

### Security and operations

- Stable `user_id`-first administrator identity and fail-closed roles.
- Server-only OIDC validation of issuer, audience, owner, project, environment, subject, timestamps, digest, and replay nonce.
- No Service Role key, provider secret, payment secret, VAPID private key, or OIDC token reaches browser code.
- Minimal device/session metadata, one/all revoke, suspicious-login alerts, and MFA requirement model.
- Health/provider checks, public redacted incident status, runtime error rejection, structured operational evidence, backups, restore dry runs, and limited restores.
- No hidden employee surveillance.

## Database delivery

Supabase project: `fvaurkfnsvsfohpzguho`

PR101 migrations were applied only after a fresh backup, checksum validation, restore dry run, and limited restore. A second full product-expansion backup, dry run, and limited restore succeeded after migration. No Production business rows were deleted.

See `docs/PR101_PRODUCT_EXPANSION_INVENTORY.md` for migration names, checksums, RLS verification, Android artifact evidence, advisor status, and owner-only boundaries.

## Environment variables

Copy `.env.example` to `.env.local` for local development. Never commit real values.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_SITE_URL=https://hamza-agency.com
NEXT_PUBLIC_WHATSAPP_NUMBER=YOUR_PUBLIC_WHATSAPP_NUMBER
NEXT_PUBLIC_DEFAULT_LANGUAGE=ar
NEXT_PUBLIC_SUPPORTED_LANGUAGES=ar,en,tr
NEXT_PUBLIC_AI_SUPPORT_ENABLED=true
```

Vercel OIDC identity is obtained server-side from the deployment environment. Do not create or copy a shared RPC secret.

## Verification

```bash
npm ci
npm run lint
npm run typecheck
npm run verify:translations
npm run verify:migrations
npm run verify:secrets
npm run verify:pr101
npm test
npm run build
npm run test:smoke
npm run test:e2e
```

Protected CI also checks exact checkout, localized runtime behavior, authenticated isolated browser E2E, runtime errors, provider mocks, mobile safety, Android build, and iOS readiness.

## Important documentation

- `docs/HAMZA_AGENCY_FINAL_DELIVERY.md` — complete delivery and operating record.
- `docs/PR101_PRODUCT_EXPANSION_INVENTORY.md` — PR101 architecture, security, migrations, backup/restore, verification, and provider boundaries.
- `docs/PR100_FINAL_CLOSEOUT.md` — historical PR #100 scope and guarded post-deploy design.
- `docs/PRELAUNCH_MANUAL_CHECKLIST.md` — owner/account and Production checks required before full launch.
- `.env.example` — public environment variable template.

## Release rule

Merging code and launching publicly are separate gates. PR #105 must not merge without explicit owner approval. After merge, the exact merge commit must reach Production `READY`, final Production and owner QA must pass, and a separate explicit approval is required before the guarded PR #100 post-deploy RPC revocation. Only after those gates may the platform be declared fully launched.

## License

Private — HAMZA AGENCY. All rights reserved.
