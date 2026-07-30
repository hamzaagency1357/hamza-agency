# HAMZA AGENCY — PR #100 Final Closeout Record

Date: 2026-07-30

Repository: `hamzaagency1357/hamza-agency`

Pull request: `#100`

Branch: `fix/localized-home-program-summaries`

## Purpose

PR #100 completes the final security, tracking, operations, migration recovery, and project-audit work that remained after the multilingual public experience and management batches.

## Functional scope completed

### Unified public tracking

Four request types use a single tracking experience:

- Agency applications: `APP-YYYY-XXXXXXXXXX`
- Service requests: `SR-YYYY-XXXXXXXXXX`
- Job applications: `JOB-YYYY-XXXXXXXXXX`
- Contact requests: `CNT-YYYY-XXXXXXXXXX`

The public user receives the tracking code after submission and can follow the request through the localized `/track` route. Tracking no longer requires WhatsApp, a platform name, or other personal identifiers.

The receipt component supports:

- copying the tracking code;
- opening the localized tracking page;
- browser printing;
- Arabic, English, and Turkish messages.

Public lookup returns only the approved public status envelope. Applicant PII remains unavailable through tracking responses.

### Public submission routes

Applications, service requests, job applications, contact requests, and supported AI actions use the guarded server flow. JOB and CNT submission support was completed in this PR.

### Administration

PR #100 adds or completes:

- `/admin/contact`;
- `/admin/requests` unified operational index over existing APP/SR/JOB/CNT tables;
- tracking-code display and search;
- permission-controlled exports;
- status and internal-note updates;
- pagination and date/status/type filters;
- JOB/CNT notification, audit, and analytics coverage.

No replacement unified business-data table was introduced. Existing source tables remain authoritative.

### Media Library

Image-bucket uploads are restricted to:

- JPEG;
- PNG;
- WebP;
- AVIF;
- maximum size 5 MB.

Validation checks both declared MIME type and file magic bytes. Disguised files and MIME mismatches are rejected. Video and document resources are not uploaded to the image bucket.

## Authorization and security hardening

### Administrator identity

Authorization is `user_id` first. Legacy email fallback remains only for historical administrator rows whose `user_id` is still null.

Recognized roles are:

- `super_admin`;
- `deputy_super_admin`;
- `program_admin`.

Unknown, empty, or malformed roles fail closed and are never promoted.

### Application RLS

Database RLS, not only client UI checks, enforces:

- `can_view` for application reads;
- `can_edit` for application updates;
- assigned-program scope for `program_admin` accounts.

Program comparison is normalized to tolerate punctuation and spacing differences such as `BIGO LIVE` and `bigo-live`.

### Export permissions

Tracking exports require the relevant module-level `can_export` permission. Hiding a button is not the only control; the export handler also refuses execution without permission.

### Backup access

Backup policies use the active top-administrator predicate and no longer depend solely on matching an email address.

### Server-only OIDC

The server obtains the Vercel OIDC token. The browser never receives it.

The trusted verification path validates the expected:

- issuer;
- audience;
- subject;
- project;
- environment;
- issue and expiry times;
- request digest;
- nonce replay protection.

No manually shared HMAC secret is required between Vercel and Supabase.

## SEO and privacy

Tracking pages remain operational but are excluded from sitemap output and explicitly disallowed in robots rules for Arabic, English, and Turkish paths.

This avoids indexing private operational pages while preserving direct access for users holding a tracking code.

## Database and migration history

Restored previously applied migration source:

- `20260729181851_pr100_final_completion.sql`

Additional audit hardening is represented by the exact versions recorded by Supabase:

- `20260730185634_pr100_comprehensive_audit_hardening.sql`
- `20260730185730_pr100_comprehensive_audit_hardening.sql`
- `20260730185735_pr100_comprehensive_audit_hardening.sql`

The three audit statements are byte-identical, additive, and intentionally retained to mirror the immutable live migration history. Regression tests assert that they remain identical.

The live schema was verified for:

- the administrator role constraint;
- application select/update policies;
- application action permissions;
- program-level scope;
- backup policies;
- translation revision lineage index.

## Automated verification

The final head must pass both repository workflows before merge:

- HAMZA AGENCY Quality Gate;
- PR99 Management Quality Gate.

Together they cover:

- ESLint with zero warnings;
- TypeScript;
- public translation verification;
- migration safety;
- secret scanning;
- Node tests;
- Next.js production build;
- runtime route smoke;
- authenticated isolated Playwright E2E;
- URL-owned locale verification;
- runtime-error rejection.

The matching Vercel Preview must be `READY`, use the exact final commit, have successful GitHub deployment status, and show no error/warning/fatal runtime logs during verification.

## Supabase advisor interpretation

Advisor findings were reviewed rather than treated as automatic destructive work.

Expected or intentionally deferred findings include:

- public `SECURITY DEFINER` RPC warnings for guarded public submission/lookup functions that exist to serve anonymous requests;
- authenticated `SECURITY DEFINER` warnings for administrator operations that enforce authorization internally;
- RLS-enabled nonce table with no client policy, intentionally inaccessible directly;
- unused-index informational findings on a low-traffic/new deployment;
- legacy duplicate permissive-policy and auth-init-plan performance warnings that require a separately staged policy-consolidation migration, not an unsafe last-minute rewrite;
- leaked-password protection, which is an owner/dashboard setting and remains in the pre-launch checklist.

The guarded legacy public RPC revocation file remains:

- `supabase/postdeploy/pr100_revoke_legacy_public_rpcs.sql`

It must not run before merge and Production verification.

## Merge and launch are separate

Merging PR #100 records the completed code and automated evidence in `main`. It does not by itself authorize public launch.

Before launch, complete `docs/PRELAUNCH_MANUAL_CHECKLIST.md`. After exact Production deployment and verification, run the guarded post-deploy revocation only when all replacement APP/SR/JOB/CNT submission and tracking routes are confirmed.

## Safety record

During PR execution:

- no new PR was opened;
- `main` was not edited directly;
- no manual Production deployment was triggered;
- no guarded post-deploy action was run;
- no business records were deleted;
- no paid plan, billing, or manual shared RPC secret was introduced.
