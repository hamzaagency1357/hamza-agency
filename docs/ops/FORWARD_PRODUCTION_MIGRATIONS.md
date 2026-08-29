# Forward-only Production migrations

## Governing baseline

Production migration history before and including `20260810203000_pr116_admin_oidc_boundary_lockdown` is a frozen legacy baseline. Historical bookkeeping before the anchor is intentionally not repaired or replayed merely to make repository history look canonical.

The verified post-anchor baseline currently contains:

1. `20260825141930_pr120_support_request_trusted_gateway_preparation`
2. `20260826003518_final_security_acl_lockdown`

The controlling rule after the anchor is: verify exact history and security effects, reject unknown post-anchor rows, verify the reviewed target path and SHA-256, prove all required Production gateway functions are ACTIVE, derive an isolated migration workspace from remote history, require an official Supabase dry-run, then apply only the single allowlisted target through official migration tracking.

## Current forward target

- Key: `pr99_trusted_admin_actor_db_bridge`
- Version: `20260827090000`
- Name: `pr99_trusted_admin_actor_db_bridge`
- Path: `supabase/migrations/20260827090000_pr99_trusted_admin_actor_db_bridge.sql`
- SHA-256: `52dc558d547d4978d60dc5e32562fc528fd867e58a88ccfba3082bb6e940db83`
- Apply approval: `APPROVE_HAMZA_PR99_TRUSTED_ADMIN_ACTOR_DB_BRIDGE`

The migration file intentionally has no outer `BEGIN;` / `COMMIT;`. Supabase CLI migration execution provides the transaction boundary and writes migration history in the same batch. Internal PL/pgSQL `BEGIN ... END` blocks are normal function/block syntax and are unrelated to the outer migration transaction.

There is no arbitrary migration-version input. The workflow does not use `--include-all`, `migration repair`, or manual `schema_migrations` writes.

## Modes and execution boundary

`forward_preflight` performs the full reviewed identity/history/effect/function checks and the official Supabase `db push --dry-run` against the isolated remote-history-derived workspace. It does not apply the migration.

`forward_apply` performs the same preflight, requires the exact approval value above, and then runs `migration up --db-url` from the same isolated workspace. Post-apply verification must observe exactly the baseline plus `20260827090000` and the new trusted Admin actor contract.

The Production job runs only for an explicit `workflow_dispatch` on `main`, in the protected GitHub Environment `production-database`.

## Required Production gateways

The forward preflight fails closed unless both of these are present in the exact Supabase Production project:

- `pr100-vercel-oidc-gateway`: exactly version 6 and `ACTIVE`.
- `pr116-admin-oidc-gateway`: exactly one deployed function, positive version, `ACTIVE`, and `verify_jwt=false`.

`pr116-admin-oidc-gateway` must use `verify_jwt=false` because it authenticates the Vercel workload OIDC token and the Supabase user session in its own code. A missing, inactive, ambiguous, or platform-JWT-wrapped PR116 gateway blocks the database migration before dry-run/apply.

## Production concurrency

The Production job uses one repository-wide concurrency group:

- group: `hamza-forward-production-migrations`
- `cancel-in-progress: false`

This queues a later forward-production run instead of cancelling an active migration run. Pull-request contract validation has no Production execution capability because the Production job itself is gated to `workflow_dispatch` on `main`.

## Supabase credential contract

The only Supabase secret required by this workflow is:

- `SUPABASE_PRODUCTION_JIT_TOKEN`

Store it only in the protected `production-database` GitHub Environment. The same short-lived PAT is used as Management API bearer authentication for Temporary Access/JIT and as the temporary Postgres password once the exact mapping exists.

Do not use a permanent database password, service-role key, OAuth redesign, or generic repository-level Production credential. Do not place the token value in source, artifacts, comments, logs, or chat. Revoke it after closeout regardless of configured expiry.

If the Environment secret is missing or unavailable, the workflow fails before any Temporary Access mutation.

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
- startup option: `-c jit=on`

Production SSL enforcement and the live PostgreSQL version are checked fail-closed before database access.

### Current JIT request contract

The current Supabase Studio implementation is the executable compatibility reference for the grant request:

- method: `PUT`
- path: `/v1/projects/{ref}/database/jit`
- body: `user_id` plus `roles`
- each role expiry: Unix timestamp **seconds**, not JavaScript milliseconds

The workflow accepts `roles` or `user_roles` only when reading a server mapping because Management API response shapes may expose either name. It never sends `user_roles` in the grant request.

### JIT ownership contract

Before mutation, the workflow lists mappings and fails if the PAT owner already has a Production JIT mapping. It never overwrites or adopts a pre-existing mapping.

The proposed mapping fingerprint is bound to:

- exact Supabase user ID;
- exact `GITHUB_RUN_ID`;
- one `postgres` role;
- runner `/32` CIDR;
- no IPv6 ranges; and
- exact bounded expiry in Unix seconds.

After a confirmed successful PUT, ownership is persisted before later validation so cleanup can remove the exact run-owned mapping.

If the PUT result is ambiguous because the network fails after dispatch, the workflow performs one fail-closed reconciliation read. It claims ownership only if the live mapping matches the complete proposed fingerprint exactly. If no exact match exists, ownership is not claimed and no DELETE is authorized.

### Cleanup ownership rule

The `always()` cleanup issues a JIT DELETE only when:

1. current-run ownership was persisted;
2. the stored run ID equals the current `GITHUB_RUN_ID`;
3. the user ID is valid;
4. a fresh JIT read/list still shows that same user mapping; and
5. role/CIDR/IPv6/expiry all exactly match the run-owned fingerprint.

If already absent, cleanup is idempotent. If the live mapping differs, cleanup refuses to delete it. A foreign run, foreign user, merely resolved user ID, or unmatched ambiguous mutation can never authorize deletion.

If this run itself enabled project Temporary Access, cleanup restores it to disabled only when the feature ownership belongs to the same run and no JIT mappings remain. Otherwise it leaves unrelated state untouched.

## Management API diagnostics

Management API failures expose only bounded structured `code` and `message` fields when Supabase supplies them. Response bodies, tokens, connection strings, PAT values, and arbitrary fields are never echoed into workflow diagnostics.

## Management API containment

Repository code permits only the exact method/path pairs needed for profile/project/version/SSL/JIT-state reads, JIT grant/read/list, exact-user cleanup DELETE, Temporary Access state, and pooler configuration. Unrelated Auth, Storage, key, organization, or cross-project surfaces fail before network dispatch.

## Legacy isolation mechanism

The workflow never runs `db push` or `migration up` against the repository's full historical `supabase/migrations` directory.

It creates `/tmp/hamza-forward-production`, copies only Supabase config, recreates an empty migrations directory, fetches actual remote history with `migration fetch --db-url`, verifies the target is absent, copies exactly the hash-locked target migration, and performs the official dry-run. Apply mode uses that same workspace and explicit temporary DB URL.

This preserves official Supabase migration bookkeeping while preventing replay of repository-only legacy migrations.
