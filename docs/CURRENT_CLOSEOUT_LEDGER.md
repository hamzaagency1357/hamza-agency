# HAMZA AGENCY — Current Closeout Ledger

This is the single authoritative Final Closeout ledger for PR #116. It contains only current Owner requirements and verified historical findings. New feature ideas, theoretical refactors, and superseded roadmap items are excluded.

## Governing baseline

- Repository: `hamzaagency1357/hamza-agency`
- PR: `#116`
- Branch: `fix/final-production-professional-closeout`
- Verified starting Head: `a9b71c67cccb7d46e3142dc87d3652da39409c11`
- Verified Base/main: `6d648a17ee95731413f2651d9188a6858d3f923f`
- Starting PR state: Open / Draft / Unmerged / Mergeable
- Starting exact Preview: READY and matched the starting Head
- Production: READY and matched Base/main
- Owner Final Visual QA: FAIL until a new exact Final Head is verified and Owner explicitly returns PASS
- Production is read-only during this closeout. No Production migration is authorized by this ledger.

## Status rules

- `Open` means a current requirement still needs a fix or evidence.
- Final state may only be `Closed` or `Not Applicable / Superseded` after real verification.
- `Closed — Already Implemented — No Write` means verified good work was preserved without reimplementation.

## Ledger

| ID | Finding / Requirement | Source | Priority | Current state | Verification before write / root cause | Required minimal fix | Evidence required | Final state |
|---|---|---|---|---|---|---|---|---|
| CL-001 | PR/base/head/concurrency safety | Owner §§0–4 | P0 | Closed | GitHub re-check: PR #116 Open/Draft/Unmerged/Mergeable; start Head and main exact; unrelated Dependabot PRs only | None | PR metadata + main ref | Closed — Already Implemented — No Write |
| CL-002 | No force push/history rewrite/CI bypass | Owner §3 | P0 | Closed | No such operation used in this closeout | Preserve normal commits | Git history / operations | Closed — Already Implemented — No Write |
| CL-003 | Single authoritative Current Closeout Ledger | Owner §5 | P1 | Closed | No authoritative ledger existed in changed-file set | Create this file | Repository file | Closed |
| CL-004 | Internal PR99 write RPCs must not be directly executable by PUBLIC/anon/authenticated | Owner §8 | P0 | Open | Production read-only privilege audit proves `anon` and `authenticated` currently have EXECUTE on the five internal `pr99_submit_*` write functions | Add least-privilege migration; keep service-role/OIDC dispatcher path working | Isolated privilege regression + later Production direct-call denial / legitimate OIDC success | Open |
| CL-005 | Legacy public lookup bypass must be removed | Owner §9 | P0 | Open | Production function/privilege audit proves legacy lookup functions are directly executable and bypass the fingerprint/rate-limit guard used by `pr100_*` wrappers | Revoke direct browser-role EXECUTE on legacy functions while preserving internal wrapper calls | Isolated privilege test + later Production legacy denial / modern wrapper success | Open |
| CL-006 | Preview must not write Production business data | Owner §10 | P0 | Open | Current Vercel OIDC Edge gateway accepts both `preview` and `production` for the same write actions and calls the same Supabase service-role dispatcher | Fail closed for write actions when OIDC environment is `preview`; keep permitted read-only actions explicit | Gateway contract test + exact Preview write denial + Production legitimate path after approved release | Open |
| CL-007 | Leaked Password Protection | Owner §11 | P0 | Open | Current Supabase Security Advisor reports leaked-password protection disabled | Enable in Auth configuration if plan/capability permits; otherwise report external blocker accurately | Advisor/config evidence | Open |
| CL-008 | Primary admin MFA | Owner §11/§93 | P0 | Open | Verification pending; do not infer from CI | Verify factor enrollment without exposing recovery secrets; Owner/manual action if needed | MFA status evidence | Open |
| CL-009 | Backup administrator and recovery capability | Owner §11/§93 | P0 | Open | Verification pending | Verify active backup-admin/recovery path; do not store recovery codes in repo/log/chat | Role/recovery evidence | Open |
| CL-010 | Supabase Advisor findings contextualized, not blindly rewritten | Owner §12 | P0 | Open | Advisor reviewed; many SECURITY DEFINER warnings exist, including confirmed blockers CL-004/005 plus intentional guarded functions needing contextual review | Fix only exploitable/current requirements | Advisor + function authorization evidence | Open |
| CL-011 | Migration #116 remains additive/non-destructive and is not applied to Production without gate | Owner §13/§78/§89 | P0 | Open | Current PR116 migration is additive for Program Media/Reviews and explicitly defers Production; new security privilege changes still need isolated validation | Add only required least-privilege/security changes; isolated test; STOP before Production application | Migration/schema/RLS/security/rollback evidence | Open |
| CL-012 | Production integrity — no business data/settings changed to satisfy tests | Owner §14 | P0 | Closed | All Production checks so far read-only | Preserve | Operation log | Closed — Already Implemented — No Write |
| CL-013 | AR/EN/TR routing remains `/`, `/en`, `/tr` | Owner §15 | P1 | Closed | Existing closeout tests and routing already cover approved routes; no current regression found | None unless exact Preview later disproves | Translation/runtime evidence | Closed — Already Implemented — No Write |
| CL-014 | No Arabic visible fallback / empty EN/TR / developer placeholder | Owner §16 | P1 | Open | Existing translation gates pass on starting Head, but new final Head must be re-checked after identity/copy changes | Preserve current fallback protections and add only targeted regression where needed | final translation tests + exact Preview evidence | Open |
| CL-015 | Turkish contextual copy audit | Owner §17 | P1 | Open | Needs exact source/runtime verification for listed phrases; no blind replacement | Fix only occurrences that remain wrong | source + TR Preview evidence | Open |
| CL-016 | Arabic professional copy cleanup | Owner §18 | P1 | Open | Needs exact source/runtime scan for listed residues | Minimal localized copy fixes only where present | source + AR Preview evidence | Open |
| CL-017 | Final Agent identity: AR unchanged; EN `Agent Hamza`; TR `Temsilci Hamza`; new role lines | Owner §§19–20 | P1 | Open | Current central identity still contains `Godfather of Syria` / `Suriye'nin Vaftiz Babası`; tests also assert the superseded identity | Update central defaults, affected labels/SEO/tests; preserve exact approved Arabic literals/copy/meta | source tests + translation/SEO/runtime evidence | Open |
| CL-018 | Exact decorated Arabic agent rendering is bidi-safe/responsive | Owner §21 | P1 | Closed | Current agent surface isolates decorated literal and existing PR116 tests guard the literal | Preserve | source/test + Owner visual QA | Closed — Already Implemented — No Write |
| CL-019 | Remove Agent Hero `عرض التفاصيل` if present | Owner §22 | P1 | Closed | Current PR116 owner-directive test verifies the hero no longer exposes the disallowed action | Preserve | source/test + Preview | Closed — Already Implemented — No Write |
| CL-020 | Header contract / compact language selector / no Agent in header | Owner §23 | P1 | Closed | Current PR116 header implementation/tests already enforce central agency identity and no agent insertion | Preserve; final visual verify only | header tests + Owner visual QA | Closed — Already Implemented — No Write |
| CL-021 | Footer identity uses new EN/TR names | Owner §24 | P1 | Open | Footer is centralized, but centralized EN/TR agent names are stale and agent-link labels also contain old titles | Update through central identity plus affected link labels | source/test + Preview | Open |
| CL-022 | Cinematic background final PR5 decision | Owner §25 | P1 | Closed | Current decision already implemented: existing background default; cinematic system retained; no forced built-in fallback; safeguards preserved | No Write | PR5/current source + Owner visual QA | Closed — Already Implemented — No Write |
| CL-023 | Smart Support locale labels | Owner §26 | P1 | Open | Existing i18n changed in PR116; final exact source/runtime check required | Fix only remaining mixed-locale label | i18n tests + Preview | Open |
| CL-024 | Approved public support copy; remove old disclaimer; no marketing copy in Admin | Owner §§27/45 | P1 | Open | PR116 support copy changed; admin leakage still requires source/runtime verification | Minimal copy removal if still present | source + Preview/Admin evidence | Open |
| CL-025 | Mobile floating actions include WhatsApp + Smart Support + Menu | Owner §28 | P1 | Open | Existing dock was modified and measured; Owner QA previously saw WhatsApp missing, so exact Preview must verify current state | Restore only if still missing | mobile Preview/Owner QA | Open |
| CL-026 | No overlay/safe-area collisions | Owner §§29–30/44/68 | P1 | Open | Cookie/dock safe-area regression exists; known modal close/admin floating overlays need final exact Preview verification | Fix only reproducible overlap/wrapping | mobile/desktop screenshots or browser evidence | Open |
| CL-027 | Public color hierarchy final polish without redesign | Owner §§31–32 | P2 | Open | Requires exact Preview visual verification across current presets; no redesign authorized | Minimal token/component polish only for real contrast/hierarchy defects | Owner visual QA | Open |
| CL-028 | Reviews: in-site submit, approved success/empty copy, no moderation explanation/fake content | Owner §§33–34 | P1 | Open | PR116 includes review intake/admin flow and empty-state changes; final source/runtime/migration verification required | Preserve; fix only residue | tests + Preview + migration evidence | Open |
| CL-029 | Install App functional + visual contract | Owner §35 | P1 | Open | Current PWA install contract tests exist; Android real-device install remains Owner/manual QA | Preserve functional prompt/fallback; remove technical wording if found | tests + exact Preview + real-device Owner QA | Open |
| CL-030 | Cookie contract | Owner §36 | P1 | Open | Existing cookie test includes accept/necessary/manage/reopen and safe-area; exact Preview after final Head still required | No redesign; fix regression only | e2e + Owner QA | Open |
| CL-031 | Marketplace not prominent when empty; no fake content | Owner §§34/37 | P2 | Open | Current navigation/indexing visibility needs final exact verification | Hide/de-emphasize only if still prominent while empty | source + Preview | Open |
| CL-032 | Public Platform Status has no technical internals | Owner §38 | P0 | Open | Existing SEO/no-index contract exists but human-readable content needs exact verification | Remove public SHA/Supabase/runtime internals if present | source + Preview | Open |
| CL-033 | Portal login secondary and permission-safe | Owner §39 | P1 | Open | Current usage/visibility and direct-url protections need final verification | Minimal navigation/permission fix only if current gap exists | source + permission evidence | Open |
| CL-034 | Digital Services exposes Smart Support naturally | Owner §40 | P1 | Open | Needs exact current-source verification | Add minimal CTA/link only if absent | source + Preview | Open |
| CL-035 | No unverified hard-coded marketing claim fallbacks | Owner §41 | P1 | Open | Needs targeted scan for `+7000`, `+5`, `24/7`, `7 سنوات` and equivalents | Keep real Owner settings; neutralize only unverified hardcoded fallback | source/tests | Open |
| CL-036 | Program Media current architecture and fallbacks | Owner §42 | P1 | Open | PR116 migration/UI contains required media fields/modes/layout; isolated migration and visual fallback verification still required | No schema reimplementation; fix only verified gaps | schema test + program surfaces + Preview | Open |
| CL-037 | Admin requests open/view blocker | Owner §43 | P0 | Open | Known Owner QA failure; exact current route/modal/permission verification required | Root-cause and minimal fix if still reproducible | admin functional evidence desktop/mobile | Open |
| CL-038 | Admin Blog / guide floating overlays | Owner §44 | P1 | Open | Known Owner QA finding; exact current Admin needs verification | Reposition/integrate only overlapping controls | Admin desktop/mobile evidence | Open |
| CL-039 | Admin mobile tables/cards/filters/actions fit viewport | Owner §46 | P1 | Open | Known historical finding; exact current Admin needs verification | Responsive pattern only where overflow reproduced | Admin mobile evidence | Open |
| CL-040 | AdminQuickNav active matching | Owner §47 | P1 | Open | Need exact source verification for `pathname.startsWith(...)` false multiple-active behavior | Minimal exact/root-aware matcher if still present | unit/source + Admin evidence | Open |
| CL-041 | Admin professional UX, section accents/sidebar/guidance/dashboard | Owner §§48–55 | P1 | Open | Current Admin must be compared to Owner contract; no wholesale rebuild authorized | Close only verified gaps using existing structures/real data | source + Admin visual/functional evidence | Open |
| CL-042 | Permission-aware sidebar + direct URL/action permissions | Owner §§51/69 | P0 | Open | PR4 permission hardening exists historically; final direct-url audit required because hiding links is insufficient | Fix only actual least-privilege gap | permission tests + DB/function evidence | Open |
| CL-043 | Human Admin action/status/trash/history labels; no developer UI | Owner §§57–67 | P1 | Open | Requires targeted current-source/runtime audit | Localized human labels; technical details only behind appropriate admin disclosure | source + Admin QA | Open |
| CL-044 | PR1–PR5 historical gaps not resurrected when superseded | Owner §§70–71 | P1 | Open | Historical register review pending; current Owner directive is authoritative | Mark superseded items N/A; implement only current required subset | ledger evidence | Open |
| CL-045 | Privacy/Legal current functionality/localization | Owner §72 | P0 | Open | Existing legal pages/acceptance exist; final exact verification required | Fix only broken consent/localization/stale technical wording | functional + translation evidence | Open |
| CL-046 | SEO final closeout and stale identity residue removal | Owner §§73–74 | P1 | Open | Current central SEO still has old EN/TR agent identity; final residue scan needed for all listed phrases | Update only affected identity/metadata/residue; preserve correct SEO architecture | SEO tests + sitemap/canonical/runtime evidence | Open |
| CL-047 | Responsive final audit public + admin | Owner §75 | P1 | Open | Owner QA currently FAIL; exact Final Preview required | Fix only reproducible clipping/overlap/readability/contrast defects | Desktop/mobile RTL/LTR Owner QA | Open |
| CL-048 | Public functional closeout | Owner §76 | P0 | Open | Starting CI is green, but final Head and Owner/manual flows still required; Production writes are not used for fake QA | Targeted then final regression | functional/e2e evidence | Open |
| CL-049 | Admin functional closeout | Owner §77 | P0 | Open | Known requests-open failure and permission/mobile findings require verification | Fix only reproduced blockers/gaps | Admin functional evidence | Open |
| CL-050 | Backup/restore before any Production DB change | Owner §§78/89/93 | P0 | Open | No Production DB write has been performed in this closeout | Real backup + verification + isolated restore/dry-run before migration gate | backup/restore evidence | Open |
| CL-051 | Performance/advisor warnings are not automatic release blockers | Owner §79 | P2 | Closed | Directive explicitly supersedes optimization-only work absent a real bug | No optimization phase | ledger decision | Not Applicable / Superseded |
| CL-052 | Paid/external providers are not current development gaps | Owner §80 | P2 | Closed | Current Owner operating policy excludes paid AI/WhatsApp/payment/app-store activation | Do not activate or advertise as active | ledger decision | Not Applicable / Superseded |
| CL-053 | Documentation reconciliation | Owner §81 | P1 | Open | Existing README/final delivery/PR body still need final Head synchronization after fixes | Reconcile only after code/security state is final | docs diff | Open |
| CL-054 | Risk-based focused tests then one final full regression | Owner §§82–86 | P0 | Open | Starting Head CI green, but it predates new final corrections | Run focused checks while fixing, then required final suite on exact Final Head | GitHub Actions + exact evidence | Open |
| CL-055 | Exact Preview must match Final Head | Owner §87 | P0 | Open | Starting Preview matches starting Head only; any new commit invalidates it for Owner QA | Wait for new READY deployment matching Final Head | Vercel deployment SHA/ID/URL | Open |
| CL-056 | Owner Final QA gate | Owner §88 | P0 | Open | Explicit current state is FAIL | STOP for Owner review only after technical ledger open items are closed and exact Preview is ready | Owner PASS | Open |
| CL-057 | Production migration gate | Owner §§89–90 | P0 | Open | Production migration not authorized | After Owner PASS, report backup/migration/rollback/evidence and await explicit approval | Owner approval + Production migration evidence | Open |
| CL-058 | Final merge gate / Production deploy / smoke | Owner §§91–93 | P0 | Open | Merge not authorized | Await explicit Owner merge approval after all prior gates | merge/deployment/health/smoke evidence | Open |
| CL-059 | Main branch hardening | Owner §94 | P2 | Open | Capability/plan verification deferred until release gate | Apply only if available without blocking delivery | repository settings evidence or external limitation report | Open |
| CL-060 | Definition of Done / absolute STOP | Owner §§95–97 | P0 | Open | Cannot be closed before Owner QA, required migration gate, merge, Production deployment, and final smoke | Close only at true delivery completion; then no new development phase | final report | Open |

## Current verified blocker summary

At ledger creation, the verified current blockers are:

1. Direct browser-role EXECUTE remains on internal PR99 write RPCs.
2. Direct browser-role EXECUTE remains on legacy lookup RPCs that bypass the modern fingerprint/rate-limit guard.
3. Preview OIDC is accepted for production-sensitive write actions through the shared Supabase gateway path.
4. Supabase reports leaked-password protection disabled.
5. EN/TR public Agent identity still uses superseded `Godfather of Syria` / `Suriye'nin Vaftiz Babası` values, and at least one current test protects those stale values.
6. Known Owner QA failures (Admin request opening, WhatsApp action visibility, floating overlays/responsive issues) still require exact-current reproduction before any fix.

No Production write, Production migration, merge, force push, or history rewrite has been performed.