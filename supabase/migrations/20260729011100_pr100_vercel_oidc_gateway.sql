begin;

-- Disable the superseded shared-secret entry point. It stays fail-closed and is
-- not callable by browser roles. The corrective migration intentionally leaves
-- the already-applied migration history untouched.
create or replace function public.pr100_server_gateway(
  p_action text,
  p_timestamp bigint,
  p_nonce text,
  p_body text,
  p