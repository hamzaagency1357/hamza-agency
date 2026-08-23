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

`forward_preflight` is read-only. It checks the repository/main identity, Production project, application health SHA, anchor/history tail, security effects, trusted gateway control-plane state, target hash, target prerequisites, and an official Supabase dry-run.

`forward_apply` performs the same preflight and additionally requires the exact Preparation approval value. It may then apply only the allowlisted Preparation migration through the pinned Supabase CLI and immediately repeat the forward-history/effect checks.

## Legacy isolation mechanism

The workflow never runs `db push` or `migration up` against the repository's historical `supabase/migrations` directory.

Instead it creates a transient work directory, links it to the exact Production project, uses `supabase migration fetch --linked` to materialize the **actual remote history**, and then copies exactly one hash-locked allowlisted migration into that temporary directory. An official dry-run runs against that derived directory. Apply mode uses `supabase migration up --linked` from the same directory, so already-recorded legacy versions remain skipped and only the new target can be pending.

No `migration repair`, direct `schema_migrations` write, historical timestamp rewrite, or legacy SQL replay is part of this mechanism.

## Secrets and logs

The Production job is attached to the `production-database` GitHub environment and expects its Supabase credentials from environment/repository secrets. Secrets are required and masked before network work. The workflow does not upload database dumps, raw query artifacts, credentials, or migration internals as public application artifacts.

## PR120 release boundary

The Preparation migration is additive and intentionally preserves the current direct Support RPC compatibility ACL. The ACL-lockdown migration remains outside this Ops PR and must not be applied until PR #120 is merged, the new trusted support path is proven in Production, and a separately reviewed lockdown preflight passes.
