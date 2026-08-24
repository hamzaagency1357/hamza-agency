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

Supabase's current Temporary Access documentation supports a Personal Access Token (PAT) or a Scoped PAT as the temporary Postgres password after the user has a valid JIT role mapping. The preferred least-privilege credential for this workflow is a project-bound Scoped PAT.

### Corrected credential availability assumption

As of 2026-08-24, the Owner account does **not** expose Scoped PAT creation in Account → Access Tokens. The visible classic token form and the experimental-API token form provide only name and expiry, with no project binding or permission selection.

Supabase Studio source contains the Scoped PAT creation UI and payload (`permissions`, `project_refs`, and `organization_slugs`), but that UI is guarded by the `scopedPAT` feature flag. The Studio implementation is evidence that Scoped PATs exist in Supabase; it is **not** permission to bypass the feature flag through an undocumented internal Studio endpoint. Until Supabase exposes the feature to this account through a supported Dashboard/public API/CLI path, this workflow must not claim that its runtime token is fine-grained.

PR #122 therefore had one incorrect operational assumption: it correctly designed a seven-permission Scoped PAT boundary, but assumed the Owner could currently create that credential. The database/JIT containment design remains valid; the credential issuance assumption is corrected here.

### Current safe fallback: short-lived classic PAT

For the blocked release window, the supported fallback is a normal/classic PAT created from the standard Supabase Account → Access Tokens flow, with the shortest practical expiry that covers the reviewed closeout window.

A classic PAT is **account-wide**, not project-bound and not permission-bound. Its effective Management API authority is the issuing user's live Supabase platform authority across the organizations and projects that user can access. For an Owner account this is materially broader than the preferred Scoped PAT in two independent dimensions:

- resource boundary: all organizations/projects accessible to the Owner instead of only `fvaurkfnsvsfohpzguho`;
- permission boundary: all Management API operations authorized to the Owner instead of only the seven listed fine-grained permissions.

Consequently, a classic PAT can have unrelated Management API authority such as Auth configuration, Storage configuration, API-key/secrets surfaces, project administration, and other organization/project operations whenever the Owner role permits them. Repository code must therefore treat the token as broad even though the workflow is narrow.

The old PR #122 negative-scope probes are intentionally **not valid for a classic PAT**. They tested whether the credential issuer had withheld unrelated scopes. A legitimate classic Owner PAT is expected to be broader, so keeping those probes would make the supported fallback fail by design. They have been removed explicitly and replaced with a positive fail-closed request allowlist in `scripts/ops/temporary-database-access.mjs`.

The allowlist accepts only the exact Management API method/path pairs used for this JIT flow:

- `GET /profile`
- `GET /projects/fvaurkfnsvsfohpzguho`
- `GET /projects/fvaurkfnsvsfohpzguho/ssl-enforcement`
- `GET /projects/fvaurkfnsvsfohpzguho/jit-access`
- `PUT /projects/fvaurkfnsvsfohpzguho/jit-access`
- `GET /projects/fvaurkfnsvsfohpzguho/database/jit`
- `PUT /projects/fvaurkfnsvsfohpzguho/database/jit`
- `DELETE /projects/fvaurkfnsvsfohpzguho/database/jit/{one-valid-user-uuid}`
- `GET /projects/fvaurkfnsvsfohpzguho/config/database/pooler`

Any different method, unrelated product endpoint, query-string variant, malformed cleanup target, or different project ref fails before a Management API request is sent. The workflow also hard-codes the same Production ref for the only remaining Supabase CLI Management read (`functions list`); it does not accept a user-supplied project ref.

### Why OAuth is not the fallback

Supabase OAuth Apps support Management API scopes, but the published OAuth scopes are product-level (`Database` read/write, `Projects` read/write, `Edge Functions` read/write, and similar), not the seven fine-grained FGA permission IDs above. For example, Database Write covers SQL queries and several database configuration mutations, and Projects Write covers project creation/upgrades/network mutations. That is a broader permission package than the desired JIT-only set.

OAuth also requires an interactive initial authorization flow plus client/refresh-token lifecycle for unattended CI. Most importantly for this specific design, the current Temporary Access guide explicitly documents PAT/Scoped PAT credentials as the temporary Postgres password. It does not document an OAuth access token as that password. Using OAuth here would therefore either rely on an undocumented assumption or require a second database credential. The short-lived classic PAT with repository-side containment is the safer supported fallback for this one closeout workflow.

### Preferred Scoped PAT boundary if/when exposed

If Supabase later exposes Scoped PAT creation to this account through a supported path, bind it only to project `fvaurkfnsvsfohpzguho` and grant only:

- `project_admin_read`
- `project_admin_write`
- `database_jit_read`
- `database_jit_write`
- `database_pooling_config_read`
- `database_ssl_config_read`
- `edge_functions_read`

Do not grant `database_write`, `database_config_write`, `database_migrations_write`, Auth config permissions, Storage config permissions, Edge Functions write, API-key permissions, organization administration, or unrelated service permissions.

### JIT and database containment (unchanged)

Before any database connection, `scripts/ops/temporary-database-access.mjs` fails closed unless all of the following hold:

- the hard-coded project is exactly `fvaurkfnsvsfohpzguho`;
- every direct Management API method/path is on the explicit allowlist above;
- the live Postgres version still meets the Temporary Access minimum;
- Production SSL enforcement is already enabled; the workflow will not change SSL enforcement because that setting can reboot the database;
- Temporary Database Access is enabled, enabling only that project-level feature if necessary;
- the current token user's mapping contains exactly one database role: `postgres`;
- the mapping is restricted to the current GitHub-hosted runner's discovered IPv4 address as one `/32` CIDR;
- no IPv6 range is permitted;
- the mapping expires within 45 minutes;
- the client endpoint is a `*.pooler.supabase.com` endpoint and uses the documented IPv4 shared-pooler session port `5432` with `jit=true`;
- the generated database URL requires SSL.

The runner IP restriction is intentionally created dynamically because GitHub-hosted runner addresses are not stable. It restricts each individual run without depending on a brittle static GitHub IP allowlist.

The workflow masks both the PAT and generated temporary database URL before database commands. The JIT mapping is deleted in an `always()` cleanup step; a cleanup failure fails the workflow. The server-side 45-minute expiry remains a second revocation boundary if runner cleanup cannot complete.

The project-level Temporary Access feature may remain enabled after the job. Enabling the feature by itself grants no database role: the workflow-specific user mapping is still required and is removed after every run.

## Token and log boundaries

The only Supabase GitHub Environment secret required by this workflow is:

- `SUPABASE_PRODUCTION_JIT_TOKEN`

For the current fallback this secret contains the short-lived classic PAT. Store it only in the protected `production-database` GitHub Environment. Do not create `SUPABASE_DB_PASSWORD` and do not create a generic repository-level Production database credential.

The PAT is never written into repository files or artifacts. It is masked immediately and used only by the reviewed workflow. Query outputs remain transient runner files and are deleted in cleanup. The workflow does not upload database dumps, raw query artifacts, credentials, or migration internals as public application artifacts.

Revoke the PAT in Supabase immediately after the PR-A/Preparation operational closeout is complete, regardless of the configured expiry. If the workflow is not going to run, do not create the PAT early.

## PR120 release boundary

The Preparation migration is additive and intentionally preserves the current direct Support RPC compatibility ACL. The ACL-lockdown migration remains outside this Ops PR and must not be applied until PR #120 is merged, the new trusted support path is proven in Production, and a separately reviewed lockdown preflight passes.
