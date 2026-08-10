# HAMZA AGENCY — Current Pending Release Gates

This is not a feature backlog. The authoritative detailed state is `docs/CURRENT_CLOSEOUT_LEDGER.md`.

## Verified programmatic delta implemented in PR #116

- Desktop Smart Support now uses the active locale: AR `الدعم الذكي`, EN `Smart Support`, TR `Akıllı Destek`; Mobile Dock was already correct.
- Unsupported homepage numeric fallbacks `+7000` and `24/7` were removed; platform count is derived from current program data; Owner-approved 7 years remains.
- Final security migration now includes the five internal PR99 submission RPCs, the two legacy lookup bypasses, and the three internal guard RPCs (`pr99_guard_submission`, `pr100_guard_ai_answer`, `pr100_guard_password_reset`) in the browser-role deny boundary while preserving the internal `service_role` path.
- Preview production-sensitive submissions remain fail-closed.
- Final Agent identity, public Platform Status, Digital Services Smart Support entry, AdminQuickNav fix, and Unified Requests source fixes are preserved.
- No fake content, paid provider activation, Billing change, plan upgrade, Production business-row mutation, Production migration, merge, or force push occurred.

## Current Owner/manual gates

- Primary Admin MFA: current Production audit = 1 active admin, 0 verified MFA.
- Independent Backup Admin + MFA + recovery/login verification: not yet present.
- Supabase Leaked Password Protection: **External Plan Limitation — Owner Decision Required** under the current Free/no-billing policy.
- Authenticated Admin desktop/mobile QA for Unified Requests, floating controls, mobile fit, human wording, and direct URL/action spot checks.
- Android Chrome real-device PWA install QA.
- Owner Final Visual QA on the exact final Preview; current state is not PASS.

## Current Production gates

- Fresh verified Production backup + recovery/dry-run evidence.
- Explicit Owner approval before applying:
  - `20260809095000_pr116_owner_approved_reviews_program_media.sql`
  - `20260810001500_pr116_final_security_boundary_closeout.sql`
- After an approved migration: verify direct browser RPC denial, legitimate OIDC path, lookups, RLS, Reviews/Program Media and Admin moderation as applicable.
- Separate explicit Owner merge approval.
- After merge only: Vercel Production READY, exact `/api/health` commit, final affected-flow smoke.

## Not pending development work

No PR7, cleanup phase, refactor phase, performance-only phase, paid-provider phase, or resurrection of superseded PR1–PR5 work is planned. Any future work after true closeout must be a later bug or new Owner requirement.
