# HAMZA AGENCY — Execution Mode

This is a tool-neutral repository workflow. Current project status is defined by [`CURRENT_PROJECT_STATE.md`](CURRENT_PROJECT_STATE.md); historical feature instructions do not override it.

## Bounded change mode

Use one bounded branch/PR for one approved scope.

1. Verify current `main` and Production state before writing.
2. Define the exact allowed files/behavior and explicit non-goals.
3. Make the smallest complete change that closes the proven gap.
4. Run the applicable repository gates on the exact Head.
5. Review the complete diff for scope creep, accidental deletions, secrets, and public/internal exposure.
6. Verify the exact Vercel Preview when runtime behavior is affected.
7. Merge only after explicit Owner approval and then verify Production.

## Documentation-only or technical-cleanup changes

- Do not convert stale documentation into Product work.
- Do not change database/Auth/permissions merely to make documentation match an assumption.
- Preserve Owner-locked product copy and business rules.
- Retain useful historical evidence, but mark it historical so it cannot be mistaken for current instructions.
- Keep runbooks focused on what must be done, when, and why; avoid chat transcripts, assistant prompts, or tool-brand-specific execution instructions.

## Database/Auth safety

Any Production database, Auth, user, permission, billing, backup/restore, or business-data write requires a separately approved scope. Follow [`SUPABASE_DATABASE_CHANGE_WORKFLOW.md`](SUPABASE_DATABASE_CHANGE_WORKFLOW.md) for future database work.
