#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

EXPECTED_BRANCH='feat/pr101-complete-product-expansion'
SNAPSHOT_PATH='supabase/current-state-schema/current-state-schema.sql'
SQL_PATH='scripts/closeout/export-current-state-schema.sql'
VERIFY_PATH='scripts/closeout/verify-current-state-schema.mjs'
MODE="${1:-export}"
RAW_TMP=''

fail() { printf '[current-state-schema] %s\n' "$1" >&2; exit 1; }

cleanup() {
  rm -f "${RAW_TMP:-}"
  unset HAMZA_PRODUCTION_READONLY_URL PRODUCTION_URL PGDATABASE PGOPTIONS PGCONNECT_TIMEOUT
}
on_exit() {
  local status=$?
  trap - EXIT INT TERM
  cleanup
  exit "$status"
}
trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

command -v git >/dev/null 2>&1 || fail 'git is required'
command -v node >/dev/null 2>&1 || fail 'Node.js is required'
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail 'run inside the HAMZA AGENCY repository'
cd "$REPO_ROOT"
[ "$(git branch --show-current)" = "$EXPECTED_BRANCH" ] || fail 'refusing unexpected branch'
[ -f "$SQL_PATH" ] && [ -f "$VERIFY_PATH" ] || fail 'local extraction package is incomplete'

if [ "$MODE" = '--verify-only' ]; then
  [ -f "$SNAPSHOT_PATH" ] || fail "missing snapshot: $SNAPSHOT_PATH"
  node "$VERIFY_PATH" "$SNAPSHOT_PATH" "$SNAPSHOT_PATH" verify
  exit 0
fi
[ "$MODE" = 'export' ] || fail 'usage: export-current-state-schema.sh [--verify-only]'
command -v psql >/dev/null 2>&1 || fail 'psql is required'
[ -n "${HAMZA_PRODUCTION_READONLY_URL:-}" ] || fail 'HAMZA_PRODUCTION_READONLY_URL is required for this local process'
[ -z "$(git status --porcelain=v1 --untracked-files=all)" ] || fail 'working tree must be clean before extraction'
if git ls-files --error-unmatch "$SNAPSHOT_PATH" >/dev/null 2>&1; then fail 'refusing to overwrite a tracked snapshot'; fi

mkdir -p "$(dirname "$SNAPSHOT_PATH")"
RAW_TMP="${SNAPSHOT_PATH}.raw-$$"
PRODUCTION_URL="$HAMZA_PRODUCTION_READONLY_URL"
unset HAMZA_PRODUCTION_READONLY_URL

set +e
PGDATABASE="$PRODUCTION_URL" \
PGCONNECT_TIMEOUT=15 \
PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=5000' \
psql --no-password --no-psqlrc --quiet --tuples-only --no-align \
  --set=ON_ERROR_STOP=1 --file "$SQL_PATH" >"$RAW_TMP" 2>/dev/null
PSQL_STATUS=$?
set -e
unset PRODUCTION_URL PGDATABASE PGOPTIONS PGCONNECT_TIMEOUT
[ "$PSQL_STATUS" -eq 0 ] || fail 'read-only schema extraction failed; connection details were suppressed'

node "$VERIFY_PATH" "$RAW_TMP" "$SNAPSHOT_PATH" write
rm -f "$RAW_TMP"
RAW_TMP=''
printf '[current-state-schema] wrote verified snapshot to %s\n' "$SNAPSHOT_PATH"
