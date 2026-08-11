# HAMZA AGENCY — Current Closeout Ledger

This is the single authoritative closeout ledger for PR #116. It records only current Owner requirements and release gates; it is not a future feature backlog.

## Governing state

- Repository: `hamzaagency1357/hamza-agency`
- PR: `#116`
- Branch: `fix/final-production-professional-closeout`
- Production/main baseline: `6d648a17ee95731413f2651d9188a6858d3f923f`
- Owner QA fix-batch parent Head: `d3a902718c63b8a70f90c0da83c4d0a166cdfa29`
- PR must remain Open / Draft / Unmerged until explicit Owner approval.
- Production remains read-only during this closeout.
- Forbidden before explicit Owner approval: Merge, Ready for Review, Production migration, Production business-data mutation, Billing/plan change, force push/history rewrite.

## Owner-locked facts

- Monthly success opportunity statistic is **`+500`**. It is not `+50`, must not be treated as an error, and remains Admin-editable.
- Approved decorated Arabic agent name remains exactly **`⚔عܓོراب✴سܓོوريا⚔`**.
- `الخدمات` and `الخدمات الرقمية` are intentionally distinct public pages.
- `HAMZA AGENCY` remains the brand name.
- No standalone Cookie Policy is required by this batch.

## Confirmed Owner Final QA findings — current reconciliation batch

| ID | Source | Severity | Status | Fix / evidence contract |
|---|---|---:|---|---|
| H-01 | Owner Final QA | P1 | Fixed code-side; exact-head gate pending | Shared `PublicGlobalHeader` no longer intentionally truncates the desktop brand; responsive breakpoint gives the brand enough room without changing the mobile information architecture. |
| H-02 | Owner Final QA | P1 | Fixed code-side; Owner visual re-QA pending | Header brand/subtitle use tenant/preset-aware Purple/Gold/off-white hierarchy through shared CSS variables. |
| PRG-01 | Owner Final QA | P1 | Fixed code-side; Preview visual re-QA pending | Program cards prefer configured `logo_url`, then valid existing media, and use a neutral mark only when no media exists. |
| PRG-02 | Owner Final QA | P1 | Fixed code-side; Preview visual re-QA pending | Program detail contract continues to load `logo_url`, `hero_image_url`, `mobile_image_url`, `media_display_mode`; missing-media fallback is visually neutral instead of a program initial. |
| DS-02 | Owner Final QA | P1 | Fixed contract-side; Preview interaction re-QA pending | Service request Account ID remains controlled state with no router refresh, unstable input key, defaultValue transition, or value reset; regression contract added. |
| MOB-01 | Owner Final QA | P0 | Fixed code-side; device re-QA pending | Shared measured Dock clearance is applied to public `main` surfaces on mobile. |
| MOB-02 | Owner Final QA | P1 | Fixed code-side; device re-QA pending | Long mobile header menu is viewport-bounded above Dock clearance and overscroll-contained. |
| MOB-03 | Owner Final QA | P1 | Fixed code-side; device re-QA pending | Open mobile menu locks background scrolling and uses a dark backdrop layer. |
| MOB-04 | Owner Final QA | P1 | Fixed code-side; device re-QA pending | Dock panel max-height and scroll behavior are derived from measured Dock + safe-area variables. |
| APP-01 | Owner Final QA | P0 | Fixed code-side; `/apply` re-QA pending | Public mobile `main` clearance prevents fixed Dock overlap with bottom CTAs/content. |
| APP-02 | Owner Final QA | P1 | Guarded code-side; Preview re-QA pending | No intentional dot/helper placeholder is rendered by reviewed shared forms; regression contract rejects standalone dot fallbacks. |
| AI-02 | Owner Final QA | P1 | Fixed code-side; exact Preview answer re-QA pending | Smart Support detects joining-requirements intent and returns grounded program-specific guidance without inventing eligibility; missing requirements are explicitly not invented. |
| REV-01 | Owner Final QA | P1 | Fixed code-side | Public review empty state no longer explains moderation/admin approval workflow. |
| REV-02 | Owner Final QA | P0 | Fixed code-side; no Production write used | Reviewer name is always enabled + required in public config normalization, has localized client validation/marker, and whitespace-only/missing names are rejected at `/api/public-submit`. |
| BLOG-01 | Owner Final QA | P1 | Verified code-side; Preview re-QA pending | Mobile Header and Quick Nav both consume the authoritative Admin-managed navigation contract; Blog remains present in intended/default navigation and explicit Admin visibility is respected. |
| PWA-01 | Owner Final QA | P1 | Fixed code-side | AR/EN/TR install copy no longer says the button is “below”; copy names the actual install action. |
| PWA-02 | Owner Final QA | P1 | Fixed code-side; Android install re-QA pending | Manifest points to a 512×512 PNG route built from existing approved HAMZA AGENCY logo with safe padding/contain and maskable declaration. |
| AR-L10N | Owner Final QA | P1 | Fixed scoped residues | Arabic public labels use `طلبات الانضمام — HAMZA AGENCY`, `الخدمات الرقمية — HAMZA AGENCY`, `تتبع خدمات HAMZA AGENCY`; Smart Support is `الدعم الذكي`. |
| CNT-01 | Owner Final QA | P1 | Fixed code-side | Public Contact copy says the message is sent securely; server/route/RPC/API/OIDC/Supabase wording is absent from the visitor text. |
| CNT-02 / VIS-01 | Owner Final QA | P1 | Guarded code-side; Preview re-QA pending | Reviewed textarea/form sources have no standalone-dot fallback; shared regression test prevents this residue. |
| JOB-01 | Owner Final QA | P1 | Fixed code-side | Arabic visible `CV` residue changed to `السيرة الذاتية غير إلزامية`; EN/TR remain natural in their languages. |

