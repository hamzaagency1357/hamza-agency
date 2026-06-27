# HAMZA AGENCY — Translation Review Before Publish Policy

**Effective branch:** `main`  
**Effective date:** 2026-06-27  
**Scope:** Automatic translation for `programs`, `faqs`, and `knowledge_base`.

---

## Official workflow

```text
Arabic source → Automatic translation → needs_review → Administrative review → Manual publish → Public display
```

Automatic translation must never publish a translation directly.

## Enforced storage state

Every translation generated through `POST /api/admin/translations/sync` is saved with:

- `status = "needs_review"`
- `reviewed = false`
- `is_published = false`

The server route enforces these values and does not accept a publication decision from the browser request.

## Monitored test controls

The automation UI starts with no source, item, or target language selected.

For the first monitored run, the UI requires all of the following before it enables the action:

1. One source type.
2. One specific source item.
3. One target language: English or Turkish.

The UI submits exactly one item and one target language for this controlled test. The server route rejects requests with no explicit valid target language and never defaults to English and Turkish together.

The server keeps its existing limit of ten unique items per request for later, separately approved operational workflows. This limit does not make the monitored UI a bulk-translation screen.

## Public visibility

Public translation readers must continue to read only rows that are manually marked as reviewed/published and `is_published = true`.

Until an administrator reviews and manually publishes a complete translation in `/admin/translations`, the public site continues to show the Arabic source fallback.

## Security and operational rules

- Translation access remains limited to active `super_admin` and `deputy_super_admin` accounts at the server route.
- `OPENAI_API_KEY` remains server-only and is not stored in GitHub or browser code.
- No automatic translation run is part of this UI/API policy change.
- No SQL, database schema, or RLS change is part of this policy.

## First monitored test

When Production is ready, translate one FAQ into English only. Confirm it remains `needs_review` and invisible publicly before reviewing and publishing it manually.
