# Forward-only Production migrations

## Governing baseline

Production migration history before and including `20260810203000_pr116_admin_oidc_boundary_lockdown` is treated as a frozen legacy baseline.

The pre-anchor history is known to be non-canonical in bookkeeping. Historical categories include timestamp-only differences, duplicate history rows, reconstructed source migrations, repository-only migrations whose schema effects are already present or superseded, and older equivalence questions that are intentionally not repaired merely for cosmetic canonicality.

This does **not** mean the old SQL is pending, compromised, or safe to replay. Never use the repository's full historical migration directory as authority for a Production replay.

The controlling Production rule after the anchor is:

1. verify the exact anchor identity;
2. verify the current security effects of that anchor;
3. reject every unknown post-anchor migration;
4. verify the exact reviewed target path and SHA-256;
5. verify the exact Production project and reviewed main/application SHAs;
6. verify target-specific current-schema prerequisites;
7. use Supabase's official migration mechanism so SQL execution and migration bookkeeping are one operation;
8. verify the resulting history and schema effects immediately after an apply.

## Anchor

- Version: `20260810203000`
- Name: `pr116_admin_oidc_boundary_lockdown`
- Production project: `fvaurkfnsvsfohpzguho`

Preflight independently checks the important PR116 security effects instead of assuming that a history row alone proves safety.

## Current allowlist

The first and only executable target in this contract is:

- Key: `pr120_support_gateway_preparation`
- Version: `20260823084000`
- Name: `pr100_support_request_trusted_gateway_preparation`
- Path: `supabase/migrations/20260823084000_pr100_support_request_trusted_gateway_preparation.sql`
- Apply approval: `APPROVE_HAMZA_PR120_SUPPORT_GATEWAY_PREPARATION`

There is no arbitrary migration-version input. The later ACL-lockdown migration is intentionally not executable by this first Ops contract.

## Modes

`forward_preflight` is read-only with respect to application/schema data. It checks the repository/main identity, Production project, application health SHA, anchor/history tail, security effects, trusted gateway control-plane state, target hash, target prerequisites, and an official Supabase dry-run. Temporary Database Access control-plane setup is ephemeral authorization state, not a migration or business-data write.

`forward_apply` performs the same preflight and additionally requires the exact Preparation approval value. It may then apply only the allowlisted Preparation migration through the pinned Supabase CLI and immediately repeat the forward-history/effect checks.

## Legacy isolation mechanism

The workflow never runs `db push` or `migration up` against the repository's historical `supabase/migrations` directory.

It creates a transient work directory and uses the explicit temporary JIT database URL with `supabase migration fetch --db-url` to materialize the **actual remote history**. It then copies exactly one hash-locked allowlisted migration into that directory. An official `supabase db push --db-url ... --dry-run` runs against the derived directory. Apply mode uses `supabase migration up --db-url` from the same directory, so official Supabase migration tracking is preserved while already-recorded legacy versions remain skipped and only the new target can be pending.

No `migration repair`, direct `schema_migrations` write, historical timestamp rewrite, legacy SQL replay, `--include-all`, or link-time database password is part of this mechanism.

## Supabase Temporary Database Access

Production currently runs Postgres `17.6.1.127`. Supabase Temporary Database Access requires `17.6.1.081` or newer, so the Production engine supports it.

The workflow uses a dedicated Supabase fine-grained token as both its Management API credential and, only while a JIT mapping exists, the Postgres password. It never stores or requires `SUPABASE_DB_PASSWORD`.

Before any database connection, `scripts/ops/temporary-database-access.mjs` fails closed unless all of the following hold:

- the hard-coded project is exactly `fvaurkfnsvsfohpzguho`;
- the live Postgres version still meets the Temporary Access minimum;
- Production SSL enforcement is already enabled; the workflow will not change SSL enforcement because that setting can reboot the database;
- the supplied token does not have unrelated Auth-config, Storage-config, or API-key read access in the negative-scope probes;
- Temporary Database Access is enabled, enabling only that project-level feature if necessary;
- the current token user's mapping contains exactly one database role: `postgres`;
- the mapping is restricted to the current GitHub-hosted runner's discovered IPv4 address as one `/32` CIDR;
- no IPv6 range is permitted;
- the mapping expires within 45 minutes;
- the client endpoint is a `*.pooler.supabase.com` endpoint and uses the documented IPv4 shared-pooler session port `5432` with `jit=true`;
- the generated database URL requires SSL.

The runner IP restriction is intentionally created dynamically because GitHub-hosted runner addresses are not stable. It restricts each individual run without depending on a brittle static GitHub IP allowlist.

The workflow masks both the token and generated temporary database URL before database commands. The JIT mapping is deleted in an `always()` cleanup step; a cleanup failure fails the workflow. The server-side 45-minute expiry remains a second revocation boundary if runner cleanup cannot complete.

The project-level Temporary Access feature may remain enabled after the job. Enabling the feature by itself grants no database role: the workflow-specific user mapping is still required and is removed after every run.

### Single GitHub secret

The only Supabase GitHub Environment secret required by this workflow is:

- `SUPABASE_PRODUCTION_JIT_TOKEN`

Store it only in the `production-database` GitHub Environment. Do not create `SUPABASE_DB_PASSWORD` and do not create a generic repository-level Production database credential.

For a dedicated fine-grained token, grant only these documented permissions required by this workflow:

- `project_admin_read`
- `project_admin_write`
- `database_jit_read`
- `database_jit_write`
- `database_pooling_config_read`
- `database_ssl_config_read`
- `edge_functions_read`

Do **not** grant `database_write`, `database_config_write`, `database_migrations_write`, Auth config permissions, Storage config permissions, Edge Functions write, API-key permissions, organization administration, or unrelated service permissions.

`project_admin_write` is the one broader-than-ideal permission in this set. Supabase currently requires it to enable Temporary Database Access through `PUT /v1/projects/{ref}/jit-access`; without it, enabling the feature becomes a separate manual dashboard bootstrap. The workflow compensates by hard-coding the Production project and Management API endpoints, using an independently revocable dedicated token, running negative-scope checks, creating only a 45-minute `/32` postgres mapping, and never using the token for unrelated project-management writes. Give the token the shortest practical account-level expiry for the release window and revoke/rotate it independently when that window ends.

## Token and log boundaries

The dedicated token is never written into repository files or artifacts. It is read from the protected `production-database` Environment, masked immediately, and passed to the pinned CLI only through the generated ephemeral database URL and the standard `SUPABASE_ACCESS_TOKEN` runtime environment variable. Query outputs remain transient runner files and are deleted in cleanup.

The workflow does not upload database dumps, raw query artifacts, credentials, or migration internals as public application artifacts.

## PR120 release boundary

The Preparation migration is additive and intentionally preserves the current direct Support RPC compatibility ACL. The ACL-lockdown migration remains outside this Ops PR and must not be applied until PR #120 is merged, the new trusted support path is proven in Production, and a separately reviewed lockdown preflight passes.
