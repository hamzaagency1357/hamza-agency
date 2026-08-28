# Forward-only Production migrations

## Governing baseline

Production migration history before and including `20260810203000_pr116_admin_oidc_boundary_lockdown` is a frozen legacy baseline. Historical bookkeeping before the anchor is intentionally not repaired or replayed merely to make repository history look canonical.

The verified post-anchor baseline currently contains:

1. `20260825141930_pr120_support_request_trusted_gateway_preparation`
2. `20260826003518_final_security_acl_lockdown`

Those are historical applied baseline rows. PR120 remains part of Production history, but it is **not** the active forward target anymore.

The controlling rule after the anchor is: verify the exact history and security effects, reject unknown post-anchor rows, verify the reviewed target path and SHA-256, derive an isolated migration workspace from remote history, require an official Supabase dry-run, then apply only the single allowlisted target through official migration tracking.

## Current forward target

The only active executable target is:

- Key: `pr99_trusted_admin_actor_db_bridge`
- Version: `20260827090000`
- Name: `pr99_trusted_admin_actor_db_bridge`
- Path: `supabase/migrations/20260827090000_pr99_trusted_admin_actor_db_bridge.sql`
- SHA-256: `ee8e342eef5e6e0a677f4fe981b66de8eac2bf2446896bc8260a9063a58decd5`
- Apply approval: `APPROVE_HAMZA_PR99_TRUSTED_ADMIN_ACTOR_DB_BRIDGE`

There is no arbitrary migration-version input. The workflow does not use `--include-all`, `migration repair`, or manual `schema_migrations` writes.

## Modes and execution boundary

`forward_preflight` performs the full reviewed identity/history/effect checks and the official Supabase `db push --dry-run` against the isolated remote-history-derived workspace. It does not apply the migration.

`forward_apply` performs the same preflight, requires the exact approval value above, and then runs `migration up --db-url` from the same isolated workspace. Post-apply verification must observe exactly the baseline plus `20260827090000` and the new trusted Admin actor contract.

The Production job runs only for an explicit `workflow_dispatch` on `main`, in the protected GitHub Environment `production-database`.

## Production concurrency

The Production job uses one repository-wide concurrency group:

- group: `hamza-forward-production-migrations`
- `cancel-in-progress: false`

This queues a later forward-production run instead of cancelling an active migration run. Pull-request contract validation has no Production execution capability because the Production job itself is gated to `workflow_dispatch` on `main`.

## Supabase credential contract

The only Supabase secret required by this workflow is:

- `SUPABASE_PRODUCTION_JIT_TOKEN`

Store it only in the protected `production-database` GitHub Environment. For the current supported fallback it is a **fresh short-lived Supabase Personal Access Token (classic PAT)**. The same token is used as:

- Bearer authentication for the narrow Supabase Management API allowlist used by Temporary Access; and
- the temporary Postgres password after a valid JIT mapping exists.

Do not use a permanent database password, service-role key, OAuth redesign, or generic repository-level Production credential. Do not place the token value in source, artifacts, comments, or chat. Revoke it after the closeout run regardless of its configured expiry.

If the Environment secret is missing or unavailable, the workflow fails before CLI installation or any Temporary Access mutation with the safe diagnostic `required Production Supabase JIT token is unavailable`.

## Temporary Database Access safety

The contained flow remains pinned to:

- project: `fvaurkfnsvsfohpzguho`
- minimum PostgreSQL version: `17.6.1.081`
- role: `postgres`
- one GitHub-runner IPv4 `/32`
- no IPv6 CIDR
- maximum mapping lifetime: 45 minutes
- trusted shared Supavisor host ending in `.pooler.supabase.com`
- session port: `5432`
- SSL required
- `jit=true`

Production SSL enforcement and the live PostgreSQL version are checked fail-closed before database access.

### JIT ownership contract

Knowing the authenticated Supabase `user_id` does **not** establish ownership.

Before the workflow updates the current user's JIT mapping, it reads the current JIT mapping/list. If a mapping for that user already exists, the workflow fails with `pre-existing Production JIT mapping detected; refusing to modify it`. It does not overwrite, extend, shorten, change, or delete that mapping.

When no mapping exists, the workflow submits the reviewed one-role JIT mapping. Ownership is established only after the Management API PUT has returned a successful response. The ownership state is persisted immediately after that confirmed success and before later response/schema verification, so a confirmed mutation can still be cleaned up if a later validation step fails.

Run-owned mapping state is bound to safe non-secret data:

- exact Supabase user ID;
- exact `GITHUB_RUN_ID`;
- `created_by_this_run = true` state;
- runner `/32` CIDR; and
- exact expiry used for the mapping.

If the PUT result is ambiguous (for example, the request may have reached the server but the client did not receive a confirmed successful response), the workflow does **not** claim ownership and cleanup does not issue a blind DELETE. The server-side expiry remains the bounded fallback.

### Cleanup ownership rule

The `always()` cleanup issues a JIT DELETE only when all of the following are true:

1. this run recorded `created_by_this_run = true` after a confirmed successful PUT;
2. the stored owner run ID exactly equals the current `GITHUB_RUN_ID`;
3. the stored Supabase user ID is valid;
4. a fresh JIT list/read still shows a mapping for that exact user; and
5. that live mapping still matches this run's role/CIDR/expiry ownership fingerprint.

If the mapping is already absent, cleanup is idempotent and succeeds without DELETE. If the live mapping no longer matches the run-owned fingerprint, cleanup refuses to delete it. A foreign run ID, foreign user, pre-existing mapping, merely resolved user ID, or unconfirmed PUT can never authorize DELETE.

If this run itself enabled the project-level Temporary Access feature, cleanup restores it to disabled only when that feature state is owned by the same GitHub run and no other JIT mapping exists. Otherwise it prefers leaving the feature enabled over modifying unrelated access state; enabling the feature alone grants no database role.

## Management API containment

Repository code permits only the exact Management API method/path pairs needed for this flow, including profile/project/version/SSL/JIT-state reads, JIT list/read/update, exact-user cleanup DELETE, and pooler configuration read. Requests for unrelated Auth, Storage, key, organization, or cross-project surfaces fail before network dispatch.

The current JIT update payload follows the supported Management API shape using `user_id` plus `user_roles`.

## Legacy isolation mechanism

The workflow never runs `db push` or `migration up` against the repository's full historical `supabase/migrations` directory.

It creates `/tmp/hamza-forward-production`, copies only the Supabase config, recreates an empty migrations directory, fetches the actual remote migration history with `migration fetch --db-url`, verifies the target is absent, copies exactly the hash-locked target migration, and then performs the official dry-run. Apply mode uses that same workspace and explicit temporary DB URL.

This preserves official Supabase migration bookkeeping while preventing replay of repository-only legacy migrations.

## Historical note: PR120

`20260825141930_pr120_support_request_trusted_gateway_preparation` was a previous forward target and remains part of the required post-anchor Production baseline. The related support/ACL closeout has already advanced past that target. References to PR120 in historical rationale are retained only as history; they must not be interpreted as the currently executable migration.
