# HAMZA AGENCY — Translation Phase Audit

**Audit date:** 2026-06-26  
**Purpose:** Record the verified state of the full-translation phase without treating planned work as completed.

---

## 1. Verification scope

This audit was verified against:

- Production/base commit: `8b026a490838444916b264ca80be8e66a6586743`
- Translation engine PR: `#1 — Translation engine foundation`
- PR head at audit start: `db6e34d91b12ca3f42a1d2a4b5c4693615835218`
- GitHub commit checks: Vercel status was `success` for both the production/base commit and the PR head at audit time.

This document distinguishes **production code**, **PR-only code**, and **future work**. It does not claim that a Vercel environment variable exists unless that is independently checked in Vercel.

---

## 2. Confirmed on production (`main`)

### 2.1 FAQ published translations

`/faq` renders `FaqListWithTranslations`.

Confirmed behavior:

- Reads `content_translations` for `source_type = faqs`.
- Reads only translations with `is_published = true` and status `published` or `reviewed`.
- Requires a complete translated `title`, `summary`, and `content` before replacing the Arabic FAQ question, category, and answer.
- When any required translated field is missing, the original Arabic FAQ stays visible.
- English and Turkish FAQ content is rendered LTR when a complete published translation exists.

### 2.2 Knowledge Center published translations

`/knowledge-center` renders `KnowledgeListWithTranslations`.

Confirmed behavior:

- Reads `content_translations` for `source_type = knowledge_base`.
- Reads only published/reviewed rows.
- Requires a complete translated `title`, `summary`, and `content` before replacing the Arabic article fields.
- Falls back safely to Arabic when a translation is incomplete or absent.
- Article cards become LTR for English/Turkish translated content.
- The Knowledge Center category badge is still sourced from the original category field; category translation is not implemented in this component.

### 2.3 Programs are only partially translated

`/programs` already has a partial reader for `source_type = programs`:

- `title` can replace program name.
- `summary` can replace the displayed program summary.
- Other UI labels, status text, visual labels, and many fixed strings remain Arabic.
- It does not use the new shared locale layer yet.

### 2.4 Program detail pages are not translation-aware yet

`/programs/[slug]` does not query or apply `content_translations` in the verified production code.

This means the following still appear from the Arabic program source/fallbacks:

- Program title and description.
- Requirements and benefits.
- Updates and program FAQ.
- Join form labels, buttons, feedback, and supporting UI.

---

## 3. Confirmed in PR #1 only — not on production yet

PR #1 is currently open, mergeable, and targets `main`. It has not been merged.

### 3.1 Files included in the PR

- `lib/i18n/locale.ts`
- `lib/i18n/staticCopy.ts`
- `lib/i18n/translationSources.ts`
- `lib/i18n/translationProvider.ts`
- `lib/i18n/adminTranslationSync.ts`
- `app/api/admin/translations/sync/route.ts`
- `app/admin/translations/automation/page.tsx`
- `components/LanguageSwitcher.tsx`
- `components/AdminQuickNav.tsx`

No SQL, RLS, or database-schema file is included in this PR.

### 3.2 Shared locale foundation

`lib/i18n/locale.ts` provides:

- Supported languages: Arabic (`ar`), English (`en`), Turkish (`tr`).
- Arabic RTL and English/Turkish LTR direction metadata.
- Browser-language default selection when no saved preference exists.
- Shared localStorage key: `hamza-agency-language`.
- Shared language-change event: `hamza-language-change`.
- Updates to document `lang`, document `dir`, body `dir`, and `data-site-language`.

Important limitation:

- This is client-side language state only. It does **not** introduce `/en` or `/tr` routes, language-specific canonical URLs, hreflang, or multilingual sitemaps.
- Existing content components still contain some duplicated locale-reading logic and are not fully migrated to this shared layer.

### 3.3 Static copy foundation

`lib/i18n/staticCopy.ts` contains a small dictionary for common UI text, including home, programs, services, contact, join now, details, WhatsApp, and language-switcher explanatory text.

It is a foundation only. It is not a translation of all public pages or all form/system messages.

### 3.4 Translation source registry

`lib/i18n/translationSources.ts` currently supports only:

- `programs`
- `faqs`
- `knowledge_base`

Each source maps source fields into the common translation fields `title`, `summary`, and `content`.

Not yet supported by the automatic engine:

- CMS pages and sections.
- Homepage and Hero content.
- Services and digital services.
- Jobs.
- Partners.
- Reviews and success stories.
- Announcements and gallery.
- Legal pages.
- SEO metadata.
- Navigation, footer, public forms, and general fixed messages.

