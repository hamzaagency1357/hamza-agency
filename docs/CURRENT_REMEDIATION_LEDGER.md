# HAMZA AGENCY — Current Remediation Ledger

This is the governing ledger for the Final Remediation Program. It records confirmed audit findings and explicitly separates stale/reverify/owner-decision items from work that is safe to execute. Historical closeout documents are not current-state authority.

Baseline verified before remediation:

- GitHub `main`: `d5c4de481c3894795eab40653f765dbabb218e19`
- Production deployment: READY and built from the same SHA
- Production domain: `https://hamza-agency.com`
- Supabase Production project: `fvaurkfnsvsfohpzguho` (`Hamza-Agency`, ACTIVE_HEALTHY)
- Owner lock: monthly success opportunity remains `+500`
- PR-A branch: `fix/final-security-boundaries`

Statuses: `CONFIRMED`, `NEEDS REVERIFY`, `STALE`, `CLEARED`, `OWNER DECISION`, `BLOCKED`.

| ID | Source | Severity | Confirmed? | Affected files / surface | Production impact | Remediation PR / Ops | Test evidence | Preview evidence | Production evidence | Final status |
|---|---|---:|---|---|---|---|---|---|---|---|
| SEC-01 | Authenticated Admin permission audit | Critical | Yes | `lib/server/adminMutationBoundary.ts`, Admin entity mutation API, PR116 Admin OIDC gateway | `admin_permissions` mutation can inherit deputy fallback at app/gateway layers even though DB DML is stricter | PR-A | Targeted super/deputy regression tests in PR-A | Exact-head preview/evidence gates required | Current source + Production DB contract | CONFIRMED |
| SEC-02 | Public support security audit | Critical | Yes | `/api/support-request`, `pr4_create_support_request` | Direct `anon`/`authenticated` EXECUTE bypasses API anti-abuse layer | PR-A two-stage release | Staged isolated direct-RPC deny + trusted-path tests required | Exact-head preview/evidence gates required | Production catalog: SECURITY DEFINER; anon/auth EXECUTE=true until ACL lockdown | CONFIRMED |
| SEC-03 | Public support abuse controls | High | Yes | Support API / trusted backend / DB function | Direct bypass currently avoids fingerprint/rate guard; payload bounds exist but trusted-path backstop is incomplete until release completes | PR-A two-stage release | Staged trusted gateway/guard tests required | Exact-head preview/evidence gates required | Current API and function definitions | CONFIRMED |
| SEC-04 | SECURITY DEFINER grants audit | High | Yes | Public functions / grants | 13 SECURITY DEFINER functions are anon-executable; broad revocation could break intended contracts | PR-A matrix + targeted ACL lockdown only | Staged privilege assertions required | N/A | Production catalog read-only evidence | CONFIRMED |
| SEC-05 | `pr116_apply_trusted_admin_actor_context` review | Medium | Yes, defense-in-depth only | PR116 trusted actor RPC | Broad EXECUTE exists, but prior audit proves non-service activation/spoof is rejected | PR-A review only unless compatibility-safe tightening proven | Existing gateway/security contract tests + targeted recheck | N/A | Production grants + prior audit | CONFIRMED |
| SEC-06 | Legacy Admin email fallback | Medium | Not obsolete yet | `adminAccess`, server Admin mutation boundary, PR116 gateway, DB helpers | Current active Admin is user_id-bound and no legacy permission rows exist, but schema still permits NULL and future provisioning invariant is not proven | PR-A verify; remove only if invariant proven | Compatibility regression assertion | N/A | Active admins=1; missing user_id=0; admin_users.user_id nullable=YES | NEEDS REVERIFY |
| DEP-01 | Dependency audit — Next 15 | High | Yes | `package-lock.json`, Next runtime | Security advisories on resolved 15.5.19 | PR-B | Pending Node 24 audit/build | Pending | Prior dependency audit | CONFIRMED |
| DEP-02 | Dependency audit — sharp | High | Yes | Transitive/runtime dependency tree | Vulnerable range `<0.35.0`; no user-controlled exploit path proven | PR-B | Pending dependency tree/build | Pending | Prior dependency audit | CONFIRMED |
| DEP-03 | Dependency audit — PostCSS/nanoid/Playwright | Medium | Yes | Dependency tree / CI | Dependency hygiene and CI supply-chain exposure | PR-B | Pending Node 24 audit/tests | N/A | Prior dependency audit | CONFIRMED |
| AUTH-01 | Production Auth audit | High | Yes | Admin authentication | Active super admin has no verified MFA factor | Controlled Ops | Enrollment + login regression required | N/A | Production Auth read-only audit | OWNER DECISION |
| AUTH-02 | Production Auth audit | High | Yes | Supabase Auth setting | Leaked Password Protection disabled | Controlled Ops | Auth regression required | N/A | Production Auth read-only audit | OWNER DECISION |
| AUTH-03 | Admin security audit | Medium | Yes | Admin auth/activity logging | Login/MFA/privilege anomaly alerting should reuse existing logging where possible | Controlled Ops / code only if needed | Pending | Pending if code changes | Audit evidence | CONFIRMED |
| DB-01 | Migration-history audit | High | Yes | `supabase_migrations.schema_migrations` vs repo | Historical lineage diverges despite recent PR116 tail matching | Controlled Ops reconciliation | Read-only reconciliation only before approval | N/A | Production migration history | CONFIRMED |
| DB-02 | Backup/recovery audit | High | Yes | Application backup/recovery | Backup active; no completed recorded restore test | Controlled isolated recovery exercise | Non-production restore proof required | N/A | `restore_tested_at` absent in audit evidence | CONFIRMED |
| PUB-01 | Browser/public audit | High | Yes | Shared public header | Desktop nav overflows near 1280px | PR-C | Target widths/languages | Pending | Production browser measurement | CONFIRMED |
| PUB-02 | Localization audit | High | Yes | Shared EN/TR chrome/navigation | English pages can leak Arabic labels; Turkish must be rechecked for leakage | PR-C | Translation verifier + targeted browser | Pending | Production audit | CONFIRMED |
| PUB-03 | Identity audit | High | Yes | Privacy/Terms/footer/shared chrome/metadata | English identity wording has historical inconsistency | PR-C | Canonical identity contract tests | Pending | Production/source audit | CONFIRMED |
| PUB-04 | Localization audit | Medium | Yes | 404 + offline | Base 404/offline experiences contain locale mixing/incomplete localization | PR-C | AR/EN/TR route tests | Pending | Production/source audit | CONFIRMED |
| PWA-01 | PWA audit | High | Yes | `app/manifest.ts`, `public/manifest.json`, service worker | Conflicting manifests/icons; locale cache classification gaps | PR-C | PWA/SW upgrade tests | Pending | Production/source audit | CONFIRMED |
| PUB-05 | Historical public audit | Medium | Mixed | `/en/track`, `/en/blog`, `/en|tr/apply` | Older reports may be stale | PR-C reverify current head only | Targeted reproduction only | Pending | Conflicting later evidence | NEEDS REVERIFY |
| PUB-06 | Tracking audit | Medium | Mixed | `/track` | Raw status enum only if current legacy route still exposes it | PR-C only if reproduced | Targeted route test | Pending | Later status routes already mapped | NEEDS REVERIFY |
| PUB-07 | Public-content audit | Medium | Yes | `/services`, `/digital-services` | Visitor-facing copy exposes internal admin workflow wording | PR-C | Copy contract | Pending | Production audit | CONFIRMED |
| PUB-08 | Metadata audit | Medium | Yes | Cookie/platform/marketplace/offline/special public pages | Some locale metadata remains English-only | PR-C | Metadata locale tests | Pending | Source/production audit | CONFIRMED |
| CONTENT-01 | Program-policy audit | High | Conflicting | TikTok TR published content + publication validator | Acceptance must never be guaranteed; current published record must be reread before write | PR-C + Owner-approved content write if needed | Semantic policy validator | Pending | Conflicting historical reports | NEEDS REVERIFY |
| CONTENT-02 | Program translation audit | Medium | Historical | BIGO TR summary; Yaahlan EN title | Potential awkward/incorrect published translation records | PR-C + Owner-approved content write only if still present | Targeted record tests | Pending | Prior production audit | NEEDS REVERIFY |
| CONTENT-03 | CMS translation audit | Medium | Yes | Dynamic multilingual CMS | Published content may rely on runtime fallback when locale records are missing | PR-C low-risk warning/gate | QA gate tests | Pending | Source audit | CONFIRMED |
| FORM-01 | Forms/accessibility audit | Medium | Yes | Joining/program/contact/service/reviews | Missing/incomplete HTML semantics and field-level accessible errors | PR-C | Form/accessibility tests | Pending | Source audit | CONFIRMED |
| FORM-02 | Server validation audit | High | Yes | Public form APIs | Server remains validation source of truth; normalize/size/enums/error handling need targeted proof | PR-C | API negative tests | Pending | Source audit | CONFIRMED |
| FORM-03 | Smart Support contact audit | Medium | Yes | Support handoff | WhatsApp must remain explicit `contactType: whatsapp` where UI distinguishes it | PR-C | Support request contract | Pending | Source audit | CONFIRMED |
| SUPPORT-01 | Smart Support architecture audit | High | Yes | AI support knowledge retrieval | Per-question sitemap + many no-store page fetches is inefficient | PR-C | Bounded-cache/source tests | Pending | Source audit | CONFIRMED |
| SUPPORT-02 | Smart Support UX audit | Medium | Yes | Smart Support client | Timeout/retry/friendly aria-live failure UX incomplete | PR-C | Component/API tests | Pending | Source audit | CONFIRMED |
| HDR-01 | Security-header audit | High | Yes | Production CSP | `unsafe-eval`/`unsafe-inline` remain; hardening must be incremental | PR-C | CSP + app regression tests | Pending | Production headers audit | CONFIRMED |
| HDR-02 | Fingerprinting audit | Low | Yes | Next config/header | `X-Powered-By` should be disabled | PR-C | Header assertion | Pending | Production header audit | CONFIRMED |
| ADM-01 | Admin UX audit | Medium | Yes | Activity Logs | Raw internal action names appear as primary labels | PR-D | Changed-area Admin tests | Pending | Authenticated Admin audit | CONFIRMED |
| ADM-02 | Admin UX/security audit | High | Yes | Backup/Restore | Technical terms and raw error messages are overexposed to staff | PR-D | Error-redaction + UI tests | Pending | Authenticated Admin audit | CONFIRMED |
| ADM-03 | Admin localization audit | Medium | Yes | Translation Coverage | English technical labels remain in primary Arabic UI | PR-D | Changed-area locale tests | Pending | Authenticated Admin audit | CONFIRMED |
| ADM-04 | Admin UX audit | Low | Yes | System Health/Audit | Technical identifiers are legitimate for Super Admin but should be under advanced details | PR-D | Changed-area tests | Pending | Authenticated Admin audit | CONFIRMED |
| ADM-05 | Admin copy audit | Low | Yes | Dashboard copy | Strongly gendered Arabic phrasing can be neutralized without redesign | PR-D P3 only | Targeted copy check | Pending | Current dashboard otherwise approved | CONFIRMED |
| EXP-01 | Technical exposure audit | High | Yes | Public deploy/API/static assets/errors | Remove unnecessary source maps/debug/QA/docs/raw errors/internal links and framework disclosure where feasible | PR-D | Public exposure probe | Pending | Public/source audit | CONFIRMED |
| EXP-02 | AI-attribution audit | Low | Yes | Public source/content | No “built with AI” development attribution found; AI Support/AI Policy are real product features and remain | Preserve | Exposure probe | N/A | Audit evidence | CLEARED |
| EXP-03 | QA endpoint audit | Low | Guarded | `/api/pr99-e2e`, `/api/pr100-oidc-runtime-check` | Current guards are safe; remove only if proven obsolete and CI-independent | PR-D reverify | CI dependency check | Pending | Source audit | NEEDS REVERIFY |
| REPO-01 | Repository exposure audit | Medium | Yes | GitHub visibility / internal docs | Repo is Public; private visibility preferred by Owner but requires integration impact review and separate approval | Controlled GitHub setting | Deployment/CI integration check | N/A | GitHub reports visibility=public | OWNER DECISION |
| DOC-01 | Documentation audit | Medium | Yes | README/current pending/closeout docs | Multiple historical status claims are stale | PR-E | Documentation consistency check | N/A | Repository audit | CONFIRMED |
| DOC-02 | Governance audit | Medium | Yes | Closeout ledgers | More than one file may claim current truth | PR-E | Single-authority check | N/A | Repository audit | CONFIRMED |
| CONTENT-04 | Empty public sections | Low | No bug | Jobs/reviews/success stories | Empty content is not a security bug; no fabrication/hiding without Owner decision | None | N/A | N/A | Owner directive | OWNER DECISION |

