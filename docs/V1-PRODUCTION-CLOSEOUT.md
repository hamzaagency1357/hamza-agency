# HAMZA AGENCY V1 — Production Closeout

Date: 2026-07-26

## Scope and safeguards

This closeout used the existing PR #96 and branch `chore/g0-codebase-safe-cleanup` only.

Safeguards honored:

- No direct update to `main`.
- No PR merge.
- No new PR.
- No Service Role.
- No secret or API-key change.
- No RLS disable.
- No table/data deletion or table recreation.
- No official social links added.

## Applied migrations

### `20260726043000_v1_security_closeout.sql`

- Pins safe `search_path` values.
- Restricts function EXECUTE grants.
- Replaces broad form/program policies with purpose-limited checks.
- Adds minimal public tracking RPCs.
- Removes public Storage enumeration.
- Enables explicit recipient-based notification policies.

### `20260726043100_v1_security_compatibility.sql`

- Preserves the existing AI-support payload contract.
- Preserves dynamic notification-state persistence.
- Adds only nullable compatibility columns and normalization triggers.

Both migrations contain rollback guidance. Compatibility columns are intentionally retained during rollback to avoid destructive data loss.

## Advisor findings and disposition

### Cleared

- Eleven mutable function search paths.
- RLS enabled without notification policies.
- Six broad write policies.
- Public listing policy for the `media-library` bucket.
- Public RPC access for trigger-only functions.

### Intentional and constrained

- Public service/application tracking RPCs: required for V1 tracking, exact-input lookup, minimal response fields.
- Published translation reader: public published fields only.
- Authenticated admin helpers and translation workflow functions: internal authorization checks remain mandatory.

### Not available without plan change

- Leaked Password Protection: Supabase documents this as a Pro-plan-or-higher feature. It was not enabled and no cost was introduced.

## Role-test results

- Anonymous visitor: no notification table access; no admin RPC access; constrained tracking RPCs available.
- Authenticated non-admin simulation: admin checks false; no notification visibility.
- Active super-admin simulation: admin and super-admin checks true; administration read path remains available.
- Tests used local transaction settings and rollback; no test data persisted.

## Preview and runtime

- The Vercel Preview associated with the security implementation head reached `READY` and its Vercel status check succeeded.
- Queried Preview warning/error logs were empty.
- Historical Production logs contained an Open Graph rendering error. Current source has explicit flex display, but the Preview asset fetch timed out, so final OG verification remains open.

## Required final evidence

The following are not marked complete:

1. User confirmation of Site URL `https://hamza-agency.com` and Redirect URL `https://hamza-agency.com/admin/reset-password` in Supabase Auth.
2. Password-reset delivery and completion using an approved test account.
3. Real-browser test of all 29 routes and widths `360 / 390 / 430 / 768 / 1024 / 1366`.
4. Dropdown and floating-control verification at 390px on the final Preview.
5. JavaScript-disabled fallback and browser-console verification.
6. Final Open Graph response verification.
7. Independent final-head evidence for lint, typecheck, and build.

## Current decision

**Needs Fixes**

PR #96 remains open and unmerged pending proof of the outstanding final evidence and the user's separate explicit merge approval.
