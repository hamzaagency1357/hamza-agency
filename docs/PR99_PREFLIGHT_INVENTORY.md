# PR #99 Preflight Inventory

Base SHA: `cf74637b5f60123482249ce16a69a1b4f34f3ec6`

## Existing and working

- Admin authentication, role profiles, module permissions, dashboard, applications, service requests, programs, pages, sections, media, announcements, jobs, reviews, success stories, partners, gallery, FAQs, knowledge base, AI support/settings, analytics, activity log, trash, backups, notifications, translation workbench, visual settings, launch checklist.
- Public AR/EN/TR routing and public metadata completed by PR #98.
- Translation revision workflow and published translation reader.
- Page and section publishing metadata, SEO/OG/canonical columns, scheduling columns.
- Manual JSON export and operational metadata tables.
- Public request tracking through constrained RPC functions.

## Existing but incomplete

- Page Builder supported only five section types and used delete/insert plus multi-step publishing from the browser.
- Page versions were generic records without complete page/section snapshots or safe restoration.
- Notifications mixed generated records and local browser state, with limited event types.
- Backup export had no safe restore validation or health integration.
- System health had no dedicated administration route.
- Public form duplicate protection depended partly on local storage.
- Settings contained many identity/navigation/footer/SEO fields but multilingual coverage was inconsistent.

## Missing

- Transactional Page Builder save/publish RPCs.
- Locale-isolated published sections.
- Version retention and restore-to-new-draft operation.
- Privacy-preserving server-side submission guard.
- Project-scoped migration safety snapshot.
- Dedicated `/admin/system-health` route.
- Permanent management quality gate scripts.

## Unsafe or duplicated

- Published sections were unique by page and section key without locale, allowing one locale to overwrite another.
- Multiple historical public section read policies overlapped.
- Browser-driven Page Builder publication could leave a partial state on an intermediate failure.
- Several administrative tables carry legacy duplicate columns; they are retained for compatibility and not rebuilt.

## Requires migration

- Locale column and unique index for published sections.
- Operations metadata for activity logs, backups, versions, and notifications.
- Submission guards, restore operations, transactional RPCs, notifications triggers, and tightened section policy.

## Completed without schema replacement

- Reused `pages`, `sections`, `page_builder_sections`, `version_history`, `activity_logs`, `notifications`, `trash_items`, `backups`, `settings`, `content_translations`, and existing admin permissions.
- No table, route, column, public record, or user data was deleted.