## PR-A execution notes

PR-A is intentionally limited to security-boundary fixes. The implementation is complete in the Draft PR, but the coordinated Production release remains **IN PROGRESS / BLOCKED** until the staged migration sequence, exact-head gates, and Production migration preflight all pass.

The previously combined, unapplied PR-A migration is split into two ordered release stages:

1. `20260823084000_pr100_support_request_trusted_gateway_preparation.sql` — preparation only. It adds the trusted `support_request_create` DB action and preserves the old public support RPC ACL so the existing Production app remains compatible.
2. `20260825142000_final_security_acl_lockdown.sql` — ACL lockdown only. It revokes browser execution on the five already reviewed SECURITY DEFINER targets after the trusted path is proven operational.

Production gateway `pr100-vercel-oidc-gateway` v6 is already ACTIVE as the additive Edge prerequisite. At the time of this source update, Production application still runs `d5c4de481c3894795eab40653f765dbabb218e19`, neither staged PR-A migration has been applied, and `pr4_create_support_request` still permits the legacy anon/authenticated path. Do not mark Production fixed until both stages and targeted verification complete.

The legacy Admin email fallback remains `NEEDS REVERIFY` until the repository proves a durable provisioning invariant (not merely today’s clean data). The current Production state alone is insufficient to delete a compatibility path safely.
