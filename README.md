# HAMZA AGENCY

HAMZA AGENCY is a production multilingual platform for creator management, live-streaming programs, client services, support, administration, privacy, and digital operations. Public routes support Arabic, English, and Turkish. Production is `https://hamza-agency.com`.

## Current state

The authoritative repository status is maintained in [`docs/CURRENT_PROJECT_STATE.md`](docs/CURRENT_PROJECT_STATE.md). Historical remediation, closeout, checkpoint, and audit files are evidence only and are not current execution instructions.

Closed phases include Security Remediation, Dependency + Auth Hardening (#127), Public + PWA + Localization Closeout (#128), and Admin Professionalism Closeout (#129). Closed work is not reopened without a newly proven regression.

## Platform

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5.22 App Router |
| Runtime | Node 24.x |
| Language | TypeScript |
| UI | React 19.2.8 + Tailwind CSS |
| Database/Auth | Supabase/PostgreSQL/Auth/Storage |
| Hosting | Vercel |
| Languages | Arabic, English, Turkish |
| Web app | Installable PWA |

## Product identity

- Agency: `HAMZA AGENCY` / `وكالة حمزة`
- SEO agent: `عراب سوريا`
- Decorated in-site agent: `⚔عܓོراب✴سܓོوريا⚔`
- Monthly success opportunity: `+500`
- Arabic Smart Support: `الدعم الذكي`
- Programs: TikTok, BIGO LIVE, Yaahlan, Xena, Catchii
- Reviewer name is required.

These are product-owned facts and must not be changed as part of routine technical cleanup.

## Database changes

Repository migration history is reconciled with the current Production identities. Follow [`docs/SUPABASE_DATABASE_CHANGE_WORKFLOW.md`](docs/SUPABASE_DATABASE_CHANGE_WORKFLOW.md) for any future database change. Never apply a Production database/Auth change merely because a migration file exists in a branch.

## Verification

Core repository commands include:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:translations
npm run verify:migrations
npm run verify:secrets
npm run verify:dependencies
```

Exact release evidence must come from the exact GitHub Head and matching Vercel deployment metadata. Build identifiers, commit SHAs, repository paths, migration names, or internal diagnostics are not intended as public visitor-facing metadata.

## Documentation

- [`docs/CURRENT_PROJECT_STATE.md`](docs/CURRENT_PROJECT_STATE.md) — single current-state authority.
- [`docs/SUPABASE_DATABASE_CHANGE_WORKFLOW.md`](docs/SUPABASE_DATABASE_CHANGE_WORKFLOW.md) — database change process.
- Historical ledgers and checkpoints — retained for evidence only when clearly marked historical.

## License

Private — HAMZA AGENCY. All rights reserved.
