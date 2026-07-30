# HAMZA AGENCY

HAMZA AGENCY is a production-oriented multilingual platform for operating a creator and live-streaming agency. It combines a public Arabic/English/Turkish website, a permissioned administration dashboard, unified request tracking, content management, translation workflows, operational analytics, backups, audit logs, and server-side security controls.

> Status: PR #100 closeout branch verified automatically. Manual owner checks are intentionally deferred to the final pre-launch gate.

## Platform

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS |
| Database/Auth | Supabase |
| Hosting | Vercel |
| Languages | Arabic, English, Turkish |
| Security gateway | Server-only Vercel OIDC to Supabase |

## Completed capabilities

### Public experience

- Arabic, English, and Turkish URL-owned locales.
- Programs, services, jobs, reviews, success stories, partners, gallery, knowledge, contact, FAQ, and legal pages.
- Responsive language switcher and mobile navigation.
- Public AI-support experience with safe escalation behavior.
- SEO metadata, sitemap, robots, OpenGraph, JSON-LD, canonicals, and locale alternates.
- Tracking pages remain accessible but are excluded from indexing.

### Unified submissions and tracking

- Creator applications: `APP-YYYY-XXXXXXXXXX`.
- Service requests: `SR-YYYY-XXXXXXXXXX`.
- Job applications: `JOB-YYYY-XXXXXXXXXX`.
- Contact requests: `CNT-YYYY-XXXXXXXXXX`.
- Tracking uses the issued tracking code only.
- Localized receipt supports copy, opening the localized tracking page, and printing.
- Public lookup responses expose only an approved status envelope and no private applicant data.

### Administration

- Programs, pages, sections, settings, announcements, jobs, reviews, success stories, partners, gallery, and media.
- Applications, service requests, jobs, contact messages, and a unified request index.
- Search, filters, pagination, status management, notes, and permission-controlled exports.
- Page Builder draft/publish/unpublish/version/restore workflows.
- Translation workbench and revision history.
- Notifications, analytics, activity logs, trash, backups, permissions, and system health.

### Security and operations

- Stable `user_id`-first administrator identity.
- Unknown administrator roles fail closed.
- Program administrators are restricted by database RLS to their assigned program.
- Application reads, edits, and exports require action-level permissions.
- Server-only OIDC validation with issuer, audience, subject, project, environment, time, digest, and nonce checks.
- No Service Role key or OIDC token is exposed to the browser.
- Media Library accepts JPEG, PNG, WebP, and AVIF only, up to 5 MB, with MIME and magic-byte validation.
- Migration safety, secret scanning, automated tests, production build, runtime smoke, authenticated isolated E2E, locale runtime checks, and runtime-error rejection are enforced in CI.

## Environment variables

Copy `.env.example` to `.env.local` for local development. Never commit real values.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=https://hamza-agency.com
NEXT_PUBLIC_WHATSAPP_NUMBER=YOUR_PUBLIC_WHATSAPP_NUMBER
NEXT_PUBLIC_DEFAULT_LANGUAGE=ar
NEXT_PUBLIC_SUPPORTED_LANGUAGES=ar,en,tr
NEXT_PUBLIC_AI_SUPPORT_ENABLED=true
```

Vercel OIDC identity is obtained server-side from the deployment environment. Do not create or copy a shared RPC secret.

## Local verification

```bash
npm ci
npm run lint
npm run typecheck
npm run verify:translations
npm run verify:migrations
npm run verify:secrets
npm test
npm run build
```

The protected CI workflows additionally run runtime route smoke tests, authenticated isolated browser E2E, locale ownership verification, and runtime-error rejection.

## Important documentation

- `docs/HAMZA_AGENCY_FINAL_DELIVERY.md` — full delivery and operating record.
- `docs/PR100_FINAL_CLOSEOUT.md` — exact PR #100 scope, evidence, migrations, and safety decisions.
- `docs/PRELAUNCH_MANUAL_CHECKLIST.md` — owner-only checks required immediately before public launch.
- `.env.example` — public environment variable template.

## Release rule

Merging code and launching publicly are separate gates. PR #100 may be merged after automated verification and repository documentation are complete. Public launch still requires the owner-only checklist, Production verification, and the guarded post-deploy RPC revocation procedure documented in the closeout files.

## License

Private — HAMZA AGENCY. All rights reserved.
