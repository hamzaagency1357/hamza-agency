# HAMZA AGENCY — Final Pre-Launch Manual Checklist

Only manual/external/Production gates remain here. This is not a development backlog.

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

- Desktop Smart Support: AR `الدعم الذكي`, EN `Smart Support`, TR `Akıllı Destek`.
- Mobile Menu + Smart Support + WhatsApp availability.
- no overlay/safe-area/close-button breakage;
- Cookie controls and reopening;
- Reviews honest empty/submission state;
- Program Media fallback;
- decorated Arabic Agent and EN/TR Agent identity;
- no Arabic residue in EN/TR;
- color hierarchy in available presets;
- no developer wording / public commit SHA/internal status details.

### Admin authenticated — desktop + mobile

- Unified Requests opens the intended Application and Service Request.
- Job/Contact routes do not rely on invalid fragments.
- Blog/guide floating controls do not cover content.
- tables/cards/forms do not destructively clip on mobile.
- no visitor-marketing copy in Admin.
- one active navigation item only.
- direct URL + important action authorization samples respect permissions.
- visible Admin copy is human-readable and not developer/database UI.

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
