-- HAMZA AGENCY PR #100 — MANUAL POST-DEPLOY ONLY
--
-- DO NOT run before explicit merge approval and exact Production readiness.
-- Required first: Production routes pass APP/SR tracking, all public forms,
-- AI Support, password reset guard, admin operations, and a fresh backup + dry run.

begin;

revoke all on function public.lookup_public_agency_application(text,text)
  from public, anon, authenticated;
revoke all on function public.lookup_public_service_request(text)
  from public, anon, authenticated;
revoke all on function public.pr100_lookup_public_agency_application(text,text,text)
  from public, anon, authenticated;
revoke all on function public.pr100_lookup_public_agency_application_by_code(text,text)
  from public, anon, authenticated;
revoke all on function public.pr100_lookup_public_service_request(text,text)
  from public, anon, authenticated;
revoke all on function public.pr100_guard_password_reset(text,jsonb,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.pr100_guard_ai_answer(text,jsonb)
  from public, anon, authenticated;
revoke all on function public.pr99_guard_submission(text,text,jsonb,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.pr99_submit_application(jsonb,text,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.pr99_submit_service_request(jsonb,text,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.pr99_submit_job_application(jsonb,text,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.pr99_submit_contact(jsonb,text,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.pr99_submit_ai_support(jsonb,text,timestamptz,text)
  from public, anon, authenticated;

commit;

-- Expected after execution: zero PUBLIC/anon/authenticated EXECUTE grants for
-- every function listed above. The Vercel OIDC Edge Function continues through
-- public.pr100_oidc_gateway, which is executable only by service_role.
