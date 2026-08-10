# HAMZA AGENCY

HAMZA AGENCY is a production-oriented multilingual platform for creator management, live-streaming programs, client services, tracking, support, administration, privacy, and digital operations. Public routes are Arabic, English, and Turkish and Production is `https://hamza-agency.com`.

> **Release status:** PR1–PR5 are historical completed phases. PR #116 is the single Final Production Professional Closeout PR and remains **Draft / unmerged**. It is not Code Complete, Production Ready, Delivery Ready, or Revenue Ready until the remaining Owner/Production gates close.

## Platform

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS |
| Database/Auth | Supabase/PostgreSQL/Auth/Storage |
| Hosting | Vercel |
| Languages | Arabic, English, Turkish |
| Security gateway | Server-only Vercel OIDC → Supabase gateway/internal RPCs |
| Web app | Installable PWA with privacy-safe offline shell |

## Current final-closeout boundaries

Production/main baseline entering PR #116: `6d648a17ee95731413f2651d9188a6858d3f923f`.

Production remains read-only during this PR. No Production migration, Production business-data mutation, Billing/plan change, force push, Ready-for-Review conversion, or merge is authorized by the existence of code in the PR.

Verified final-delta work includes:

- final Agent identity AR/EN/TR without superseded EN/TR titles;
- public Platform Status without public commit/runtime metadata;
- localized Smart Support access, including the corrected Desktop floating label (`الدعم الذكي` / `Smart Support` / `Akıllı Destek`);
- Preview fail-closed production-sensitive writes;
- AdminQuickNav one-active-item fix and bounded Unified Requests deep-link fix;
- Owner-approved homepage marketing statistics preserved exactly as content: `7000+` Content Creators, `5+` Available Platforms, `24/7` Support & Follow-up, `7` Years of Experience; these are not derived database metrics and must not be removed/reinterpreted without an explicit Owner decision;
- Joining Applications dashboard details hardened against admin-overlay stacking and stale-selection behavior;
- Blog management shortcut changed from floating overlay to in-flow admin access and hidden on `/admin/login`;
- public support availability route-gated away from `/admin*` without removing the approved public copy;
- humanized daily Admin Dashboard wording without `Supabase`, `SEO`, `CMS`, or `Page Builder` UI residue in the corrected surface;
- shared Black/Near-black + Royal Purple + restrained Gold hierarchy with differentiated text hierarchy while preserving semantic status colors and visual presets;
- additive least-privilege migration covering five internal PR99 submit RPCs, two legacy lookup bypasses, and three internal guard RPCs while preserving the service-role/OIDC path;
- isolated migration regression contracts for browser-role denial and internal service access.

Production still has the direct RPC exposure until the approved migration is actually applied and verified.

## Administrator security gates

Current read-only Production audit:

- active admins: **1**;
- verified MFA factors: **0**;
- independent Backup Admin: **not verified / absent**.

These are Owner manual gates. Recovery codes must never be committed or posted in chat/logs.

Supabase organization plan is **Free**. Leaked Password Protection is therefore recorded as **External Plan Limitation — Owner Decision Required** under the current no-billing policy. No upgrade is authorized.

## Final Agent identity

- Arabic decorated: `⚔عܓོراب✴سܓོوريا⚔`
- Arabic readable/SEO: `عراب سوريا`
- English: `Agent Hamza` — `Agent and Manager at HAMZA AGENCY`
- Turkish: `Temsilci Hamza` — `Hamza Ajansı Temsilcisi ve Yöneticisi`

Never reintroduce `Godfather of Syria`, `Arrab Syria`, or `Suriye'nin Vaftiz Babası`.

## Current migrations

- `supabase/migrations/20260809095000_pr116_owner_approved_reviews_program_media.sql`
- `supabase/migrations/20260810001500_pr116_final_security_boundary_closeout.sql`

Production application: **NO**. A fresh verified backup/recovery package and explicit Owner Production Migration approval are mandatory before application.

## Verification

Core local/repository commands include:

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

Protected CI includes Quality Gate, PR99 Management Quality Gate, Current-State Schema Verify, Full Project Closeout, exact-preview, public/translation/security/permission/admin evidence, and isolated migration/security suites.

**Final evidence is valid only for the exact current PR Head.** Read final workflow conclusions from GitHub and the exact deployment ID/URL/SHA/READY state from Vercel; do not reuse evidence from an older commit.

## Important documentation

- `docs/CURRENT_CLOSEOUT_LEDGER.md` — authoritative closeout ledger.
- `PROJECT_PENDING_TASKS.md` — compact current release gates, not a feature backlog.
- `docs/HAMZA_AGENCY_FINAL_DELIVERY.md` — delivery/release state.
- `docs/PRELAUNCH_MANUAL_CHECKLIST.md` — manual/Production/Owner gates.

## Release rule

1. Freeze final Head and pass exact-Head automated evidence.
2. Complete authenticated Admin Owner QA and visual/mobile/preset QA on that exact Preview.
3. Complete Owner/manual Admin security and Android real-device PWA gates.
4. Owner Final Visual QA must explicitly equal `PASS`.
5. If Production migrations remain required, present backup/migration/security/rollback evidence and STOP for explicit Owner approval.
6. Apply only approved migrations and verify affected Production flows.
7. Obtain separate explicit Owner merge approval.
8. Merge; verify Vercel Production READY, exact `/api/health` commit and final smoke.
9. Only then may HAMZA AGENCY be declared Code Complete / Development Closed / Production Ready / Delivery Ready / Revenue Ready.
10. After true closeout, stop development; later bugs/new Owner requirements are separate work.

## License

Private — HAMZA AGENCY. All rights reserved.
