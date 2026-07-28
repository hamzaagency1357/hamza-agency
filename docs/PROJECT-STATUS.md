# HAMZA AGENCY — Project Status

Last updated: 2026-07-26

## Decision

**Needs Fixes** before final merge approval.

## Repository state

- Repository: `hamzaagency1357/hamza-agency`
- Pull request: `#96`
- Branch: `chore/g0-codebase-safe-cleanup`
- Base branch: `main`
- PR remains open and unmerged.
- `main` was not modified by this closeout work.
- Official social links were not added.

## Completed in this closeout

- Restored a stable desktop Dropdown click path on the existing PR branch.
- Replaced public direct reads of sensitive request tables with constrained tracking RPCs.
- Added and applied reviewed, non-destructive Supabase migrations:
  - `20260726043000_v1_security_closeout.sql`
  - `20260726043100_v1_security_compatibility.sql`
- Fixed the eleven mutable `search_path` findings.
- Removed public RPC access from trigger-only and administrative functions where it was not required.
- Tightened broad public form insert policies.
- Restricted program management to an active administrator.
- Removed public Storage object enumeration while retaining existing public object URLs.
- Added explicit recipient-based RLS policies for `notifications`.
- Preserved compatibility for AI support and notification-state persistence.

## Verified security behavior

- `anon` cannot read or write notifications.
- `anon` cannot execute administrative helper functions.
- `anon` can execute only the intentionally public, constrained tracking and published-translation readers.
- A simulated authenticated non-admin is not recognized as an administrator and sees no notifications.
- The active super-admin identity is recognized by admin policies.
- Role tests ran in rolled-back transactions and created no persistent test data.

## Remaining findings

- Security Advisor now reports only intentionally callable `SECURITY DEFINER` functions plus leaked-password protection.
- Public tracking RPCs are intentionally callable because public tracking is a V1 requirement; they return limited fields and require exact verification inputs.
- Published translation reading is intentionally public and limited to published fields.
- Admin functions remain callable by `authenticated` because their bodies enforce active-admin authorization.
- Leaked Password Protection is unavailable on the current plan; Supabase documents it as Pro-plan-or-higher.
- Password reset Site URL and Redirect URL require user-side Dashboard confirmation and were not verified in this run.
- Full visual matrix testing at `360 / 390 / 430 / 768 / 1024 / 1366`, JavaScript-disabled behavior, and authenticated browser flows could not be completed because the execution environment had no browser automation runtime.

## Preview

- Latest verified Vercel deployment for the recorded security head reached `READY`.
- Vercel build status succeeded.
- No warning/error logs were found for that Preview in the queried time window.
- A historical Production `/opengraph-image` error was found; the current source already contains the required explicit flex display, but the Preview asset request timed out and therefore is not marked fully verified.
