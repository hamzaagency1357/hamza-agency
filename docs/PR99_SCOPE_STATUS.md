# PR #99 Scope Status

This file is an implementation checklist, not a claim that unfinished items are complete.

## Implemented in this branch

- Project-scoped pre-migration safety snapshot with checksum and RLS.
- Locale-aware published section identity for AR/EN/TR coexistence.
- Transactional Page Builder draft save and publish RPCs.
- Expanded Page Builder section catalog, duplicate/hide/reorder, SEO/OG/canonical editing, unsaved-change protection, locale preview links.
- Automatic page version creation, retention of the latest 30 versions, and restore into a new draft with a pre-restore version.
- Activity logging for Page Builder save, publish, and restore.
- Database notifications for new applications/service requests/job applications and status changes with idempotent event keys.
- Privacy-preserving server-side submission guard foundation.
- Dedicated system health administration route.
- Migration, secret, unit, build, and runtime smoke quality scripts.

## Still requires implementation or verification before Ready for Review

- Wire all public forms to server-side guarded submission RPCs and remove direct anonymous inserts where appropriate.
- Complete multilingual administration fields across every requested CMS entity, not only the existing translation workbench and Page Builder.
- Add safe backup restore dry-run UI and fixture restore test.
- Add scheduled encrypted/protected backup execution without public artifacts.
- Complete notification pagination, mark-all-read, support/publish/backup/security event sources.
- Complete Trash integration and two-confirmation permanent delete for every requested entity.
- Complete generalized Activity Log triggers for all administrative operations.
- Add public renderer for all Page Builder section types and verify newly created arbitrary pages resolve publicly in AR/EN/TR.
- Add authenticated browser E2E for create/publish/version/restore/status workflows and viewport overflow checks.
- Verify Vercel Preview, runtime logs, and all final administration routes.

PR #100 is not started.
