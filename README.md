# HAMZA AGENCY

HAMZA AGENCY is a production-oriented multilingual platform for creator management, live-streaming programs, client services, tracking, support, administration, privacy, and digital operations. The public experience is available in Arabic, English, and Turkish and is deployed at `https://hamza-agency.com`.

> **Release status:** PR1, PR2, PR3, PR4, and PR5 are completed. PR #115 is merged and the Production baseline entering the final professional closeout is `6d648a17ee95731413f2651d9188a6858d3f923f`. PR #116 is the single **Final Production Professional Closeout** PR and remains a Draft Release Candidate until Owner Final QA and explicit merge approval. The project must not be described as Fully Launched before that approval and the final Production verification.

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

## Release and data boundaries

Production Supabase project: `fvaurkfnsvsfohpzguho`.

The Final Production Professional Closeout is code/QA/documentation work only. Production remains read-only until Owner approval and merge. No Production migration, data deletion, or business-row mutation is authorized in PR #116 unless a new blocking database necessity is proven and separately approved first.

Real paid AI providers, payment providers, paid WhatsApp/provider integrations, billing-dependent services, and app-store publication remain intentionally disabled or deferred. Major dependency/toolchain upgrades and Dependabot maintenance are post-launch maintenance unless they become a release blocker.

No fake reviews, success stories, articles, metrics, partnerships, earnings, acceptance, results, or external-platform approval claims may be introduced.

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

Protected CI also runs the HAMZA AGENCY Quality Gate, PR99 Management Quality Gate, Full Project Closeout, exact-preview evidence, Vercel Preview checks, security/runtime checks, and other repository-specific contracts.

## Important documentation

- `docs/HAMZA_AGENCY_FINAL_DELIVERY.md` — authoritative current delivery and release-candidate record.
- `docs/PR101_PRODUCT_EXPANSION_INVENTORY.md` — historical product-expansion architecture and migration inventory.
- `docs/PRELAUNCH_MANUAL_CHECKLIST.md` — manual owner/account checks relevant before final launch.
- `.env.example` — public environment variable template.

## Release rule

Code completion, PR approval, merge, Production deployment, and the Fully Launched declaration are separate gates.

For PR #116:

1. The exact Head must pass the required automated checks and exact Vercel Preview verification.
2. Owner Final QA must be performed against that exact Preview.
3. No merge may occur without explicit Owner approval.
4. After merge, the exact merge commit must reach Production `READY` and `/api/health` must report the same commit SHA.
5. Final Production read-only smoke verification must pass.
6. Only then, with Owner approval, may HAMZA AGENCY be declared **Fully Launched**.

## License

Private — HAMZA AGENCY. All rights reserved.