## Previously closed code-side requirements

| ID | Requirement | Priority | Status / evidence |
|---|---|---:|---|
| CL-001 | PR/base/concurrency safety | P0 | Closed. Writes use reviewed current-head checks and normal fast-forward history only. |
| CL-002 | Full Browser Admin mutation boundary | P0 | Closed code-side. Expanded Admin Mutation Guard covers Admin surfaces and shared Admin-access components. |
| CL-003 | Typed PR116 gateway | P0 | Closed. Browser Admin mutations use `Browser → typed Vercel route → PR116 OIDC Admin Gateway → authorized Supabase operation`. |
| CL-004 | Generated dispatcher type safety | P0 | Closed. No broad type or ESLint bypass introduced. |
| CL-005 | Exact read-only Browser RPC allowlist | P0 | Closed. Only reviewed read-only Browser RPC exceptions remain. |
| CL-006 | Preview write denial | P0 | Closed. Preview remains fail-closed before Production business-data mutation. |
| CL-007 | Trusted Admin audit boundary | P0 | Closed. Authoritative audit is gateway-side after verified actor authorization. |
| CL-008 | Owner-approved homepage statistics | P1 | Closed code-side. Owner-locked current monthly success opportunity value is **`+500`** and remains Admin-editable. |
| CL-009 | Statistics Admin → Public | P1 | Closed code-side. Public homepage reads managed statistics with localized labels and safe Owner-approved fallbacks. |
| CL-010 | Navigation Admin → Public truthfulness | P1 | Closed code-side. Public navigation respects Admin-managed visibility. |
| CL-011 | `/digital-services` contract | P1 | Closed code-side. Localized/CMS-backed and shared-navigation integrated. |
| CL-012 | `/apply` contract | P1 | Closed code-side. Localized and preserves public submission gateway. |
| CL-013 | Six application statuses | P0 | Closed code-side / Production gate open. Exactly `new`, `under_review`, `contacted`, `accepted`, `rejected`, `archived`. |
| CL-014 | Admin Blog information architecture | P1 | Closed code-side. `/admin/blog` remains the manager. |
| CL-015 | Human Admin wording | P1 | Closed code-side. Employee-facing technical residue humanized. |
| CL-016 | Global visual hierarchy | P1 | Reconciled in this Owner batch; Owner visual gate remains open. |
| CL-017 | Mobile Dock colors | P1 | Closed code-side. Gold / Royal Purple / semantic WhatsApp green hierarchy preserved. |
| CL-018 | Program / Agent / Admin Login styling | P1 | Closed code-side / Owner visual gate open. Approved Agent identity remains preserved. |
| CL-019 | Exact Admin section color mapping | P1 | Closed code-side. |
| CL-020 | RTL/LTR, mobile/desktop, presets architecture | P1 | Closed code-side / Owner visual gate open. |
| CL-021 | Public route/localization contracts | P1 | Closed code-side; exact-head translation verification required again after this batch. |
| CL-022 | Joining Application details interaction fix | P0 | Closed code-side / Owner authenticated runtime gate open. |
| CL-023 | Admin Blog/login overlay residue | P1 | Closed code-side / Owner visual gate open. |
| CL-024 | Public support copy absent from Admin | P1 | Closed code-side / Owner authenticated spot-check open. |
| CL-025 | Security migration package | P0 | Closed code-side / Production gate open. Prepared only; not applied. |
| CL-026 | Closeout tooling classification / cleanup | P1 | Closed. |
| CL-027 | Local-isolated PR116 gateway positive runtime reconciliation | P0 | Closed. |
| CL-028 | Verified Supabase actor context in trusted RPC bridge | P0 | Closed. |

## Prepared migrations — NOT applied to Production

- `20260809095000_pr116_owner_approved_reviews_program_media.sql`
- `20260810001500_pr116_final_security_boundary_closeout.sql`
- `20260810203000_pr116_admin_oidc_boundary_lockdown.sql`

No Production migration has been executed by this Owner QA fix batch.

## Current release gates

### Owner / manual gates

- Owner public visual re-QA on the new exact Preview, including H-01/H-02, program media, DS-02 typing stability, Dock/forms/menu, AR labels, Contact, Reviews, Blog mobile access and PWA copy/icon.
- Authenticated Admin runtime proof for Joining Applications: first request details, second request details, correct record each time.
- Authenticated Admin desktop/mobile visual QA and direct URL/action permission spot checks.
- Primary Admin MFA verification.
- Independent Backup Admin + MFA + recovery/login verification.
- Android Chrome real-device PWA installation QA.
- Leaked Password Protection remains an external plan limitation under the current Free/no-billing policy; no paid-plan change is authorized.

### Production gates

- Fresh verified Production backup/recovery evidence before any Production DB migration.
- Explicit Owner approval before applying any PR116 Production migration.
- Separate explicit Owner merge approval; PR remains Draft until then.
- Post-merge Production READY / exact health / affected-flow smoke only after merge approval.

## Exact-head freeze rule

After this Owner QA fix batch lands, freeze the new exact Head and run: Lint, Typecheck, Tests, Build, translations, migrations, secrets, Admin Mutation Guard, HAMZA AGENCY Quality Gate, PR99 Management Quality Gate, Current-State Schema Verify, HAMZA AGENCY Full Project Closeout, aggregate/fail-closed, and all required evidence suites. Preview Deployment ID/URL/SHA must match that exact Head and be `READY` before returning to Owner QA.

**Merge = NO · Production Migration = NO · Ready for Review = NO · Billing = NO · Production business-data writes = NO**
