#!/usr/bin/env bash
set -euo pipefail

DB_URL="${1:?database URL required}"
PSQL=(psql "$DB_URL" --no-psqlrc -X -v ON_ERROR_STOP=1)

support_sig="public.pr4_create_support_request(text,text,text,text,text,boolean)"
gateway_sig="public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)"
primary_tenant_fixture_id=""

support_acl() {
  "${PSQL[@]}" -qAtc "select
    has_function_privilege('anon','$support_sig','EXECUTE')::int || ':' ||
    has_function_privilege('authenticated','$support_sig','EXECUTE')::int || ':' ||
    has_function_privilege('service_role','$support_sig','EXECUTE')::int"
}

ensure_primary_tenant() {
  primary_tenant_fixture_id="$("${PSQL[@]}" -qAtc "insert into public.tenants(slug,name,status,is_primary)
    select 'pr-a-isolated-primary','PR-A Isolated Primary','active',true
    where not exists(select 1 from public.tenants where is_primary=true and status='active')
    returning id")"
}

cleanup_primary_tenant() {
  if [ -n "$primary_tenant_fixture_id" ]; then
    "${PSQL[@]}" -qAtc "delete from public.tenants where id='${primary_tenant_fixture_id}'::uuid and slug='pr-a-isolated-primary'" >/dev/null || true
  fi
}
trap cleanup_primary_tenant EXIT

trusted_probe() {
  local phase="$1"
  local now nonce body digest result
  now="$(date +%s)"
  nonce="$(printf '%s' "pr-a-${phase}-${now}-$$" | sha256sum | cut -c1-32)"
  body="{\"identity\":\"pr-a-isolated-support-guard-identity-${phase}\",\"payload\":{\"language\":\"ar\",\"subject\":\"PR-A isolated staged runtime ${phase}\",\"context\":\"staged trusted path probe\",\"contactType\":\"\",\"contactValue\":\"\",\"consent\":true}}"
  digest="$(printf '%s' "$body" | sha256sum | awk '{print $1}')"

  result="$("${PSQL[@]}" -qAt \
    -v action_ts="$now" \
    -v nonce="$nonce" \
    -v body="$body" \
    -v digest="$digest" <<'SQL'
begin;
select set_config('request.jwt.claim.role','service_role',true);
set local role service_role;
select public.pr100_oidc_gateway(
  'support_request_create',
  :action_ts::bigint,
  :'nonce',
  :'body',
  :'digest',
  'https://oidc.vercel.com/hamzaagencysy-3009s-projects',
  'owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:production',
  'https://vercel.com/hamzaagencysy-3009s-projects',
  'team_gu9SOMWlOqS2uvLEZUYEbTPs',
  'prj_YQw97FRAAwcnpQkudzGr01kXASvN',
  'hamza-agency',
  'production',
  :action_ts::bigint - 1,
  :action_ts::bigint + 600
);
rollback;
SQL
)"
  grep -q '"supportCode"' <<<"$result"
  grep -q '"verification"' <<<"$result"
}

legacy_probe() {
  local role="$1"
  "${PSQL[@]}" -q >/dev/null <<SQL
begin;
set local role $role;
select public.pr4_create_support_request(
  'ar',
  'PR-A isolated staged runtime legacy ${role}',
  'legacy compatibility probe',
  null,
  null,
  true
);
rollback;
SQL
}

negative_direct_probe() {
  local role="$1"
  local marker="PR-A isolated denied ${role}"
  local before after log
  log="/tmp/pr-a-${role}-deny.log"
  before="$("${PSQL[@]}" -qAtc "select count(*) from public.pr4_support_requests where subject='${marker}'")"

  if "${PSQL[@]}" -q >"$log" 2>&1 <<SQL
begin;
set local role $role;
select public.pr4_create_support_request(
  'ar',
  '${marker}',
  'must never be inserted',
  null,
  null,
  true
);
rollback;
SQL
  then
    cat "$log"
    rm -f "$log"
    echo "direct ${role} support RPC unexpectedly succeeded" >&2
    return 1
  fi

  after="$("${PSQL[@]}" -qAtc "select count(*) from public.pr4_support_requests where subject='${marker}'")"
  rm -f "$log"
  test "$before" = "$after"
}

echo "PR-A staged runtime: seed isolated primary tenant fixture"
ensure_primary_tenant

echo "PR-A staged runtime: capture pre-preparation support ACL"
acl_before="$(support_acl)"

echo "PR-A staged runtime: apply preparation migration only"
"${PSQL[@]}" -f supabase/migrations/20260825141930_pr120_support_request_trusted_gateway_preparation.sql
"${PSQL[@]}" -qAtc "select pg_notify('pgrst','reload schema')" >/dev/null

acl_after_preparation="$(support_acl)"
test "$acl_before" = "$acl_after_preparation"

prep_contract="$("${PSQL[@]}" -qAtc "select
  (position('support_request_create' in pg_get_functiondef('$gateway_sig'::regprocedure)) > 0)::int || ':' ||
  has_function_privilege('anon','$gateway_sig','EXECUTE')::int || ':' ||
  has_function_privilege('authenticated','$gateway_sig','EXECUTE')::int || ':' ||
  has_function_privilege('service_role','$gateway_sig','EXECUTE')::int")"
test "$prep_contract" = "1:0:0:1"

echo "PR-A staged runtime: old anon/authenticated support path remains compatible after preparation"
legacy_probe anon
legacy_probe authenticated

echo "PR-A staged runtime: trusted DB gateway support action works before lockdown"
trusted_probe preparation

echo "PR-A staged runtime: apply ACL lockdown only after trusted-path proof"
"${PSQL[@]}" -f supabase/migrations/20260825142000_final_security_acl_lockdown.sql
"${PSQL[@]}" -qAtc "select pg_notify('pgrst','reload schema')" >/dev/null

final_contract="$("${PSQL[@]}" -qAtc "select
  has_function_privilege('anon','$support_sig','EXECUTE')::int || ':' ||
  has_function_privilege('authenticated','$support_sig','EXECUTE')::int || ':' ||
  has_function_privilege('service_role','$support_sig','EXECUTE')::int || ':' ||
  has_function_privilege('anon','public.pr99_build_backup_payload(text[])','EXECUTE')::int || ':' ||
  has_function_privilege('authenticated','public.pr99_build_backup_payload(text[])','EXECUTE')::int || ':' ||
  has_function_privilege('anon','public.pr99_restore_entity_rows(text,jsonb)','EXECUTE')::int || ':' ||
  has_function_privilege('authenticated','public.pr99_restore_entity_rows(text,jsonb)','EXECUTE')::int || ':' ||
  has_function_privilege('anon','public.pr4_audit_kb()','EXECUTE')::int || ':' ||
  has_function_privilege('authenticated','public.pr4_audit_kb()','EXECUTE')::int || ':' ||
  has_function_privilege('anon','public.pr4_touch_kb()','EXECUTE')::int || ':' ||
  has_function_privilege('authenticated','public.pr4_touch_kb()','EXECUTE')::int")"
test "$final_contract" = "0:0:1:0:0:0:0:0:0:0:0"

echo "PR-A staged runtime: direct browser RPCs fail after lockdown and create no row"
negative_direct_probe anon
negative_direct_probe authenticated

echo "PR-A staged runtime: trusted DB gateway support action remains operational after lockdown"
trusted_probe lockdown

echo "PR-A staged runtime: PASS"
