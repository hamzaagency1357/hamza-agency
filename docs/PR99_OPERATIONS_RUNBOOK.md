# PR #99 — Management & Operations Runbook

## Scope

This runbook covers the non-destructive migrations:

- `20260728190000_pr99_preflight_backup.sql`
- `20260728192000_pr99_management_operations.sql`

Project ref: `fvaurkfnsvsfohpzguho` only.

## Safety evidence

Before schema changes, the first migration stores a private, RLS-protected snapshot of the content and operations tables in `operations_preflight_backups`, including row counts and a SHA-256 checksum. It does not include authentication secrets or environment variables.

The operations migration is transactional and does not drop tables, columns, routes, or rows. The former two-column sections uniqueness index is replaced by a locale-aware three-column index after backfilling `sections.language` from existing settings.

## Verification

Run read-only checks for:

1. Snapshot exists for `PR99_COMPLETE_MANAGEMENT_OPERATIONS` and project ref matches.
2. Counts of pages, sections, settings, translations, notifications, versions, and backups are not lower than the snapshot unless an explicitly audited operation occurred.
3. RLS remains enabled on public and administrative tables.
4. `sections_page_language_key_uidx` exists.
5. RPC functions have fixed `search_path` and grants are limited to intended roles.
6. AR, EN, and TR rows can coexist for the same page and section key.

## Rollback plan

No destructive automatic rollback is provided because reverting by dropping newly added structures could destroy operational history created after deployment. Safe rollback is forward-only:

1. Disable calls to the new RPCs in the application by reverting the UI commit.
2. Keep additive columns and audit tables in place.
3. Restore a selected page through `restore_page_version`, which creates a pre-restore version first.
4. For a full content incident, compare the private preflight snapshot and apply a reviewed, entity-scoped restoration transaction.
5. Never hard-delete the snapshot or version history as part of an incident response.

## Backup retention

- Page versions: latest 30 versions per page.
- Notification archival: archive through the admin interface; no automatic hard delete.
- Preflight snapshots: retain until PR #100 operational closeout is completed and a later reviewed retention decision exists.

## Scheduled backup policy

Automated backup orchestration must use the existing free GitHub Actions allowance only after repository variables are available. Backup payloads containing operational data must never be uploaded as public artifacts or committed to Git. Manual JSON backup remains available to authorized administrators.
