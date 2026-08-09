# HAMZA AGENCY

HAMZA AGENCY is a production-oriented multilingual platform for creator management, live-streaming programs, client services, tracking, support, administration, privacy, and digital operations. The public experience is available in Arabic, English, and Turkish and is deployed at `https://hamza-agency.com`.

> **Release status:** PR1, PR2, PR3, PR4, and PR5 are completed. PR #115 is merged and the Production baseline entering the final professional closeout is `6d648a17ee95731413f2651d9188a6858d3f923f`. PR #116 is the single **Final Production Professional Closeout** PR and remains Draft/unmerged until every final gate is satisfied. It must not be described as Fully Launched, Code Complete, Delivery Ready, or Revenue Ready before those gates close.

## Platform

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS |
| Database/Auth | Supabase/PostgreSQL/Auth/Storage |
| Hosting | Vercel |
| Languages | Arabic, English, Turkish |
| Security gateway | Server-only Vercel OIDC to Supabase Edge Function/RPC |
| Web app | Installable PWA with privacy-safe offline shell |

## Current production capabilities

- AR / EN / TR public routes with locale-aware canonical, hreflang, Open Graph, Twitter metadata, sitemap, robots, and structured data.
- Programs and creator applications with tracking codes and non-guaranteed acceptance messaging.
- Service requests and service tracking.
- Contact, privacy, cookie controls, legal pages, blog, knowledge, jobs, reviews, success stories, gallery, and public support surfaces.
- Smart Support, knowledge lookup, SUP tracking, human handoff, staff queue, and notifications from PR4.
- Admin operations with role/permission enforcement and direct-link authorization controls.
- Blog sanitizer/security controls and published-content boundaries.
- Installable PWA with real browser install-prompt gating and safe fallback guidance.
- Production database/RLS/security hardening from the completed production closeout phases.
- Cinematic media management from PR5 while the current public background remains the default experience; cinematic media is opt-in and published-only.

## Final closeout boundaries

Production Supabase project: `fvaurkfnsvsfohpzguho`.

Production remains read-only while PR #116 is being prepared and reviewed. No Production migration, data deletion, business-row mutation, Edge Function deployment, or merge is authorized merely because the migration/code exists in the PR.

Read-only verification during the final closeout proved remaining Production privilege gaps on internal PR99 write RPCs and legacy lookup RPCs. PR #116 therefore contains a narrowly scoped additive security migration and an updated isolated verification contract. Those changes must pass the exact-Head tests, Owner QA and the explicit Production Migration Gate before any Production application.

The current Supabase organization is on the Free plan. Leaked Password Protection is a Pro-and-above Auth control and is therefore an external plan/security blocker under the current Owner directive. Primary-admin MFA and a real independent Backup Administrator also remain manual release gates until verified.

Real paid AI providers, payment providers, paid WhatsApp/provider integrations, billing-dependent services, and app-store publication remain intentionally disabled or deferred and are not current development gaps. Major dependency/toolchain upgrades and unrelated Dependabot maintenance are outside this closeout unless they become a verified release blocker.

No fake reviews, success stories, articles, metrics, partnerships, jobs, marketplace listings, earnings, acceptance, results, or external-platform approval claims may be introduced.

## Final Agent identity

- Arabic decorated: `⚔عܓོراب✴سܓོوريا⚔`
- Arabic readable/SEO: `عراب سوريا`
- English: `Agent Hamza` — `Agent and Manager at HAMZA AGENCY`
- Turkish: `Temsilci Hamza` — `Hamza Ajansı Temsilcisi ve Yöneticisi`

Superseded titles such as `Godfather of Syria`, `Arrab Syria`, and `Suriye'nin Vaftiz Babası` are not approved current identity.

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

Vercel OIDC identity is obtained server-side from the deployment environment. Do not create or copy a shared RPC secret and do not expose Service Role or provider secrets through browser code or `NEXT_PUBLIC_*` variables.

## Verification

Core repository verification includes:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:translations
npm run verify:migrations
npm run verify:secrets
npm run verify:product-expansion
npm run verify:pr4
```

Protected CI also runs the HAMZA AGENCY Quality Gate, PR99 Management Quality Gate, Current-State Schema Verify, Full Project Closeout, isolated migration/security runtime suites, exact-preview evidence, Vercel Preview checks, and repository-specific contracts.

Final evidence must belong to the exact final Head. Evidence from an older Head does not close a changed requirement.

## Important documentation

- `docs/CURRENT_CLOSEOUT_LEDGER.md` — single authoritative final Closeout Ledger.
- `docs/HAMZA_AGENCY_FINAL_DELIVERY.md` — current delivery/release record.
- `docs/PRELAUNCH_MANUAL_CHECKLIST.md` — only the manual/external gates that still apply.
- `PROJECT_PENDING_TASKS.md` — compact current release-gate summary; not a feature backlog.
- `.env.example` — public environment variable template.

## Release rule

For PR #116:

1. Close only verified current requirements; preserve already-correct work.
2. Freeze an exact final Head and pass the required exact-Head automated verification and exact Vercel Preview.
3. Close mandatory administrator-security/manual blockers.
4. Owner Final QA must explicitly equal `PASS` on that exact Preview.
5. If a Production migration is still required, present backup/migration/security/rollback evidence and wait for separate explicit Owner Production Migration approval.
6. No merge may occur without separate explicit Owner merge approval.
7. After merge, Vercel Production must be `READY`, `/api/health` must report the exact merge commit, and final smoke checks must pass.
8. Only when the governing Definition of Done is satisfied may HAMZA AGENCY be declared **CODE COMPLETE — DEVELOPMENT CLOSED**.
9. After that declaration, stop development; later bugs/requirements are separate work.

## License

Private — HAMZA AGENCY. All rights reserved.
