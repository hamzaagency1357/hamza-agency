# HAMZA AGENCY — Final Project Delivery Record

Updated: 2026-07-30

Repository: `hamzaagency1357/hamza-agency`

Production domain: `https://hamza-agency.com`

Supabase project: `fvaurkfnsvsfohpzguho`

## Delivery status

The repository contains the completed public multilingual experience, administration and CMS operations, unified tracking, security hardening, database migrations, automated verification, and release documentation.

The final owner-only manual checks are deliberately separated into `docs/PRELAUNCH_MANUAL_CHECKLIST.md` and are required before public launch. They require real administrator accounts, MFA recovery material, real file uploads, and exact Production deployment access.

## Public website

- Arabic-first design with English and Turkish URL-owned locales.
- Responsive desktop and mobile navigation.
- Programs, services, service request, jobs, reviews, success stories, partners, gallery, knowledge, contact, FAQ, privacy, terms, and AI policy.
- Segmented AR/EN/TR switcher using Next Router navigation.
- Mobile dock for WhatsApp, AI support, and quick navigation.
- Locale-correct ticker direction and localized links.
- SEO metadata, canonical URLs, alternates, sitemap, robots, OpenGraph, and JSON-LD.
- Tracking pages intentionally excluded from indexing.

## Unified request tracking

All public request families issue a unique code:

- `APP` — agency application;
- `SR` — service request;
- `JOB` — job application;
- `CNT` — contact request.

The format is `<PREFIX>-YYYY-XXXXXXXXXX`.

Users track by code only. They are not required to search by WhatsApp number, platform, or program. The localized receipt supports copying, opening the correct tracking route, and printing.

Public tracking returns only approved status information and does not expose applicant PII.

## Administration and CMS

The administration platform includes:

- programs and localized program pages;
- pages, sections, Page Builder, drafts, publish/unpublish, scheduling, versions, and restore;
- settings, announcements, media, header/footer/global content, and SEO controls;
- jobs, reviews, success stories, partners, gallery, and knowledge base;
- applications, service requests, job applications, contact messages, and unified request operations;
- search, filters, status updates, internal notes, pagination, and controlled exports;
- translation workbench and revision history;
- notifications, analytics, activity logs, trash, backups, permissions, launch checklist, and system health.

## Authorization model

Administrator identity uses Supabase Auth `user_id` first. Email fallback exists only for historical rows whose `user_id` is null.

Supported roles:

- `super_admin`;
- `deputy_super_admin`;
- `program_admin`.

Unknown roles fail closed.

Module actions are controlled by permissions such as:

- `can_view`;
- `can_edit`;
- `can_export`.

Applications additionally enforce assigned-program scope at database RLS level for `program_admin` accounts.

## Server and database security

- Vercel OIDC is used for trusted server-to-server actions.
- No manually shared RPC HMAC secret is required.
- OIDC tokens remain server-side.
- Issuer, audience, subject, project, environment, timestamps, digest, and nonce are validated.
- Service Role secrets are not exposed to browser code.
- Public submission and lookup functions include abuse guards and approved response envelopes.
- Media upload validation checks size, MIME type, and magic bytes.
- Backups use the stable active top-administrator predicate.
- Unknown roles are never normalized to elevated access.

## Database migrations

The live project records the PR #100 migration chain, including:

- `20260729091443_pr100_security_data_integrity_closeout`
- `20260729093232_pr100_public_rpc_abuse_hardening`
- `20260729103239_pr100_application_tracking_codes`
- `20260729112619_pr100_signed_gateway_least_privilege`
- `20260729135538_pr100_vercel_oidc_gateway`
- `20260729140425_pr100_oidc_gateway_role_check`
- `20260729141852_pr100_oidc_gateway_claim_role_compatibility`
- `20260729181851_pr100_final_completion`
- `20260729182032_pr100_enable_documented_schedules`
- `20260730185634_pr100_comprehensive_audit_hardening`
- `20260730185730_pr100_comprehensive_audit_hardening`
- `20260730185735_pr100_comprehensive_audit_hardening`

The three final audit versions are intentionally retained because Supabase recorded the same additive statement under those exact versions. Repository tests require them to remain byte-identical.

## Automated quality gate

Every release head must pass:

- ESLint with zero warnings;
- TypeScript type checking;
- public translation verification;
- migration safety verification;
- client-secret scanning;
- Node regression tests;
- Next.js production build;
- runtime route smoke;
- authenticated isolated Playwright E2E;
- URL-owned locale runtime verification;
- runtime-error rejection;
- matching Vercel Preview readiness.

The exact final evidence is recorded in PR #100 and `docs/PR100_FINAL_CLOSEOUT.md`.

## Supabase advisor review

Security and performance advisors were reviewed. Not every warning should be removed mechanically:

- anonymous security-definer functions that intentionally serve guarded public forms/lookup routes must remain callable until the replacement Production routes are verified and guarded revocation is run;
- authenticated security-definer functions enforce administrator checks internally;
- the nonce table intentionally has no direct client policy;
- unused-index findings are informational on a new/low-traffic system;
- policy consolidation and auth init-plan performance cleanup require a separately staged database migration rather than a risky final-day rewrite;
- leaked-password protection is an owner-controlled Auth setting included in the pre-launch checklist.

## Backup and recovery

The system includes private backup creation, metadata/checksum validation, dry-run support, limited restore paths, restore operation records, and scheduled backup support within the selected platform constraints.

Before public launch, create and verify a fresh backup and test a limited restore using disposable fixture data only.

## Release process

1. Complete automated verification on the exact PR head.
2. Ensure the exact Vercel Preview is `READY` and clean.
3. Commit complete repository documentation.
4. Merge PR #100 into `main` using the verified exact head.
5. Confirm the exact merge commit is deployed to Production.
6. Perform `docs/PRELAUNCH_MANUAL_CHECKLIST.md`.
7. Verify APP/SR/JOB/CNT submission and tracking on Production.
8. Run `supabase/postdeploy/pr100_revoke_legacy_public_rpcs.sql` only after the replacements pass.
9. Re-test Production and record final owner launch approval.

## Important safety boundaries

- Never store MFA recovery codes in the repository or chat.
- Never commit `.env` files, private backups, Service Role keys, OIDC tokens, or private user data.
- Never run the guarded post-deploy revocation before replacement routes pass in Production.
- Merging the repository and approving public launch are separate decisions.

## Final documents

- `README.md`
- `docs/HAMZA_AGENCY_FINAL_DELIVERY.md`
- `docs/PR100_FINAL_CLOSEOUT.md`
- `docs/PRELAUNCH_MANUAL_CHECKLIST.md`
- `.env.example`
- `supabase/postdeploy/pr100_revoke_legacy_public_rpcs.sql`
