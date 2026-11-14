# PR #160 — Safe Production Release Activation Runbook

**Prepared:** 2026-11-13 (UTC+03:00)  
**Repository:** `hamzaagency1357/hamza-agency`  
**Release branch:** `fix/consolidated-admin-qa-20261102` (same PR #160; no new branch/PR)  
**Inspected candidate SHA:** `f3e0817ac1954f04c46fbede99e37c858db3a1fb`  
**Baseline Production Web:** `a120fc48c418b4b259916c45f9389df8c3c26b66`; Vercel `dpl_4UsYNwDcWEwDFbG3H5QYk9y5ZQqg`  
**Supabase Production project:** `fvaurkfnsvsfohpzguho` — PostgreSQL 17, Free plan  
**Edge baselines:** `pr100-vercel-oidc-gateway` v6, `pr101-vercel-oidc-gateway` v4, `pr116-admin-oidc-gateway` v2.

> **NOT AN EXECUTION AUTHORIZATION.** As of preparation the PR is OPEN / DRAFT / UNMERGED. No Production deployment, schema migration, Edge publication, MFA enrollment, Auth setting change, customer data mutation, backup/restore, domain-switch, or purchasing is authorized. All activation steps below require the relevant specific owner approval.

## A. Evidence and actual release boundaries

- Full Project Closeout: [21/21 successful jobs on the candidate SHA](https://github.com/hamzaagency1357/hamza-agency/actions/runs/43473053372). Hardened RPC concurrency and ACL test: [PASS](https://github.com/hamzaagency1357/hamza-agency/actions/runs/43473053822). Isolated Auth lifecycle test and first-two-migration authorization tests are recorded in the PR checks. These are NOT live production guarantees.
- Exact-SHA preview: [Vercel READY](https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/8WCwgfmgtUVQGSnrnc348zre14zX). If this documentation commit changes HEAD, the release candidate must be re-identified, and all required gates/Preview rechecked on the new HEAD.
- Read-only Production catalog inspection verified expected existing tables, policies, functions, `pgcrypto` under `extensions`, and the old `authenticator` `pgrst.db_pre_request = public.pr116_apply_trusted_admin_actor_context`.
- **Unapplied migrations:** `20261111234553_pr160_scope_admin_translation_and_legacy_rpcs.sql`, `20261112121152_pr160_admin_read_scope_and_enrolled_mfa.sql`, and `20261113180500_pr160_trusted_rate_and_knowledge_gateway.sql`.
- The first two migration files have isolated authorization/AAL evidence; the third has an independent isolated PostgreSQL 17 rate/concurrency/OIDC-dispatch test. **A verified all-three, same-database, sequential integration rehearsal has not been established. This remains a mandatory pre-activation test.**

## B. Exact SQL dependency and impact matrix

| Sequence | Migration | Production object impact | Compatibility and failure check |
| --- | --- | --- | --- |
| 1 | `20261111234553` | Replace translation authorization and page restore functions; change RLS on `blog_posts`, `blog_post_translations`, `blog_post_versions`; revoke legacy `pr99_soft_delete` and version-helper browser RPC access | `pr116` candidate must support the authorized translation-draft dispatch. Check draft/review/publish and version restore with synthetic users; published contents must not change |
| 2 | `20261112121152` | Change RLS on `admin_users`, `activity_logs`, `backups`, `job_applications`, `service_requests`, `media`, `pages`, `sections`, `version_history`; revoke browser writes to audit/backup/history; replace admin scope/backup helpers; install `pr160_admin_data_api_pre_request` and configure `authenticator` | Test all role boundaries and verified-factor AAL1 rejection/AAL2 allowance. Observe PostgREST/Auth and read/write endpoints immediately; a failed global pre-request can impair many users |
| 3 | `20261113180500` | Add RLS-protected `pr160_knowledge_rate_windows`; replace `pr100_guard_public_lookup` with serialized locks; add service-only `pr160_record_knowledge_suggestion`; extend nonce constraint and `pr100_oidc_gateway`; revoke direct browser suggestion/lookup EXECUTE | Ensure candidate `pr100` Edge supports `knowledge_suggest` before this migration. Test track/status and OIDC, per-source and global rate limits, failure codes, and Preview write denial |

Use migration files unchanged where they passed tests. Do not cherry-pick functions or edit the historical migration registry. Reconcile remote migration history/actual catalog and run supported Supabase migration tooling only after approval. Do not rely on a guessed "reverse migration".

## C. Required unperformed isolated rehearsal

On an **existing, cost-approved, disposable environment with synthetic fixtures only**, using the exact reviewed repo tree and installed PostgreSQL/Supabase tool versions:

1. Build a database baseline representing the deployed PR #158 schema. Record SQL role grants, policy names, extensions, PostgREST pre-request, Auth schema prerequisites and Edge OIDC action allowlists. No production customer/Auth/Storage rows in test data.
2. Apply **all three migration files in timestamp order in the same isolated database** using the same migration runner semantics expected in the release; prove migration history is recorded once.
3. Run `tests/pr160-admin-release-boundary.sql`, `tests/pr160-admin-read-mfa.sql`, `tests/pr160/isolated-rate-hardening.py` or equivalent probes **against the combined migrated schema**, not only against separate standalone fixtures. Tests must cover `super_admin`, `deputy_super_admin` with/without explicit module permissions, `program_admin` restricted program, unauthenticated users, and AAL1/AAL2.
4. Verify both **old Web/Edge and new Web/Edge** behaviors at each planned intermediate state (after Edge update, migration 1, migration 2, migration 3, then Web switch). Include AR/EN/TR, application/job/service tracking, `SUP` verification, smart support, `knowledge_suggest`, replay/rate limits, invitations, team status, media access, preview read-only and audit integrity.
5. Compare non-sensitive row counts/constraints/grants before/after; prove no unexpected published-content changes. Record versions, redacted logs and test assertions as CI artifacts. A failed or unavailable rehearsal means `RELEASE PREPARATION: BLOCKED`.

## D. Backups and recovery — hard gate

**BACKUP READY: BLOCKED** until the following is performed and evidenced with a separate owner authorization. Free-tier Supabase automatic daily backups are NOT assumed. A default `supabase db dump` does NOT include data/roles and excludes managed Auth/Storage schemas; Storage file bytes are separate from database object metadata.

Required encrypted, one-off export to an existing owner-controlled private destination (not GitHub, PR artifacts or ChatGPT), with no new paid account:

- Database roles and grants, schema/DDL, all relevant **application data** (customers, applications, services, broadcasts, staff, translations, blog, audits, backup metadata, rate/replay data as appropriate). Export the managed **Auth** state through a supported, privileged and version-checked approach, or explicitly mark Auth incomplete; do not assume a public-schema dump captures it.
- Storage: private/public bucket configuration, object **metadata and actual binary contents**, ownership and access policies. Record object count, total bytes, and integrity hash for each item. Consider signed URLs and permission expiration; no public disclosure of identity images.
- Source/CI release SHA, all Edge Function bundles with verified file hashes and flags, Vercel environment variable **names/presence only** (not secret values), active domain alias/deployment, Auth MFA/session settings and operator recovery procedure.
- Encrypt at source using approved local tooling (for example `age` or `gpg` with reviewed encryption key handling); verify archive contents, checksums, decryptability, and row/object counts while preserving strict access control. Do not record encryption private keys or database secrets in this runbook.
- Restore in an approved isolated destination. Confirm schema, grants/RLS, linked Auth, Storage blobs, application tracking, readable content and access denial for non-authorized roles. If restoration of managed Auth/Storage is unsupported, mark the missing coverage and keep the release blocked.

A narrow in-app editorial snapshot or successful synthetic backup/restore test is **not** a comprehensive Production recovery point. Do not apply migrations 1–3 while the backup gate is blocked.

## E. Owner MFA policy — optional, with enrolled-factor enforcement (owner decision 2026-11-14)

**OWNER MFA: OPTIONAL — NOT ENROLLED** (owner's declared policy; no live factor state was inspected or changed). An owner `super_admin` is **not** required to enroll a TOTP factor or secondary device to log in or to approve a release. No Auth, MFA factor, account, or Production settings changes are authorized by this policy decision.

- **Before enrollment:** an active, linked `super_admin` with no verified factor may authenticate at `aal1` and exercise the permissions otherwise granted by role, session checks, RLS and OIDC. This is **not** an exemption from any separate operation-specific `aal2` rule; document and block any such operation until its assurance is met.
- **After voluntary enrollment:** the existing `pr160_admin_data_api_pre_request` requires `aal2` for an admin with a verified factor before proceeding to the trusted actor bridge. `pr116-admin-oidc-gateway/admin-role-policy.ts` similarly denies `aal1` when Supabase Auth returns a verified factor. No owner, deputy or program admin bypass is permitted.
- **Optional future setup:** the `/admin/security` page retains the TOTP enrollment option; `/admin/login` challenges verified-factor accounts. The owner may opt in later with separate explicit approval, ideally with independent recovery arrangements. Do not create factors or reset Auth state now.
- **Isolated contract:** `tests/pr160-admin-read-mfa.sql` covers an unenrolled owner's `aal1` authorization, the same owner at `aal1` being denied after verified enrollment, and `aal2` working; existing non-owner and negative authorization tests remain. These tests are not claims of real Production MFA activation.

**MFA policy is not a Production launch blocker solely because the owner remains unenrolled.** The encrypted-backup/recovery gate and any independent security or CI failures remain binding.

## F. Coordinated Production cutover — operator checklist after explicit approvals

1. **Freeze exact targets:** recheck PR/head/base, required CI statuses, exact preview deployment, `main` deployment, production alias, production migrations and database version, Edge v6/v4/v2, candidate file hashes, environment variable keys and OIDC issuer/audience/team/project/environment binding. Approve release time window and named operator. If anyone updated the branch since evidence, stop.
2. **Satisfy recovery gate:** take approved encrypted one-off backup and complete the isolated restore rehearsal. If any required Auth/Storage component cannot be recovered, stop; negotiate explicitly accepted risk only in a separate decision and do NOT label BACKUP READY PASS without recoverability.
3. **Complete combined isolated migration + old/new compatibility rehearsal** described in section C. Check preflight locks, grants, expected existing policy names, PostgREST notification behavior and database permissions. Abort if unverified.
4. **Prevent unapproved automatic Production promotion** before merging. Confirm actual Git integration / Vercel domain-assignment behavior for the project. A merge can auto-deploy; release approvals must cover the resulting production behavior, or stage and hold the exact production build with an approved mechanism. Keep the known old deployment and domain mapping.
5. **Coordinate backward-compatible Edge first**: deploy inspected candidate `pr116-admin-oidc-gateway` and `pr100-vercel-oidc-gateway` in the approved narrow window, keeping `pr101` v4 unchanged if unchanged by the candidate. Check role auth, existing write actions, lookups, OIDC environment/replay and health with synthetic identities. A new Edge action calling a still-missing SQL branch must fail closed; do not enable it in Web until DB readiness.
6. **Apply and verify SQL 1, then 2, then 3**, one approved migration step at a time. Check migration registry, grants and RLS, Auth/Data API behavior, errors, monitoring and existing functionality between steps. Stop at first fail, not blindly continue. Migration 2 modifies the globally configured `pgrst.db_pre_request`: verify immediately.
7. **Switch to reviewed new Web build only when required DB and Edge APIs are live.** Confirm the resulting Vercel Production deployment is built from the reviewed PR merge tree and configured environment; run smoke probes prior to domain promotion when possible, then explicitly authorize alias promotion. Do not assume that promoting a Preview guarantees an identical production build.
8. **Verify the live service** with synthetic authorized data: signed-in and signed-out paths; every admin role and factor state; applications, jobs, service requests, `APP/SR/JOB/CNT/SUP` tracking; support and suggestions; throttling; team invitations; upload private-storage isolation; audit; mobile/desktop and all three locales; canonical/sitemap/Open Graph; GSC and error/latency dashboards.
9. **Honor owner optional MFA policy:** verify that the unenrolled owner can log in and administer authorized operations without an MFA enrollment prompt, while verified-factor accounts still require AAL2. Enrollment and second-factor recovery are an optional separately approved future operation, not part of this cutover.
10. **Owner sign-off:** record time, SHA, Vercel deployment ID/alias, Edge versions, migration versions, backup/restore evidence, tests and remaining risks. Only then mark Full Production Closeout PASS.

**Transition limitation:** The old Web writes unmatched knowledge suggestions directly through `pr4_suggest_knowledge`; new Web uses trusted `knowledge_suggest`. After SQL #3 revokes the direct browser grant but before new Web is live, those old suggestions may be lost. Conversely switching Web too soon will fail to persist suggestions until SQL #3. Visitor responses still use a safe fallback, but **zero-loss suggestion capture is not proven**. Keep the gap as short as possible, observe counters, or request specific temporary maintenance approval if an uninterrupted capture guarantee is required. The rate identity normalization also changes from client-rotatable UA+IP hashing to trusted IP hashing at Web cutover.

## G. Rollback and failure stop rules

- **Web regression only, DB still compatible:** restore captured previous Vercel deployment/alias `dpl_4UsYNwDcWEwDFbG3H5QYk9y5ZQqg` *after checking its compatibility against the migrated DB*. A Vercel rollback does not roll back SQL/Auth/Storage.
- **Edge regression:** deploy previously archived byte-for-byte Edge bundle versions v6/v4/v2 only if database/RPC contracts still support them. If SQL #3 has revoked their directly needed paths, blindly restoring old Edge/Web is unsafe; choose guarded forward fix or a controlled recovery plan instead.
- **Migration/data issue:** immediately freeze relevant writes under approved operations, capture logs and current state, evaluate data written since backup, and restore only through an authorized, tested procedure preserving post-backup valid changes when possible. Reversing policy/role grants, replacing `SECURITY DEFINER` bodies or re-enabling public RPCs is not a safe generic rollback.
- **Failure thresholds:** any unauthorized read/write, broken super-admin access, failed Auth or public tracking, excessive 5xx, missing data/files, unverified migration state, insufficient recovery, or OIDC mismatch => STOP/NO PROMOTE. Record evidence, notify owner, do not retry irreversible steps blindly.

## H. Content / OG / release review

- `app/opengraph-image.tsx` declares PNG 1200×630, uses shared `public/Logo hamza agency.jpg`, and falls back for pages without custom CMS assets. The logo asset exists and has been visually inspected, but a **direct screenshot and HTTP verification of the rendered candidate /opengraph-image** and confirmation that the displayed stylized emblem satisfies the exact `ⒽⒶ` identity requirement are still pending. Do not redesign or publish without owner authorization.
- Turkish review candidates (not Production writes): Yaahlan summary `Hamza Ajansı aracılığıyla Yaahlan programına katılın.`; Catchii updates `Catchii programına başvurular şu anda Hamza Ajansı aracılığıyla açıktır.`; TikTok updates `TikTok programına başvurular şu anda Hamza Ajansı aracılığıyla açıktır.`. Preserve published revision/history and require editorial approval.
- Historical QA evidence states TikTok blog article AR/EN/TR published, earlier BIGO Turkish and Yaahlan camera FAQ corrected. Recheck links, registration and contact on the exact released build; no direct Production CMS publication in this task.

## I. Approval register — all individually separate

- Encrypted Production backup location, authorized data-handling operator, coverage, and isolated restore.
- **No owner TOTP enrollment is required for launch.** Any future voluntary enrollment, second factor, break-glass changes or Auth/leaked-password protection settings are distinct owner-controlled operations requiring explicit approval and cost review.
- Supabase migration sequence and execution; temporary maintenance if required.
- Edge Function publication (pr100 and pr116; pr101 only if verified necessary).
- Vercel Production build/alias/deployment, and PR Draft->Ready or merge.
- Content/OG replacements and published Turkish changes.
- Any charges or new infrastructure: **not implicitly authorized**.

**Gate statuses at this preparation point:**
`PRE-MERGE SECURITY: PASS` (based on unchanged candidate SHA and recorded isolated gates)  
`RELEASE PREPARATION: BLOCKED` (combined three-migration and transitional rehearsal still missing)  
`BACKUP READY: BLOCKED` (no comprehensive encrypted, isolated-restore-proven snapshot)  
`OWNER MFA: OPTIONAL — NOT ENROLLED` (not an assertion that Production MFA has been activated; no enrollment prerequisite)  
`PRODUCTION SECURITY ACTIVATION: BLOCKED` (not executed)  
`FULL PRODUCTION CLOSEOUT: BLOCKED` (no merge, activation, or live verification).

## J. Consolidated PR160 local isolated test and evidence — added 2026-11-13

**Implementation:** [single-DB combined test](../tests/pr160-combined-release.sql), invoked from the **admin** branch of [HAMZA macro isolated runtime workflow](../.github/workflows/hamza-macro-runtime-suite.yml). Work remains inside existing PR #160; no new branch, new paid service or Production state mutation.

**Synthetic single-database execution:** the local runner builds its pinned disposable baseline, installs supporting PR3/PR4/PR116/PR120 migrations, then applies `20261111234553` ➜ `20261112121152` ➜ `20261113180500` in this same local Supabase/PostgreSQL database. Immediately after #3, it executes `tests/pr160-combined-release.sql` and existing `tests/pr160-admin-read-mfa.sql` and `tests/pr160-admin-release-boundary.sql`, followed by existing isolated Admin Chromium checks. The SQL test uses `BEGIN`/`ROLLBACK` around all synthetic lookups, nonce rows, role claims and knowledge suggestions. Test data never comes from Production.

**Probes implemented:** check that all three functions/relations exist; `pr160_knowledge_rate_windows` is RLS-protected; `anon` and `authenticated` cannot directly call legacy lookup/suggestion RPCs; `service_role` retains only required trusted RPC invocation and cannot directly read private suggestions rows; only authenticated linked admins can create translation drafts; `pgrst.db_pre_request` points to AAL-aware hook; action nonce constraint includes `knowledge_suggest`; simulated verified OIDC claims admit eight distinct knowledge suggestions from one stable source, refuse the ninth, refuse a Preview write and preserve application, service, job and contact lookup dispatch. Existing SQL tests cover `super_admin`, `deputy_super_admin`, `program_admin`, missing permissions, AAL1 rejection after enrollment and AAL2 acceptance.

**Historical isolated test failures corrected without weakening permissions:** `c8bf100f` initially failed because the test tried to SELECT private knowledge rows as `service_role`; `af6ea235` moved one assertion to an authorized isolated DB observer, and `bf08036a` moved the remaining Preview non-persistence observer. No Production security SQL was changed to make the test pass. **The test is only PASS when GitHub Actions admin job and Full Closeout report success on the current head.**

**Release compatibility matrix (observed source boundaries, NOT a live cutover rehearsal):**

| Transition state | Old Web | New Web | Required operator response |
| --- | --- | --- | --- |
| Old DB and old pr100/pr116 Edge | Existing client tracking and direct suggestion contract | New `knowledge_suggest` request unsupported | Do not promote new Web |
| Backward-compatible new pr100/pr116 Edge with old DB | Legacy operations expected to continue | `knowledge_suggest` dispatched to SQL action missing | Check old actions, keep new Web held |
| SQL #1 then #2, new Edge, old Web | Existing public tracking remains | New administrative draft/MFA pathways can be tested with synthetic admin | Check Data API pre-request, RLS, AAL and actor bridge after #2 |
| SQL #3, new Edge, old Web | Existing direct `pr4_suggest_knowledge` write is denied; visitor fallback response may still work, suggestions may be omitted | New trusted OIDC suggestion path is ready | **Known non-zero-loss capture gap** until Web switch; keep the window brief, monitor and require owner-approved maintenance if zero-loss is mandatory |
| New DB + compatible Edge + reviewed Web | Old Web rollback may silently drop suggestions | Target integrated operation | Smoke test identity, tracking, support and audit before domain promotion |

No claim is made of dynamically deploying both versions together. **An uninterrupted, zero-loss transition cannot be proved solely by CI and requires a separately owner-approved maintenance/cutover choice** (or a separately reviewed temporary compatibility layer).

## K. One-off encrypted backup implementation details (preparation only)

- Confirm project plan/limits and official `supabase db dump --help` for the pinned CLI version **at execution time**. Free projects are not assumed to have managed daily backups. Default Supabase CLI database dump omits row data, custom roles and managed Auth/Storage schemas: capture each required scope explicitly and document unsupported scope, rather than calling it a full backup.
- After owner authorization, use an existing trusted operator machine with sufficient encrypted/private disk (no new infrastructure): securely load the DB connection from a local credential manager, never in command arguments or CI artifacts; enforce `umask 077`. Use the supported schema, roles and row-export options in separate pipes to approved authenticated encryption (`age` recipient or reviewed GPG recipient). Pipe plaintext directly into encryption without generating plaintext files; confirm exit codes for both sides of each pipeline (`set -o pipefail`). Save only ciphertext and manifest/checksums on a pre-existing, private owner-controlled destination.
- Inventory managed Auth separately (users, sessions/factors and identities where supported, migration-compatible secrets/roles, Auth settings), and Storage separately (bucket policy metadata, object metadata **and blob bytes**). Managed-schema SQL export may require elevated grants and a provider-supported procedure. Avoid copying credential hashes/identity documents into source control. If Auth or Storage binary recovery cannot be demonstrated, `BACKUP READY` remains `BLOCKED`.
- **Consistency:** database point-in-time export and Storage byte download do not by themselves form an atomic snapshot. Before taking the approved live copy, define an owner-approved brief write pause or a rigorously tested consistent-object-version strategy; otherwise mark risk of mismatched metadata/files. Export all objects within the agreed window, list hashes and count/bytes, and confirm that newly written content since snapshot is tracked in a recovery journal.
- Restoration verification in the existing approved local isolated Supabase environment must decrypt the archive, run schema/row restore with grants/RLS, verify Auth login and second-factor recovery feasibility, restore Storage blobs and access rules, confirm object SHA-256 and application tracking. Test all of this without exposing Production tokens or customer data in CI/logs. A local synthetic test alone validates mechanics, not real Production restorability.
- Keep encryption private keys off GitHub, the repository and the report. Document key custody and second authorized recovery operator privately. Abort a release on unreadable archive, checksum mismatch, missing managed Auth state, missing Storage files, incompatible schema or unproven recovery. No Production backup or restore has been executed as part of this release preparation.

**Official guidance:** [Supabase database backups](https://supabase.com/docs/guides/platform/backups); [backup and restore with CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Do not execute examples on Production without specific approval.

## L. Post-test review and approval gates

The technical release candidate head is obtained live from [PR #160](https://github.com/hamzaagency1357/hamza-agency/pull/160), **not the earlier inspected `f3e0817a` or documentation baseline `f7663ebc`**. Use [current PR checks](https://github.com/hamzaagency1357/hamza-agency/pull/160/checks) and verify Vercel Preview commit identity after the last update. Production alias remains on the captured `a120fc48` baseline until the owner authorizes a release.

- `PRE-MERGE SECURITY`: retain prior isolated PASS only if every required check remains green on the final head.
- `RELEASE PREPARATION`: needs combined single-DB test PASS, current SHA CI/Preview PASS, transition matrix and finished runbook; cannot substitute unrelated 21/21 tests for the dedicated combined test.
- `BACKUP READY`: BLOCKED without an actual complete encrypted recoverable backup and rehearsal.
- `OWNER MFA`: OPTIONAL — NOT ENROLLED; owner enrollment is not a prerequisite, but existing verified-factor/AAL2 enforcement, session security and any operation-specific AAL2 rules must pass on the release candidate.
- `PRODUCTION SECURITY ACTIVATION`: BLOCKED until explicitly approved migrations/Edge/Web are live and validated; owner MFA enrollment remains optional.
- `FULL PRODUCTION CLOSEOUT`: BLOCKED until Production activation, application/SEO tests and owner sign-off.

Editorial Turkish candidates and Open Graph image are tracked in section H. Neither is a reason to loosen or bypass the independent security gates.
