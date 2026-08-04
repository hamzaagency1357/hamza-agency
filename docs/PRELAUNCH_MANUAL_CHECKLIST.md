# HAMZA AGENCY — Final Pre-Launch Manual Checklist

This checklist is performed only after PR #105 is ready, explicitly approved, merged, and deployed to Production. CI, database migrations, Preview verification, backups, and mobile artifacts do not replace checks that require the owner's real accounts, devices, recovery material, provider accounts, and Production environment.

Do not execute `supabase/postdeploy/pr100_revoke_legacy_public_rpcs.sql` until every replacement Production route passes and the owner separately approves that one-time action.

## 1. Administrator security

- Sign in with the primary administrator account.
- Confirm the account is linked to the expected Supabase `user_id` and primary tenant membership.
- Enable MFA for the primary administrator.
- Generate recovery codes and store them outside GitHub, Vercel, Supabase, devices shared with staff, and chat history.
- Create the backup administrator using a separate email address.
- Link the backup administrator to its correct `user_id`.
- Assign `deputy_super_admin` or tenant role only when intended.
- Enable MFA for the backup administrator.
- Test login, logout, password reset, session refresh, and session revocation for both accounts.
- Confirm each account sees only the expected modules, tenants, programs, and actions.
- Enable Supabase leaked-password protection when available on the selected plan.

## 2. Tenant and permission verification

Use separate non-super-admin accounts where possible.

- Confirm HAMZA AGENCY is the primary tenant and the official domains resolve to it.
- Confirm tenant branding, locale settings, contact data, legal overrides, and feature flags render correctly.
- Create a disposable second tenant only for QA when necessary.
- Confirm a tenant administrator cannot read or change another tenant.
- Confirm a partner, employee, creator, or client cannot select or forge another `tenant_id`.
- Confirm `can_view`, `can_edit`, `can_export`, task, workflow, SLA, marketplace, privacy, session, and incident permissions control the intended actions.
- Confirm a `program_admin` sees only applications for the assigned program.
- Confirm malformed or unknown roles fail closed.
- Remove only disposable QA tenant records after evidence is saved.

## 3. Portal verification

Create or use one controlled account for each role:

- Creator Portal.
- Client Portal.
- Employee Portal.
- Partner Portal.

For each role:

- verify email confirmation and password reset;
- verify signed-out redirect to `/portal/login`;
- verify suspended membership denial;
- verify profile update and locale preference;
- verify notifications and communications preferences;
- verify files are visible only to the owner or authorized staff;
- verify privacy request submission;
- verify active-session list and one/all session revocation;
- verify another portal user cannot read the account's rows;
- verify mobile and desktop navigation in Arabic, English, and Turkish where exposed.

## 4. Tasks, SLA, and workflows

- Create a task related to each relevant entity type: APP, SR, JOB, CNT, creator, client, partner, and order when applicable.
- Assign and reassign an employee.
- Add a watcher, comment, and safe attachment.
- Change status and confirm immutable status history.
- Confirm task notifications and audit entries.
- Confirm unauthorized portal users cannot open or edit the task.
- Test first-response and resolution SLA deadlines.
- Test pause, resume, warning, breach, and escalation.
- Publish one declarative workflow, trigger it once, and confirm idempotent rerun behavior.
- Confirm no arbitrary code or SQL can be entered as a workflow step.
- Remove only disposable QA rows according to the operating policy.

## 5. Marketplace and payments foundation

- Create one category and one listing with complete AR/EN/TR content and approved media.
- Test draft, review, publish, archive, search, filter, and SEO behavior.
- Place an order from the client portal using manual/offline payment mode.
- Confirm order code, totals, items, status, notification, and audit evidence.
- Confirm a client cannot read another client's order.
- Test dispute and refund states without charging real money.
- Test duplicate signed webhook rejection using provider mock fixtures only.
- Confirm no card data is stored.
- Confirm no live provider, billing, trial, crypto, or USDT mode is enabled.
- Remove only disposable marketplace QA records.

## 6. WhatsApp, push, and AI providers

No provider is activated merely because the adapter exists.

### WhatsApp

- Select an approved provider and confirm an acceptable free or commercial decision.
- Complete business verification outside the repository.
- Add server-only credentials without posting them in chat.
- Verify approved templates and variables.
- Verify opt-in before sending and opt-out stops future sends.
- Test tracking receipt, request update, support follow-up, order update, and SLA escalation.
- Confirm no sensitive content appears unnecessarily in stored payloads.

### Push

- Configure server-only push material when activation is approved.
- Test opt-in, opt-out, expired-subscription cleanup, and deep links.
- Confirm lock-screen text is generic for sensitive events.
- Confirm another user never receives the notification.

### AI

- Keep the rule-based/tenant-knowledge fallback active unless an external provider is approved.
- When activating a provider, use server-only credentials and an approved free or commercial plan.
- Test tenant knowledge isolation, PII redaction, prompt-injection refusal, rate limits, retention, consent, opt-out, and human escalation.
- Confirm AI suggestions cannot change status, delete data, charge money, or send messages without authorized confirmation.

## 7. Privacy, cookies, and legal policies

