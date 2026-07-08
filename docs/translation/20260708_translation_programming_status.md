# HAMZA AGENCY — Translation Programming Status

Date: 2026-07-08

This document records the official translation-programming state after F6-B3 and F6-C1/C2A preparation.

## Official baseline

- Repository: `hamzaagency1357/hamza-agency`
- Main baseline commit: `2123ff82db21cd27d155eb6efa9d2c38a1c8227a`
- F6-B3 status: complete and clean
- F6-B4 lifecycle QA: deferred
- Full content translation: not started as a bulk operation yet
- Translation content publishing remains manual after review

## Completed translation infrastructure

### F6-B1 — Revision Foundation

Implemented the revision data foundation for the translation lifecycle.

Core tables:

- `translation_source_revisions`
- `content_translation_revisions`
- `content_translation_revision_fields`

### F6-B2.1 — RPC access and publish lifecycle

Implemented protected lifecycle RPCs for revision candidates, review, and publish.

Core behavior:

- Candidate draft creation
- Candidate fields save
- Review transition
- Publish transition
- Published revision field reading
- Restricted admin access for `super_admin` and `deputy_super_admin`

### F6-B2.2A — Admin revision review page

Implemented `/admin/translations/revisions` as the main Revision Lifecycle review surface.

Core behavior:

- Shows revision states
- Supports review and publish flow
- Blocks stale or incomplete publish
- Shows source snapshot context

### F6-B2.2B — Gemini automation as Candidate-only flow

Updated Gemini automation so generated translations become reviewable candidates only.

Core behavior:

- Maximum 10 items per batch
- One language per run
- Supports English and Turkish
- Does not auto-publish
- Does not overwrite existing Draft / Needs Review / Reviewed / Published revisions

### F6-B2.2C — Public reader revision-first fallback

Implemented the public reading order:

1. Published Revision
2. Published Legacy `content_translations`
3. Arabic source fallback

Draft / Needs Review / Reviewed / Stale candidates are not public.

### F6-B3 — Controlled backfill and stale lifecycle

Completed controlled Supabase backfill and post-apply verification.

Confirmed results:

- Backfill executed once on Production
- Legacy translations stayed unchanged
- `translation_source_revisions`: 6 records
- `content_translation_revisions`: 10 records
- Fingerprint parity: 0 mismatches
- Translation invalidation triggers now use `mark_translation_revisions_stale_on_source_change`
- Visible old invalidation trigger path is no longer active on target content tables

## F6-C1 audit results

The programming audit confirmed:

- Public translation reader exists and supports Revisions + Legacy fallback
- Official source definitions exist for the required source types
- Source fingerprinting is implemented
- Gemini automation API is basically safe
- Most dynamic public content is bound to published translations

Supported official source types:

- `programs`
- `pages`
- `sections`
- `faqs`
- `knowledge_base`
- `partners`
- `jobs`
- `reviews`
- `success_stories`
- `gallery_items`
- `announcements`

## F6-C2A current state

PR #78 was opened for Public Direction + Static Fallback Binding Fix.

Status at the time of this document:

- PR: #78
- Branch: `fix/f6-c2a-public-translation-ui`
- Head SHA: `1482a63a99aa34753b9bb35e53b046e5566cb439`
- Vercel Preview: Ready
- PR state: Open / Unmerged / Mergeable
- Code review: passed
- Visual Preview: not verified from assistant tools

Scope of PR #78:

- Replace fixed public `dir="rtl"` wrappers with language-aware public main wrappers
- Replace inline Arabic back-home links in selected pages
- Keep Gallery media-library items excluded from fake translation
- Improve Knowledge Center static fallback language handling

## Current risks and caveats

- PR #78 still needs true visual preview verification before merge if strict visual-gate policy remains active
- Admin specialized translation pages still publish Legacy `content_translations`, while the official post-F6-B3 path is Revision Lifecycle
- Static UI translation is partial and requires a final sweep
- Language SEO is not yet multilingual
- Full content translation has not yet been executed

## Remaining programming work — titles only

1. F6-C2A Preview Verification + Merge PR #78
2. F6-C2B Public Binding Completion Sweep
3. F6-C3 Admin Revision UX Hardening
4. F6-C4 Translation Coverage Dashboard
5. F6-C5 Static UI Final Sweep
6. F6-C6 Automation UX Hardening
7. F6-C7 Language SEO / hreflang
8. F6-B4 Resume — Full Translation Lifecycle QA
9. Content Translation Batch Execution — Programs
10. Content Translation Batch Execution — CMS Pages
11. Content Translation Batch Execution — Sections
12. Content Translation Batch Execution — FAQ
13. Content Translation Batch Execution — Knowledge Base
14. Content Translation Batch Execution — Partners
15. Content Translation Batch Execution — Jobs
16. Content Translation Batch Execution — Reviews
17. Content Translation Batch Execution — Success Stories
18. Content Translation Batch Execution — Gallery Items
19. Content Translation Batch Execution — Announcements
20. Final Multilingual Public Content Review

## Deferred full-project development titles

1. Domain Email Setup
2. Social Links Finalization
3. Search Console Monitoring
4. Password Reset from Admin Login
5. White Label System
6. Advanced Page Builder
7. KPI Dashboard
8. Advanced Notification Center
9. Full Audit Mode Expansion
10. Trash Restore System
11. CSV / Excel Export System
12. Unified Admin Access Completion
13. Cookie / GDPR Banner
14. PWA Completion
15. AI Support Advanced Version
16. Advanced Background Presets
17. Menu Load Timing Fix
18. Application Tracking Improvements
19. Service Request Tracking Improvements
20. Breadcrumb Structured Data
21. Multilingual SEO Completion
22. Final Production Readiness Review
