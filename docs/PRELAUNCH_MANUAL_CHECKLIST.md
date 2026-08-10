# HAMZA AGENCY — Final Pre-Launch Manual Checklist

Only manual/external/Production gates remain here after the current repository delta. This is not a development backlog.

## 1. Administrator security

- Enable MFA for the primary real administrator and verify login with the factor.
- Store recovery material privately outside GitHub/chat/logs.
- Create a real independent Owner-controlled Backup Administrator with least privilege.
- Enable Backup Admin MFA.
- Verify primary + backup login, logout, recovery/password-reset path, session refresh/revocation and permission boundaries.

Current Production audit: 1 active admin, 0 verified MFA, no independent backup admin verified.

### Leaked Password Protection

Current Supabase plan is Free. Required protection is unavailable under the current no-billing policy. Record: **External Plan Limitation — Owner Decision Required**. Do not fake PASS or silently upgrade.

## 2. Exact Preview Owner QA

Use only the Vercel Preview whose SHA equals the final PR #116 Head.

### Public AR/EN/TR — desktop + mobile

Check only current closeout items:

- exact Owner-approved homepage statistics are visible: `7000+` Content Creators, `5+` Available Platforms, `24/7` Support & Follow-up, `7` Years of Experience;
- statistic numbers use visible restrained Gold;
- Black/Near-black remains the base, Royal Purple is clear but does not wash the whole page, and Gold is present without dominating all text;
- headings, body, secondary text, metadata, links, CTAs and important numbers have visibly different hierarchy;
- Desktop Smart Support: AR `الدعم الذكي`, EN `Smart Support`, TR `Akıllı Destek`;
- Mobile Menu + Smart Support + WhatsApp availability;
- no overlay/safe-area/close-button breakage;
- Cookie controls and reopening;
- Reviews honest empty/submission state;
- Program Media fallback;
- decorated Arabic Agent and EN/TR Agent identity;
- no Arabic residue in EN/TR;
- visual hierarchy remains coherent across available Owner presets, RTL/LTR and desktop/mobile;
- no developer wording / public commit SHA/internal status details.

### Admin unauthenticated login

- `/admin/login` shows Login UI and only elements necessary for sign-in.
- `إدارة المدونة` is absent.
- `دليل الإدارة` and other internal admin shortcuts are absent.
- the public support phrase is absent.

### Admin authenticated — desktop + mobile

- On the main Dashboard, press `عرض التفاصيل` for the first Joining Application: the same request details open.
- Close it and press `عرض التفاصيل` for a second Joining Application: the second request data opens correctly.
- No dead navigation, invalid fragment, silent no-op, or stale first-request content.
- Blog management shortcut does not cover tables, content, buttons or menus.
- public support copy does not appear anywhere in `/admin*`.
- visible daily Admin wording does not expose `Supabase`, `SEO`, `CMS`, `Page Builder`, RPC/SQL/JSON/raw database names or raw backend errors.
- Unified Requests opens the intended Application and Service Request.
- Job/Contact routes do not rely on invalid fragments.
- tables/cards/forms do not destructively clip on mobile.
- one active navigation item only.
- direct URL + important action authorization samples respect permissions.

If a finding is not reproduced, do not redesign it.

## 3. Android Chrome PWA real-device gate

- Open the final public release candidate on Android Chrome.
- Where direct install is supported, verify **تثبيت التطبيق** (and EN/TR equivalents) starts the real install flow.
- Where direct prompt is unavailable, verify a short nontechnical localized fallback only.
- Verify installed standalone launch/icon/manifest/language/mobile layout.
- No visitor-facing `beforeinstallprompt` or implementation/event wording.

## 4. Production backup gate

Before any Production migration:

- create a fresh private Production backup;
- verify it exists and its safe identifier/time;
- verify schema/scope/integrity evidence;
- perform the supported isolated restore/dry-run/recovery validation;
- document rollback/recovery for the exact PR116 migrations;
- do not mutate Production business rows for testing.

## 5. Production Migration Gate

After Owner QA PASS, present and then STOP:

- exact final Head;
- migration files and reasons;
- affected functions/tables;
- RLS/security effect;
- isolated proof;
- backup status;
- rollback/recovery path.

Expected files:

- `20260809095000_pr116_owner_approved_reviews_program_media.sql`
- `20260810001500_pr116_final_security_boundary_closeout.sql`

No Production migration without explicit Owner approval.

## 6. Merge/deployment gate

No Ready-for-Review conversion and no merge without separate explicit Owner approval after all required gates.

After an approved merge:

- Vercel Production = READY;
- Production commit = merge commit;
- `/api/health` = OK and `commitSha` = exact merge commit;
- smoke Home, Admin login, Applications, Service Request and PR116-affected flows;
- verify direct browser execution of internal submission/guard RPCs and legacy bypasses is denied;
- verify legitimate Production OIDC path succeeds;
- review relevant logs without exposing secrets.

## 7. Search/SEO operational check

After final Production merge, verify sitemap/canonical/hreflang/indexing directives and submit/inspect key URLs where Owner Search Console access permits. Do not wait for Google's independent indexing decision after the technical/submission work is complete.

## 8. Final declaration

Only after every applicable ledger/manual/Production/Owner gate is truly closed may the project be declared Code Complete / Development Closed / Production Ready / Delivery Ready / Revenue Ready. Then stop development; later bugs/new requirements are separate work.
