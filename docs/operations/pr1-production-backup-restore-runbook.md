# PR 1 Production Backup and Restore Runbook

This runbook is approval-gated. It prepares evidence only; it does not authorize a Production write, migration, restore, post-deploy script, redeploy, environment change, or Auth change.

## Preconditions

1. Pin the approved PR head SHA and verify all required CI checks and the matching Vercel Preview.
2. Confirm the current Production deployment is `READY`, targets `production`, and `/api/health` reports the deployed commit SHA.
3. Record the Supabase project reference, Postgres major version, migration list, and UTC start time without copying credentials into logs.
4. Use a workstation or runner whose command tracing is disabled for secret-bearing commands. Never echo database URLs, access tokens, service-role keys, or backup encryption keys.

## Pre-change backup

Create two encrypted artifacts using the approved Supabase/Postgres export path:

- Schema-only archive including `public`, `private`, required extensions, functions, policies, triggers, indexes, and migration metadata.
- Application-data archive for required application schemas, excluding ephemeral local fixtures and secrets.

Generate SHA-256 checksums and a manifest containing only:

- UTC creation time.
- Project reference.
- Pinned Production commit and approved migration range.
- Postgres and export-tool versions.
- Artifact names, byte sizes, SHA-256 values, encrypted/unencrypted state, and retention location identifier.
- Explicit statement that the manifest and CI evidence contain no credentials or row contents.

Do not attach database archives to a public GitHub Actions run.

## Isolated restore dry run

1. Provision an already-approved isolated local or non-Production Postgres/Supabase environment. Do not create a paid Supabase branch without separate cost approval.
2. Confirm its hostname/project reference is not Production before restoring.
3. Restore schema first, then required application data.
4. Verify:
   - Restore exits successfully with fail-on-error enabled.
   - Expected schemas and migration history are present.
   - Table, relationship, index, trigger, policy, and function inventories match the manifest.
   - Required tables include `commerce_events`, `marketplace_dispute_messages`, and `sla_runtime_states` after the approved migrations are applied.
   - Required Cart, Orders, Refunds, Disputes, Tasks, SLA, Workflow, OIDC probe, and gateway RPC signatures exist with their expected grants.
   - Representative non-sensitive row counts and referential-integrity checks match the source evidence.
   - Anonymous published-section reads work without invoking an admin helper; draft/unpublished rows remain inaccessible.
5. Run the targeted regression suite, TypeScript, lint, build, secret scan, and migration-safety checks against the isolated environment.
6. Destroy the isolated restored database and temporary plaintext files. Preserve only sanitized logs, manifest, checksums, and the approved encrypted backup according to retention policy.

## Production application sequence after separate approval

1. Reverify the PR head and Production commit.
2. Complete the pre-change backup, checksum, manifest, and isolated restore dry run above.
3. Merge the approved PR.
4. Apply only the approved pending migrations in repository order.
5. Deploy the reviewed `pr101-vercel-oidc-gateway` function only when explicitly included in the Production approval.
6. Verify migration history, grants, policies, public reads, OIDC read-only probe, `/api/health`, `/api/product-expansion/health`, and Production 5xx logs.
7. Run the legacy-RPC revocation script only under its own approval after all replacement routes pass.
8. Create a final encrypted backup and checksum after successful verification.

## Rollback

Stop immediately on migration, grant, policy, Edge Function, health, or public-read regression. Do not improvise destructive SQL.

- Keep the previous Vercel deployment and previous Edge Function version identifiers recorded before the change.
- For application code, revert through a reviewed Git commit/deployment path only when approved.
- For database changes, prefer a forward corrective migration. Any restore or destructive rollback requires a separate explicit Production approval and the verified pre-change backup.
- Do not run the legacy-RPC revocation during rollback unless it was separately approved and verified.
