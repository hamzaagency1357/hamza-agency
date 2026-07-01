# HAMZA AGENCY — Supabase Database Change Workflow

## Current operating model

**Manual SQL Workflow documented in Git**

HAMZA AGENCY does not currently use Supabase CLI as an established Production migration workflow.

## Required process for every new Production SQL change

```text
Plan
→ PR review
→ manual Supabase SQL Editor execution
→ Read-Only validation
→ operational test
→ record under docs/sql/applied-production
```

Every Production SQL record must identify its purpose, applied date, execution method, validation result, rollback guidance where applicable, and an explicit `DO NOT RE-RUN` warning after successful application.

## Mandatory rules

- Vercel does not apply SQL automatically.
- GitHub does not apply SQL automatically.
- Supabase CLI must not be used against Production at this time.
- Do not run any of the following without a separate approved Work Package:
  - `supabase db push`
  - `supabase db pull`
  - `supabase migration repair`
  - `supabase link`
- `supabase/migrations/` currently contains Legacy historical files only. It is not a trustworthy Remote CLI History and not an executable queue.
- Do not place new manually applied Production SQL inside `supabase/migrations/`.
- Store new manually applied Production SQL records under `docs/sql/applied-production/`.
- Do not alter Production schema, RLS, policies, data, or functions outside the reviewed manual execution process.

## Future transition to Supabase CLI

A transition to Supabase CLI requires all of the following before any CLI database command is approved:

```text
Production Schema Baseline
+ Migration History Alignment
+ separate approval
```

Until those steps are completed, Manual SQL Workflow documented in Git remains the authoritative database process.
