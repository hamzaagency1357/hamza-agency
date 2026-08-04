# HAMZA AGENCY current-state schema snapshot

This directory contains the sanitized, schema-only baseline used to recreate the real application schemas in Supabase Local before repository migrations and closeout suites run.

## Direct tracked SQL snapshot

The authoritative artifact is the directly tracked UTF-8 SQL file:

`supabase/current-state-schema/current-state-schema.sql`

There is no OpenPGP envelope, passphrase, encrypted payload, multipart transport, or generated plaintext transport. The reviewed SQL file itself is the snapshot.

## Source and safety

- Extraction runs only on the owner's local machine.
- The database connection is read from `HAMZA_PRODUCTION_READONLY_URL` without echoing it or passing it in process arguments.
- The extraction transaction enforces `default_transaction_read_only=on`, `BEGIN READ ONLY`, bounded statement and lock timeouts, `ON_ERROR_STOP`, and an explicit `ROLLBACK`.
- Included application schemas are `public` and `private` only.
- Managed Supabase schemas such as `auth`, `storage`, `realtime`, and `vault` are excluded.
- GitHub Actions never receives a Production connection and never connects to Production.

## Data-free contract

The snapshot is schema-only and data-free. It contains no rows, fixtures, `INSERT`, `COPY`, `setval`, large objects, auth users, Storage data, ownership statements, credentials, tokens, passwords, connection strings, or Production environment values.

Before the owner finalizer can commit the snapshot, local verification proves:

- UTF-8 byte count: `496138`.
- SHA-256: `3b1890376e3cca966b1dce0979dd2ed089f95237e1067febf4f58e8f1bf776f2`.
- Forbidden data and secret patterns are absent.
- The direct SQL applies to an isolated PostgreSQL/Supabase Local environment.
- All application tables contain zero rows before fixtures.

## Owner command

Run the complete guarded local flow from a clean checkout of the PR branch:

```bash
bash scripts/closeout/run-current-state-schema-owner.sh
```

The runner verifies the local and remote branch heads before reading the connection, clears the connection before finalization, and the finalizer rechecks the remote head before creating its local commit. The finalizer does not push and never force-pushes.
