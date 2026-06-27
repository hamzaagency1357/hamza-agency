# HAMZA AGENCY — Translation Review Before Publish Policy

**Effective branch:** `feat/translation-engine-foundation`  
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

## Public visibility

Public translation readers must continue to read only rows that are manually marked as reviewed/published and `is_published = true`.

Until an administrator reviews and manually publishes a complete translation in `/admin/translations`, the public site continues to show the Arabic source fallback.

## Security and operational rules

- Translation access remains limited to active `super_admin` and `deputy_super_admin` accounts at the server route.
- `OPENAI_API_KEY` remains server-only and is not stored in GitHub or browser code.
- No automatic translation run was executed while applying this policy.
- No SQL, database schema, RLS, or `main` branch changes are part of this policy commit.

## First monitored test

When a secret is configured in Vercel and Production is ready, the first test must translate one FAQ into one target language only. Confirm it remains `needs_review` and invisible publicly before reviewing and publishing it manually.