- Review and publish current Privacy, Cookie, AI, and Terms versions in AR/EN/TR.
- Confirm published dates and tenant overrides.
- Confirm only necessary scripts run before consent.
- Test analytics, preferences, and marketing opt-in separately.
- Reopen settings, withdraw consent, and verify versioned history.
- Submit access, download, correction, deletion, and consent-withdrawal requests.
- Verify identity before processing a privacy request.
- Confirm privacy SLA, notes, export, and audit evidence.
- Confirm user data is not deleted automatically before authorized review.

## 8. PWA and mobile

### PWA

- Install the PWA on supported Android/desktop browsers.
- Test manifest, icons, shortcuts, standalone mode, offline shell, and update prompt.
- Confirm public offline pages work as documented.
- Confirm admin, portal, API, auth, tracking, and authenticated responses are absent from browser caches.
- Test push opt-in/out only after provider material is configured.

### Android

- Download the exact-head Android debug artifact from the successful PR101 Mobile Readiness run.
- Verify its recorded SHA-256 before installation.
- Install on a controlled Android device.
- Test HTTPS-only navigation, auth callback, portal navigation, logout/revoke, offline fallback, and privacy screens.
- Confirm no cleartext traffic, debug web contents, or embedded secrets.

### iOS

- Confirm project/readiness configuration on macOS when available.
- Test signing only after an Apple Developer decision.
- Do not claim App Store launch without paid enrollment, signing, review, and publication.

## 9. Media Library

On the exact release deployment:

- Upload a valid JPEG, PNG, WebP, and AVIF under 5 MB.
- Confirm preview and use in public content, tenant branding, marketplace, and permitted portal files.
- Reject an image over 5 MB.
- Reject a renamed executable/document with an image extension.
- Reject a MIME/magic-byte mismatch.
- Confirm unsupported video/document files cannot enter the image bucket.
- Confirm tenant and owner storage policies.
- Delete only temporary QA assets.

## 10. Public submissions and tracking

Create one temporary record for each type:

- APP application;
- SR service request;
- JOB job application;
- CNT contact request.

For each record:

- confirm the expected prefix and year;
- copy the tracking code;
- open the localized tracking link;
- verify Arabic, English, and Turkish tracking pages;
- verify only approved public status fields are returned;
- update status from admin;
- confirm public status, notifications, activity log, search, and permission-controlled export;
- delete or clearly mark disposable QA records according to the operating policy.

## 11. Public, monitoring, and incident behavior

- Open all major public routes while signed out.
- Confirm admin routes redirect signed-out visitors to login.
- Confirm portal routes redirect or deny safely.
- Test AR → EN → TR → AR on desktop and mobile.
- Confirm URL remains the locale source.
- Confirm mobile dock and AI support panels open and close correctly.
- Confirm tracking pages remain absent from sitemap and carry no indexing path.
- Verify `/status` exposes only public incident fields.
- Create a disposable incident, add public and private updates, and confirm private updates, owner IDs, and postmortems never appear publicly.
- Check Vercel runtime errors, Supabase API/Auth/Postgres/Edge Function logs, backup health, OIDC gateway health, provider health, schedule health, and SLA monitoring.
- Remove only disposable incident QA data.

## 12. Backup and recovery

- Create a fresh private backup immediately before merge/launch.
- Store it outside the public repository.
- Verify project, schema version, scope, row counts, and checksum.
- Run dry-run validation.
- Run a limited restore using temporary rehydration or disposable fixture data.
- Confirm no Production business row is changed unintentionally.
- Confirm activity log and restore-operation evidence.
- Remove only disposable fixture data.

## 13. Production deployment gate

After explicit merge approval and merge:

- Confirm the expected PR head was merged.
- Confirm Vercel Production deploys the exact merge commit.
- Confirm deployment state is `READY`.
- Confirm the official domain points to that deployment.
- Repeat public, admin, portal, tenant, APP/SR/JOB/CNT, task/SLA/workflow, marketplace, privacy/cookie, PWA, session, and status-page smoke tests.
- Confirm server-only OIDC actions succeed in Production.
- Confirm no OIDC token, Service Role key, provider secret, payment secret, or private data appears in browser assets, cache, logs, or responses.
- Record remaining advisor findings and why they are accepted or assigned.

## 14. Guarded post-deploy revocation

Only after all replacement Production routes pass and the owner gives a separate explicit approval:

- review `supabase/postdeploy/pr100_revoke_legacy_public_rpcs.sql`;
- confirm legacy clients are no longer required;
- execute the guarded revocation once;
- verify the revoke result;
- repeat APP/SR/JOB/CNT, portal, provider gateway, and marketplace smoke tests;
- record execution date, operator, merge SHA, Production deployment ID, and result.

## 15. Final release evidence

Record:

- PR #105 final head and merge commit;
- Production deployment ID and URL;
- Supabase project ID and migration versions;
- final backup, checksum, dry-run, and limited-restore evidence;
- MFA completion without storing recovery codes;
- owner QA result for all product modules;
- provider activation state;
- Android/iOS/store state without overclaiming;
- advisor findings and assigned follow-up;
- post-deploy state;
- final owner launch approval.

Public launch is approved only when every applicable item is complete or explicitly documented as not applicable. Only then may the release record state **HAMZA AGENCY — Fully Launched**.
