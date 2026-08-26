# HAMZA AGENCY — Supabase Database Change Workflow

## Current operating model

Production database changes are migration-led, review-gated, and never implied by the presence of a file in a branch. Repository migration history has been reconciled with the current Production identities.

Current identities:

- Preparation: `20260825141930_pr120_support_request_trusted_gateway_preparation`
- Stage-2 Production identity: `20260826003518_final_security_acl_lockdown`

Stage-2 is applied and verified. Reconciliation was completed through PR #125/#126. Do not rename, replay, repair, or reapply these migrations for documentation purposes.

## Required process for a future Production database change

```text
Define bounded change
→ create/review migration and rollback evidence
→ verify current migration history and schema state
→ pass repository/isolated verification
→ obtain explicit Production-write approval
→ apply only the approved migration through the approved current execution path
→ verify Production state and affected flows
→ record exact applied identity/evidence
```

## Mandatory rules

- Vercel deployment must not silently apply Production SQL.
- GitHub CI must not silently apply Production SQL.
- Never use `db push`, migration repair, history mutation, or equivalent Production-changing commands merely to make local and remote histories look aligned.
- Never place credentials, access tokens, database passwords, recovery material, or service-role secrets in migration files or documentation.
- A future execution mechanism must be selected from the capabilities and permissions available at that time; documentation must not assume a PAT/JIT path is required.
- Any Production schema, RLS, policy, grant, function, Auth, or data write requires a separately approved scope.
- Read-only verification may be used to prove current state, but it does not authorize a write.

## Current closeout restriction

Documentation + Technical Exposure Closeout is repository/code/docs-only. It authorizes no Production migration, schema write, Auth change, user/permission mutation, backup/restore, or business-data write.
