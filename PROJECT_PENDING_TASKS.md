# HAMZA AGENCY — Current Pending Release Gates

This file is a concise current-state release checklist, not a feature backlog. The detailed authoritative state is `docs/CURRENT_CLOSEOUT_LEDGER.md`.

## Current PR state

- Repository: `hamzaagency1357/hamza-agency`
- PR `#116`
- Branch: `fix/final-production-professional-closeout`
- Production/main baseline: `6d648a17ee95731413f2651d9188a6858d3f923f`
- Pre-fix frozen Head: `38d88caf9497484e35f2476dff37174dadc59f64`
- PR remains **Open / Draft / Unmerged**.
- Production migrations are **NOT YET APPLIED**.
- Merge is **NOT YET APPROVED**.
- No Production business-data write, Billing/plan change, Ready-for-Review conversion, force push, or history rewrite is authorized.

## Closed / accepted Owner gates

- Admin Login: **PASS**
- Two distinct Joining Application detail records: **PASS**
- Android installed PWA installation/open/navigation: **PASS**
- Mobile Dock current release check: **ACCEPTED FOR RELEASE**
- Broad Manual Visual QA: moved to **POST-RELEASE QA** rather than remaining an endless PR #116 gate.
- Primary Admin MFA: **DEFERRED BY OWNER**, post-release operational/security follow-up, not a current merge blocker.
- Independent Backup Admin + MFA + recovery: **DEFERRED BY OWNER**, post-release operational follow-up, not a current merge blocker.

## Current P0 release work

The accepted P0 is the generated Admin gateway privilege contradiction.

Migration #3 must keep the approved architecture and atomically enforce:
- Browser `authenticated` direct Admin DML denied;
- runtime-generated entity actions dispatched server-side through `service_role`;
- exact table `SELECT` + only generated mutation verbs;
- only required sequence `USAGE`;
- fail-closed privilege assertions;
- CI contract drift detection;
- local-isolated positive gateway mutations and negative Browser/Preview proofs.

No Production migration may be applied until this is green.

## Migration package — current state

1. `20260809095000_pr116_owner_approved_reviews_program_media.sql`
   - **PREPARED / REVIEW REQUIRED / NOT YET APPLIED TO PRODUCTION**
2. `20260810001500_pr116_final_security_boundary_closeout.sql`
   - **PREPARED / REVIEW REQUIRED / NOT YET APPLIED TO PRODUCTION**
3. `20260810203000_pr116_admin_oidc_boundary_lockdown.sql`
   - **PREPARED / P0 PRIVILEGE CORRECTION INCLUDED / REVIEW REQUIRED / NOT YET APPLIED TO PRODUCTION**

Migration #1 must preserve the public `reviewer_name` requirement through the approved server/OIDC boundary.
Migration #2 must preserve service-role-only internal submission/guard/legacy RPCs and Preview write denial.
Migration #3 must preserve the six exact statuses:
`new`, `under_review`, `contacted`, `accepted`, `rejected`, `archived`.

## Backup / rollback gates

- Existing scoped evidence: `AUTO-20260812-030801` — completed, checksum verified, all 15 approved scopes.
- This is a **scoped migration-safety backup**, not a full PostgreSQL disaster-recovery dump.
- After the blocker fix and migration review complete, create **one new fresh all-15-scope private backup immediately before Owner Production Migration Approval**.
- Rollback SQL must restore exact pre-migration table/sequence privileges and preserve fail-closed data-safety preconditions.
- Full off-site logical backup is deferred to Post-Release Production Continuity Hardening.

## Exact-head gates still required

- Lint
- Typecheck
- Tests
- Build
- Migration verification
- Admin Mutation Guard
- Secrets verification
- security/permissions evidence
- local-isolated PR116 gateway proof
- HAMZA AGENCY Quality Gate
- PR99 Management Quality Gate
- Current-State Schema Verify
- HAMZA AGENCY Full Project Closeout
- aggregate/fail-closed
- exact Preview `READY` and exact SHA match

## Owner approvals still required

1. **Owner Production Migration Approval** after the migration package, rollback, newest backup and exact-head gates are green.
2. Apply only the migrations Owner approves and verify Production boundaries.
3. **Separate Owner Merge Approval**.
4. After merge: Vercel Production `READY`, exact `/api/health` SHA, affected-flow Production smoke.
5. Only after all above: record `CODE COMPLETE / DEVELOPMENT CLOSED / PRODUCTION RELEASED` outside repo code.

## Non-blocking Post-Release items

- Optional Mobile Dock visual/color refinement.
- Optional Arabic Hero `وكالة حمزة` color refinement.
- Localized installed PWA name: AR `وكالة حمزة`, EN `HAMZA AGENCY`, TR `Hamza Ajansı`.
- Owner-deferred MFA / Backup Admin recovery hardening.
- Full off-site Supabase logical backup / continuity hardening.

Owner-locked facts remain unchanged: `+500`, `⚔عܓོراب✴سܓོوريا⚔`, reviewer name required, six statuses, services distinction, default visual background + Admin-controlled cinematic mode, no fake content, Free/no-billing policy.

No PR #117 or documentation-only follow-up PR is planned.

**Merge = NO · Production Migration = NO · Ready for Review = NO · Billing = NO · Production business-data writes = NO**
