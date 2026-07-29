begin;

-- Keep the currently deployed public pages operational while PR #100 is under review.
-- The next post-deploy migration removes these legacy direct grants after the
-- protected server routes are live in Production.
grant execute on function public.lookup_public_agency_application(text, text) to anon, authenticated;
grant execute on function public.lookup_public_service_request(text) to anon, authenticated;
grant execute on function public.pr99_guard_submission(text, text, jsonb, timestamptz, text) to anon, authenticated;

commit;
