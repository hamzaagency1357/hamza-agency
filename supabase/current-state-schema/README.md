# HAMZA AGENCY current-state schema snapshot

This directory contains the sanitized, schema-only baseline used to recreate the real application schemas in Supabase Local before the repository migrations and closeout suites run.

## Source and scope

- Source project: the HAMZA AGENCY Supabase Production project.
- Extraction mode: explicit read-only transactions with `default_transaction_read_only=on`, bounded statement timeouts, and `ROLLBACK`.
- Included application schemas: `public` and `private` only.
- Included object classes: tables, columns, sequences, functions, constraints, indexes, views, triggers, RLS state, policies, and grants to the standard Supabase roles.
- Sequence starts are normalized to `1`; no Production sequence values are retained.

## Explicit exclusions

The snapshot contains no rows, fixtures, `INSERT`, `COPY`, `setval`, large objects, auth users, Storage data, managed Supabase schemas, ownership statements, credentials, tokens, passwords, connection strings, or Production environment values.

## Materialization

The transport is split into numbered base64 parts to keep repository writes reviewable. `scripts/closeout/materialize-current-state-schema.mjs` concatenates the parts, decrypts/decompresses the transport locally, verifies the plaintext SHA-256, applies fail-closed content scans, and emits `supabase/current-state-schema/generated/current-state-schema.sql`.

The transport passphrase is intentionally repository-local and is used only as a compression envelope; it is not a secret and provides no security boundary.

The generated plaintext is ignored by Git and must be recreated in CI and local runs from the reviewed transport plus manifest.
