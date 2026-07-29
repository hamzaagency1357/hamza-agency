begin;

-- Apply only after PR #100 is merged and the protected server routes are live.
revoke all on function public.lookup_public_agency_application(text, text) from public, anon, authenticated;
revoke all on function public.lookup_public_service_request(text) from public, anon, authenticated;
revoke all on function public.pr99_guard_submission(text, text, jsonb, timestamptz, text) from public, anon, authenticated;

commit;
