#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

EXPECTED_BRANCH='feat/pr101-complete-product-expansion'
REMOTE_REF="refs/remotes/origin/$EXPECTED_BRANCH"

fail() { printf '[current-state-schema] %s\n' "$1" >&2; exit 1; }
cleanup() {
  unset HAMZA_PRODUCTION_READONLY_URL HAMZA_SCHEMA_START_HEAD PGDATABASE PGOPTIONS PGCONNECT_TIMEOUT
}
trap cleanup EXIT
trap 'cleanup; trap - EXIT; exit 130' INT
trap 'cleanup; trap - EXIT; exit 143' TERM

command -v git >/dev/null 2>&1 || fail 'git is required'
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail 'run inside the HAMZA AGENCY repository'
cd "$REPO_ROOT"
[ "$(git branch --show-current)" = "$EXPECTED_BRANCH" ] || fail 'refusing unexpected branch'

git fetch --no-tags --quiet origin "refs/heads/$EXPECTED_BRANCH:$REMOTE_REF"
[ -z "$(git status --porcelain=v1 --untracked-files=all)" ] || fail 'working tree must be clean before extraction'
HAMZA_SCHEMA_START_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse "$REMOTE_REF")"
[ "$HAMZA_SCHEMA_START_HEAD" = "$REMOTE_HEAD" ] || fail 'local HEAD does not match the remote branch HEAD'
export HAMZA_SCHEMA_START_HEAD
printf '[current-state-schema] start head=%s\n' "$HAMZA_SCHEMA_START_HEAD"

printf 'HAMZA_PRODUCTION_READONLY_URL: ' >&2
IFS= read -r -s HAMZA_PRODUCTION_READONLY_URL
printf '\n' >&2
[ -n "$HAMZA_PRODUCTION_READONLY_URL" ] || fail 'a read-only Production URL is required'
export HAMZA_PRODUCTION_READONLY_URL

bash scripts/closeout/export-current-state-schema.sh
unset HAMZA_PRODUCTION_READONLY_URL

bash scripts/closeout/finalize-current-state-schema.sh
