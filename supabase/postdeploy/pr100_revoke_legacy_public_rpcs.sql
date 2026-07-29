-- HAMZA AGENCY PR #100 — MANUAL POST-DEPLOY ONLY
--
-- Do not place this file under supabase/migrations.
-- Run only after all of the following are true:
-- 1. PR #100 code is merged and the Production Vercel deployment is READY.
-- 2. Production commit SHA matches the approved PR #100 Head/merge commit.
-- 3. /api/application-status, /api/service-status, /api/public-submit and
--    /api/ai-support have passed Production smoke and rate-limit checks.
-- 4. A new agency application has returned an APP tracking code and the same
--    application can be found through /api/application-status by that code only.
-- 5. Admin login and CMS operations have passed after admin_users.user_id backfill.
-- 6. A fresh backup and restore dry-run have been verified.
--
-- Expected effect: legacy browser-callable RPC grants and the obsolete WhatsApp
-- application lookup wrapper are removed. The tracking-code and service-code
-- routes continue to use the protected PR #100 RPCs.

begin;

revoke all on function public.lookup_public_agency_application(text, text)
  from public, anon, authenticated;
revoke all on function public.pr100_lookup_public_agency_application(text, text, text)
  from public, anon, authenticated;
revoke all on function public.lookup_public_service_request(text)
  from public, anon, authenticated;
revoke all on function public.pr99_guard_submission(text, text, jsonb, timestamptz, text)
  from public, anon, authenticated;

commit;

-- Required verification after execution:
-- select routine_name, grantee, privilege_type
-- from information_schema.routine_privileges
-- where routine_schema = 'public'
--   and routine_name in (
--     'lookup_public_agency_application',
--     'pr100_lookup_public_agency_application',
--     'lookup_public_service_request',
--     'pr99_guard_submission'
--   )
--   and grantee in ('PUBLIC', 'anon', 'authenticated');
-- Expected result: zero rows.
