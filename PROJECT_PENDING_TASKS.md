# HAMZA AGENCY — Current Pending Release Gates

This is not a feature backlog. The authoritative detailed state is `docs/CURRENT_CLOSEOUT_LEDGER.md`.

## Verified programmatic delta implemented in PR #116

- Desktop Smart Support uses the active locale: AR `الدعم الذكي`, EN `Smart Support`, TR `Akıllı Destek`; Mobile Dock remains localized.
- Owner-approved homepage marketing statistics are preserved exactly as content: `7000+` Content Creators, `5+` Available Platforms, `24/7` Support & Follow-up, `7` Years of Experience. They are not runtime metrics and must not be neutralized or replaced by the current database record count without an explicit Owner decision.
- Joining Applications dashboard detail interaction was hardened so the selected application opens in an isolated high-layer dialog; every detail button is a real `type="button"`, the modal resets by application id, and it no longer sits below admin floating controls.
- The Blog management shortcut is no longer a floating overlay and is explicitly hidden on `/admin/login`.
- Public support availability copy is route-gated away from `/admin*` while remaining unchanged on public pages.
- Daily Admin Dashboard wording no longer exposes `Supabase`, `SEO`, `CMS`, or `Page Builder` terminology in the corrected surfaces.
- Public/Admin color hierarchy now uses a near-black base, restrained Royal Purple depth, visible controlled Gold accents, and differentiated text hierarchy while preserving semantic status colors and visual preset architecture.
- Final security migration includes the five internal PR99 submission RPCs, the two legacy lookup bypasses, and the three internal guard RPCs (`pr99_guard_submission`, `pr100_guard_ai_answer`, `pr100_guard_password_reset`) in the browser-role deny boundary while preserving the internal `service_role` path.
- Preview production-sensitive submissions remain fail-closed.
- Final Agent identity, public Platform Status, Digital Services Smart Support entry, AdminQuickNav active-item behavior, current Header/Mobile Dock/Cinematic/Program Media/Cookie/PWA architecture are preserved.
- No paid provider activation, Billing change, plan upgrade, Production business-row mutation, Production migration, merge, Ready-for-Review conversion, force push, or history rewrite occurred.

## Current Owner/manual gates

- Authenticated Admin mobile/desktop runtime QA: open first and second Joining Applications detail records, verify correct content, no dead click/no-op, no overlay collisions, responsive tables/forms, and permission spot checks.
- Owner Visual QA on the exact final Preview: verify public statistics, Gold/Purple/Dark balance, text hierarchy, Admin/Login cleanliness, presets, RTL/LTR and mobile/desktop.
- Primary Admin MFA: current Production audit = 1 active admin, 0 verified MFA.
- Independent Backup Admin + MFA + recovery/login verification: not yet present.
- Supabase Leaked Password Protection: **External Plan Limitation — Owner Decision Required** under the current Free/no-billing policy.
- Android Chrome real-device PWA install QA.

## Current Production gates

- Fresh verified Production backup + recovery/dry-run evidence.
- Explicit Owner approval before applying:
  - `20260809095000_pr116_owner_approved_reviews_program_media.sql`
  - `20260810001500_pr116_final_security_boundary_closeout.sql`
- After an approved migration: verify direct browser RPC denial, legitimate OIDC path, lookups, RLS, Reviews/Program Media and Admin moderation as applicable.
- Separate explicit Owner merge approval.
- After merge only: Vercel Production READY, exact `/api/health` commit, final affected-flow smoke.

## Not pending development work

No PR7, cleanup phase, redesign phase, performance-only phase, paid-provider phase, or resurrection of superseded PR1–PR5 work is planned. Any future work after true closeout must be a later bug or a new Owner requirement.