### 3.5 Server-side automatic translation provider

`lib/i18n/translationProvider.ts`:

- Reads `OPENAI_API_KEY` only from the server environment.
- Does not expose the key in browser code or repository files.
- Uses `TRANSLATION_OPENAI_MODEL` when configured, otherwise defaults to `gpt-4.1-mini`.
- Supports English and Turkish targets.
- Limits each source field to 12,000 characters before sending it for translation.
- Requests a JSON object with `title`, `summary`, and `content`.

Configuration status:

- The source code is ready to read the variable.
- The presence of `OPENAI_API_KEY` in Vercel must be checked separately in Vercel; repository code cannot prove that it is configured.

### 3.6 Protected admin sync API

`app/api/admin/translations/sync/route.ts`:

- Requires an authenticated Bearer session token.
- Validates the current user through Supabase Auth.
- Checks `admin_users` for active status.
- Allows only `super_admin` and `deputy_super_admin` to run automatic sync.
- Blocks `program_admin` at the server route.
- Reads source data with the authenticated user context and saves through the existing `content_translations` table.
- Limits each API request to 10 unique source items.
- Writes translations using the existing unique key: `source_type, source_id, field_name, language`.

Important behavior to preserve in future changes:

- The server endpoint is the effective security boundary. The client page also checks access, but server-side role validation must remain mandatory.

### 3.7 Translation automation page

`/admin/translations/automation` is included only in PR #1.

It:

- Displays provider configuration status and model name.
- Counts source IDs for programs, FAQ, and Knowledge Base.
- Selects source types and syncs them in client-side batches of 10.
- Adds a QuickNav link named `الترجمة التلقائية`.

Operational limitations:

- It currently loads at most 300 IDs per source type in the browser page. If any source type grows beyond 300 rows, the excess rows are not included in that run.
- It runs selected chunks sequentially. If one API call returns partial failures, the current client error path stops the overall UI flow even if previous items were saved; the response details should be checked before retrying.

### 3.8 Current publication policy in the PR

The automation UI calls the sync API with `publish: true`.

The API also defaults to publishing unless `publish` is explicitly false. Therefore, the current implementation is:

> Automatic translation + automatic publication.

This is different from the manual translation panel, which requires complete content and an explicit reviewed/published state before public display.

**Decision required before the first automatic sync:**

1. Keep automatic translation + automatic publication, or
2. Change the automation workflow to automatic translation + administrative review before publication.

No automatic sync should be run against production content until this policy is explicitly approved.

---

## 4. Existing translation storage and public fallback rules

The existing `content_translations` schema:

- Keeps Arabic source tables unchanged as the source of truth.
- Supports `en` and `tr` only.
- Allows statuses including `draft`, `needs_review`, `reviewed`, `published`, and `archived`.
- Exposes only published/reviewed translations to public visitors.
- Uses a unique row per source type, source ID, field name, and language.

This design supports safe Arabic fallback and avoids empty public content when a translation is unavailable.

---

## 5. Items not completed yet

The full translation phase is **not complete**.

Required next work:

1. Merge PR #1 into `main` and confirm a fresh Vercel Production deployment is successful.
2. Add `OPENAI_API_KEY` in Vercel for Production and Preview, if automatic translation is approved.
3. Decide the publication policy before running automatic sync.
4. Run and review the first translation batch for programs, FAQ, and Knowledge Base.
5. Test Arabic, English, and Turkish behavior in public pages after translations exist.
6. Unify `/programs` with the new source registry/locale foundation.
7. Add translation support to `/programs/[slug]` before claiming program translation is complete.
8. Extend translation sources to CMS pages and sections, then remaining public content.
9. Connect each public page to published translation reads.
10. Add per-item retranslation after Arabic edits, with clear rules for stale translations and review/publish behavior.
11. Add full multilingual routing and SEO only after the content system is stable.
12. Perform mobile and desktop QA for RTL/LTR layouts, language switching, floating controls, and fallback behavior.

---

## 6. Official current conclusion

- FAQ and Knowledge Center published translation reads are live on production and safely fall back to Arabic.
- Programs have partial list-page translation support only; program detail pages are not translated.
- PR #1 provides a tested foundation for centralized locale handling and secure automatic translation, but it is not yet on production.
- No secret configuration, first automatic sync, automatic retranslation after Arabic edits, complete public-page coverage, multilingual routing, or multilingual SEO can be considered completed yet.
- White Label must remain blocked until the full translation system is actually merged, configured, exercised, and verified on the public site.
