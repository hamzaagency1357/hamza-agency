# HAMZA AGENCY — Final Pre-Launch Manual Checklist

This checklist contains only manual/external release gates that remain relevant to PR #116. It is not a feature backlog and does not resurrect PR1–PR5 roadmap items. The detailed programmatic state lives in `docs/CURRENT_CLOSEOUT_LEDGER.md`.

## 1. Administrator security — mandatory

- Enable MFA for the primary administrator and verify a factor is enrolled successfully.
- Store recovery material securely outside GitHub, logs, chat, and shared staff devices.
- Create a **separate** Backup Administrator using a real Owner-controlled identity.
- Grant only the intended backup role/permissions.
- Enable MFA for the Backup Administrator.
- Test primary and backup login, logout, password reset/recovery, session refresh, and session revocation.
- Verify neither account sees modules/actions beyond its permissions.

Current read-only Production audit found one active admin and zero verified MFA factors, so this section is not complete.

### Leaked Password Protection

The current Supabase organization is on the Free plan. Supabase documents Leaked Password Protection as available on Pro and above. Under the current Owner directive this remains an external plan/security blocker unless the plan changes or the requirement is explicitly superseded. Do not misreport it as enabled.

## 2. Exact Preview Owner QA

Use only a Vercel Preview whose deployment SHA exactly matches the final PR #116 Head.

### Public — desktop and mobile

Review Arabic, English, and Turkish for:

- Home, Header, Footer, navigation, Agent page;
- Programs and Program Media fallbacks;
- Digital Services and Smart Support;
- Contact;
- Blog, Reviews, Success Stories, Jobs and honest empty states;
- Install App;
- Cookie banner and preference reopening;
- Marketplace/Platform Status/Portal visibility;
- forms, buttons, modals, mobile dock, floating actions, safe areas;
- exact Arabic decorated Agent rendering;
- no superseded EN/TR Agent titles or mixed-locale visible fallback.

Confirm Mobile Dock exposes Menu, Smart Support, and WhatsApp without covering content.

### Admin — authenticated, desktop and mobile

Review:

- Dashboard and daily-work hierarchy;
- sidebar/quick navigation and one active item only;
- Applications, Service Requests, Jobs, Contact and unified Requests center;
- opening/viewing the intended request from the unified center;
- forms, filters, cards, tables, actions and responsive overflow;
- Programs, Program Media, Content, Blog, Reviews and Translations;
- Settings, identity, visibility, Preview/Publish where applicable;
- Permissions and direct-URL denial for unauthorized accounts;
- Trash/Restore where supported;
- Backup and System Status pages;
- no floating control covering actionable content;
- no raw developer/database wording in daily Admin UI unless intentionally inside technical details for the highest-privilege role.

Owner Final QA must be explicitly recorded as `PASS` before the migration/merge sequence can continue.

## 3. Android PWA real-device check

On a real Android device using Chrome:

- open the exact release Preview/public deployment as appropriate;
- verify the Install App page in AR/EN/TR;
- where `beforeinstallprompt`/browser installation is available, verify the visible install button starts the real browser installation flow;
- where direct installation is unavailable, verify only the professional localized fallback is shown;
- verify standalone launch, icon/manifest behavior, language routing and safe mobile layout;
- confirm no technical implementation wording is exposed to the visitor.

## 4. Production backup before any DB change

Before the Production Migration Gate:

- create a fresh private Production backup using the approved backup workflow;
- confirm the backup exists and record its safe identifier/time without posting secrets;
- verify schema/version/scope and the workflow's integrity evidence;
- run the supported dry-run/restore validation in an isolated or disposable context;
- confirm the rollback/recovery path for the exact PR116 migrations;
- do not mutate Production business rows to create evidence.

No Production migration may proceed without this section and explicit Owner approval.

## 5. Production Migration Gate — only after Owner QA PASS

Present to the Owner before execution:

- exact final Head;
- exact migration files;
- why each migration is still required;
- tables/functions affected;
- RLS/security effect;
- isolated verification result;
- backup status;
- rollback/recovery path.

Current expected migrations:

- `20260809095000_pr116_owner_approved_reviews_program_media.sql`
- `20260810001500_pr116_final_security_boundary_closeout.sql`

Then **STOP and wait for explicit Owner Production Migration approval**.

After approval, verify only affected Production flows, including Program Media/Reviews where applicable, direct internal RPC denial, legitimate OIDC public submission, protected public lookups, RLS and Admin moderation.

## 6. Merge Gate

Merge only after:

- Current Closeout Ledger Open = 0;
- exact final CI is green;
- Owner Final QA = PASS;
- Production Migration PASS if still required;
- security verification PASS;
- explicit Owner merge approval.

Do not add a feature between Owner PASS and merge.

## 7. Production deployment and final smoke

After the approved merge:

- verify Vercel Production deployment is `READY`;
- verify Production commit equals the merge commit;
- verify `/api/health` is OK and its `commitSha` equals that commit;
- smoke Home, Admin login, Applications, Service Request and every flow changed in PR #116;
- verify direct browser invocation of internal PR99 write RPCs is denied;
- verify legacy lookup bypass is denied;
- verify the legitimate Production Vercel OIDC path succeeds;
- review relevant Vercel/Supabase logs without exposing secrets;
- verify primary MFA, Backup Administrator/recovery, Production backup and critical forms are still confirmed.

## 8. Search/SEO operational check

After the final Production merge:

- verify sitemap is accessible;
- verify canonical/hreflang/indexing directives for key public URLs;
- submit/inspect key URLs in Search Console where Owner access permits;
- do not block Code Complete waiting for Google's independent indexing decision after the technical/submission work is complete.

## 9. Final declaration

Only when every applicable ledger item and the gates above are closed may the final record state:

**HAMZA AGENCY — CODE COMPLETE — DEVELOPMENT CLOSED — PRODUCTION READY — DELIVERY READY — REVENUE READY**

After that declaration, stop development. Future bugs or new requirements are separate new work.
