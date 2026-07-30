# HAMZA AGENCY — Final Pre-Launch Manual Checklist

This checklist is intentionally performed immediately before public launch. It is not replaced by CI because it requires the owner's real accounts, devices, recovery material, and Production environment.

## 1. Administrator security

- Sign in with the primary administrator account.
- Confirm the account is linked to the expected Supabase `user_id`.
- Enable MFA for the primary administrator.
- Generate recovery codes.
- Store recovery codes outside GitHub, Vercel, Supabase, and chat history.
- Create the backup administrator using a separate email address.
- Link the backup administrator to its correct `user_id`.
- Assign `deputy_super_admin` only when this is the intended privilege.
- Enable MFA for the backup administrator.
- Test login and logout for both accounts.
- Confirm each account sees only the expected modules and actions.
- Enable Supabase leaked-password protection when available on the selected plan.

## 2. Permission verification

Use a non-super-admin test account where possible.

- Confirm `can_view` controls access to each module.
- Confirm `can_edit` controls status and note updates.
- Confirm `can_export` controls export visibility and execution.
- Confirm a `program_admin` sees only applications for the assigned program.
- Confirm changing the browser request cannot retrieve another program's application rows.
- Confirm unknown or malformed roles cannot enter the admin dashboard.

## 3. Media Library

On the exact release deployment:

- Upload a valid JPEG under 5 MB.
- Upload a valid PNG under 5 MB.
- Upload a valid WebP or AVIF under 5 MB.
- Confirm preview and use in content.
- Reject an image over 5 MB.
- Reject a renamed executable/document with an image extension.
- Reject a MIME/magic-byte mismatch.
- Confirm video/document files cannot be uploaded into the image bucket.
- Delete only the temporary QA assets.

## 4. Public submissions and tracking

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
- verify only the approved public status fields are returned;
- update the status from admin;
- confirm the public status changes;
- confirm notification and activity-log entries;
- test search and permission-controlled export;
- delete or clearly mark temporary QA records according to the operating policy.

## 5. Public and authentication behavior

- Open all major public routes while signed out.
- Confirm admin routes redirect signed-out visitors to login.
- Confirm forbidden modules return the safe admin fallback rather than exposing data.
- Test AR → EN → TR → AR navigation on desktop and mobile.
- Confirm URL remains the locale source.
- Confirm mobile dock panels open and close correctly.
- Confirm AI support closes correctly and escalates unanswered requests safely.
- Confirm WhatsApp links use the approved public number.
- Confirm tracking pages are absent from sitemap and carry no indexing path.

## 6. Backup and recovery

- Create a fresh private backup before launch.
- Download and store it outside the public repository.
- Verify checksum/project/version metadata.
- Run backup dry-run validation.
- Test a limited restore using disposable fixture data only.
- Confirm the original record remains recoverable.
- Confirm activity log and restore-operation records are written.
- Remove only disposable fixture data after validation.

## 7. Production deployment gate

After PR merge:

- Confirm Vercel Production deploys the exact merge commit.
- Confirm deployment state is `READY`.
- Confirm the official domain points to the exact Production deployment.
- Check runtime errors and warnings.
- Repeat APP/SR/JOB/CNT submission and tracking smoke tests on Production.
- Confirm server-only OIDC actions succeed in Production.
- Confirm no OIDC token, Service Role key, or private secret appears in browser assets or responses.

## 8. Guarded post-deploy revocation

Only after all replacement Production routes pass:

- review `supabase/postdeploy/pr100_revoke_legacy_public_rpcs.sql`;
- confirm legacy clients are no longer required;
- execute the guarded revocation once;
- test APP/SR/JOB/CNT submission and tracking again;
- record the execution date, operator, merge SHA, Production deployment ID, and result in the release record.

## 9. Final release evidence

Record:

- merge commit SHA;
- Production deployment ID and URL;
- Supabase project ID;
- migration versions;
- MFA completion without storing recovery codes;
- backup creation time and checksum;
- manual QA result for APP/SR/JOB/CNT;
- post-deploy status;
- known non-blocking advisor findings;
- final owner launch approval.

Public launch is approved only when every applicable item above is complete or explicitly documented as not applicable.
