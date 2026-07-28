# HAMZA AGENCY — Phases

## V1 Stabilization and Freeze

### Gate 1 — Navigation and code quality

Status: **implemented, final visual verification pending**

- Existing PR #96 retained.
- No route deleted.
- Desktop Dropdown click guard added.
- Public tracking pages moved to constrained RPCs.
- Vercel Preview build reached `READY` for the security implementation head.

### Gate 2 — Supabase security closeout

Status: **implemented and database-tested**

- Eleven function `search_path` values pinned.
- Trigger-only functions removed from public RPC access.
- Broad public form policies constrained.
- Program writes restricted to active admins.
- Storage object enumeration removed for `media-library`.
- `notifications` RLS and recipient isolation added.
- Compatibility triggers added without deleting or recreating tables.
- No Service Role used.
- No secret changed.
- No data, table, or bucket deleted.

### Gate 3 — Role and Advisor verification

Status: **completed with documented intentional warnings**

- `anon`, authenticated non-admin, and active admin behavior tested.
- No persistent test rows created.
- Search-path, broad-policy, no-notification-policy, and public-storage-listing findings cleared.
- Remaining SECURITY DEFINER warnings are tied to required public readers or internally authorized admin workflows.
- Leaked Password Protection remains unavailable on the current Supabase plan.

### Gate 4 — Production closeout

Status: **blocked**

Required before final approval:

- Confirm Supabase Site URL and password-reset Redirect URL in Dashboard.
- Verify password reset with an approved test account only.
- Complete real-browser visual testing for all required widths, Dropdown behavior at 390px, JavaScript-disabled fallback, console, and all 29 routes.
- Recheck Open Graph asset response.
- Run or independently prove `npm run lint`, `npm run typecheck`, and `npm run build` against the final documentation head.

### Merge rule

PR #96 must remain unmerged until the user gives separate explicit merge approval after all Gate 4 items are proven.
