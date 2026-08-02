#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

EXPECTED_BRANCH='feat/pr101-complete-product-expansion'
SNAPSHOT_PATH='supabase/current-state-schema/current-state-schema.sql'
MANIFEST_PATH='supabase/current-state-schema/manifest.json'
MATERIALIZER_PATH='scripts/closeout/materialize-current-state-schema.mjs'
WORKFLOW_PATH='.github/workflows/current-state-schema-verify.yml'
COMMIT_MESSAGE='chore(closeout): finalize current-state schema snapshot'

fail() {
  printf '[current-state-schema] %s\n' "$1" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail 'git is required'
command -v node >/dev/null 2>&1 || fail 'Node.js is required'
command -v npm >/dev/null 2>&1 || fail 'npm is required'

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail 'run this command inside the HAMZA AGENCY repository'
cd "$REPO_ROOT"

CURRENT_BRANCH="$(git branch --show-current)"
[ "$CURRENT_BRANCH" = "$EXPECTED_BRANCH" ] || fail "refusing branch $CURRENT_BRANCH; expected $EXPECTED_BRANCH"
[ -f "$SNAPSHOT_PATH" ] || fail "missing verified owner snapshot: $SNAPSHOT_PATH"

bash scripts/closeout/export-current-state-schema.sh --verify-only

STATUS="$(git status --porcelain=v1 --untracked-files=all)"
[ "$STATUS" = "?? $SNAPSHOT_PATH" ] || fail 'working tree must contain only the untracked verified snapshot'

rm -rf supabase/current-state-schema/parts supabase/current-state-schema/generated

cat > "$MANIFEST_PATH" <<'JSON'
{
  "formatVersion": 3,
  "kind": "sanitized-current-state-schema",
  "sourceSchemas": ["public", "private"],
  "transport": {
    "type": "direct-sql",
    "path": "supabase/current-state-schema/current-state-schema.sql"
  },
  "plaintext": {
    "encoding": "utf-8",
    "bytes": 496138,
    "sha256": "3b1890376e3cca966b1dce0979dd2ed089f95237e1067febf4f58e8f1bf776f2"
  },
  "containsData": false,
  "containsSecrets": false,
  "managedSchemasExcluded": ["auth", "storage", "realtime", "vault"]
}
JSON

cat > "$MATERIALIZER_PATH" <<'NODE'
#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { TextDecoder } from 'node:util';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshotRoot = path.join(repoRoot, 'supabase/current-state-schema');
const manifest = JSON.parse(await readFile(path.join(snapshotRoot, 'manifest.json'), 'utf8'));
const sqlPath = path.join(repoRoot, manifest.transport.path);

function fail(message) {
  console.error(`[current-state-schema] ${message}`);
  process.exit(1);
}

if (manifest.transport.type !== 'direct-sql') fail('manifest transport must be direct-sql');
const sqlBuffer = await readFile(sqlPath);
const digest = createHash('sha256').update(sqlBuffer).digest('hex');
if (sqlBuffer.byteLength !== manifest.plaintext.bytes) {
  fail(`plaintext byte count mismatch: expected ${manifest.plaintext.bytes}, got ${sqlBuffer.byteLength}`);
}
if (digest !== manifest.plaintext.sha256) {
  fail(`plaintext sha256 mismatch: expected ${manifest.plaintext.sha256}, got ${digest}`);
}

let sql;
try {
  sql = new TextDecoder('utf-8', { fatal: true }).decode(sqlBuffer);
} catch {
  fail('snapshot is not valid UTF-8');
}
if (sql.includes('\u0000')) fail('snapshot contains NUL bytes');

const forbidden = [
  [/^\s*INSERT\s+INTO\b/im, 'INSERT data statement'],
  [/^\s*COPY\b/im, 'COPY data statement'],
  [/\b(?:pg_catalog\.)?setval\s*\(/i, 'setval sequence value'],
  [/\bOWNER\s+TO\b/i, 'ownership statement'],
  [/\b(?:lo_create|lo_import|pg_largeobject)\b/i, 'large-object reference'],
  [/postgres(?:ql)?:\/\/[^\s'"`]+/i, 'database connection string'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/i, 'private key'],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/, 'JWT-like token'],
  [/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}\b/i, 'Supabase key'],
  [/\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|PGPASSWORD)\s*[:=]/i, 'credential assignment'],
  [/\b(?:CREATE|ALTER)\s+ROLE\b[^;]*\bPASSWORD\s+(?:'[^']*'|"[^"]*")/i, 'role password'],
  [/\bCREATE\s+(?:TABLE|SEQUENCE|VIEW|MATERIALIZED\s+VIEW|FUNCTION|PROCEDURE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:auth|storage|realtime|vault)\./i, 'managed-schema DDL'],
];
for (const [pattern, label] of forbidden) if (pattern.test(sql)) fail(`forbidden content detected: ${label}`);

for (const required of [
  '-- HAMZA AGENCY sanitized current-state schema snapshot',
  'CREATE SCHEMA IF NOT EXISTS private;',
  'CREATE TABLE public.',
  'CREATE POLICY',
  'ROW LEVEL SECURITY',
]) {
  if (!sql.includes(required)) fail(`required schema evidence missing: ${required}`);
}

for (const legacyDirectory of ['parts', 'generated']) {
  const directory = path.join(snapshotRoot, legacyDirectory);
  try {
    await access(directory);
    const entries = await readdir(directory);
    if (entries.length > 0) fail(`legacy ${legacyDirectory} directory is not empty`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

console.log(`[current-state-schema] verified ${path.relative(repoRoot, sqlPath)}`);
console.log(`[current-state-schema] bytes=${sqlBuffer.byteLength} sha256=${digest}`);
NODE
chmod +x "$MATERIALIZER_PATH"

cat > "$WORKFLOW_PATH" <<'YAML'
name: HAMZA Current-State Schema Verify

on:
  pull_request:
    branches: [main]
    paths:
      - "supabase/current-state-schema/**"
      - "scripts/closeout/export-current-state-schema.sh"
      - "scripts/closeout/export-current-state-schema.sql"
      - "scripts/closeout/finalize-current-state-schema.sh"
      - "scripts/closeout/materialize-current-state-schema.mjs"
      - ".github/workflows/current-state-schema-verify.yml"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: current-state-schema-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

env:
  SUPABASE_TELEMETRY_DISABLED: "1"
  SCHEMA_WORKDIR: /tmp/hamza-current-state-schema-verify

jobs:
  verify-sanitized-snapshot:
    if: github.event_name == 'workflow_dispatch' || github.head_ref == 'feat/pr101-complete-product-expansion'
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - name: Checkout exact PR head
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha || github.sha }}
          fetch-depth: 1

      - name: Assert exact PR head and Production isolation
        shell: bash
        run: |
          set -euo pipefail
          expected="${{ github.event.pull_request.head.sha || github.sha }}"
          actual="$(git rev-parse HEAD)"
          test "$actual" = "$expected"
          test -z "${HAMZA_PRODUCTION_READONLY_URL:-}"
          test -z "${SUPABASE_ACCESS_TOKEN:-}"
          test -z "${SUPABASE_DB_PASSWORD:-}"
          test ! -d supabase/current-state-schema/parts
          test ! -d supabase/current-state-schema/generated

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Verify tracked direct snapshot
        run: node scripts/closeout/materialize-current-state-schema.mjs

      - name: Install pinned Supabase CLI and PostgreSQL client
        shell: bash
        run: |
          set -euo pipefail
          docker info >/dev/null
          sudo apt-get update -qq
          sudo apt-get install -y --no-install-recommends postgresql-client
          npm install --prefix tools/pr101-local-e2e --no-audit --no-fund
          cli="$GITHUB_WORKSPACE/tools/pr101-local-e2e/node_modules/.bin/supabase"
          test -x "$cli"
          test "$($cli --version)" = "2.109.1"
          echo "SUPABASE_BIN=$cli" >> "$GITHUB_ENV"

      - name: Build fresh isolated Supabase Local project
        shell: bash
        run: |
          set -euo pipefail
          rm -rf "$SCHEMA_WORKDIR"
          mkdir -p "$SCHEMA_WORKDIR/supabase/migrations"
          cp supabase/config.toml "$SCHEMA_WORKDIR/supabase/config.toml"
          printf '%s\n' '-- No fixtures: zero-row schema verification only.' > "$SCHEMA_WORKDIR/supabase/seed.sql"
          cp supabase/current-state-schema/current-state-schema.sql "$SCHEMA_WORKDIR/current-state-schema.sql"
          "$SUPABASE_BIN" start --help > /tmp/current-state-start-help.txt

      - name: Start fresh Supabase Local
        shell: bash
        run: |
          set -euo pipefail
          cd "$SCHEMA_WORKDIR"
          args=()
          if grep -q -- '--exclude' /tmp/current-state-start-help.txt; then args+=(--exclude studio,imgproxy); fi
          if ! "$SUPABASE_BIN" start "${args[@]}" > /tmp/current-state-supabase-start.log 2>&1; then
            sed -E 's/(sb_(publishable|secret)_[A-Za-z0-9_-]+)/[REDACTED]/g; s#postgresql?://[^[:space:]]+#[REDACTED_DB_URL]#g' /tmp/current-state-supabase-start.log >&2
            exit 1
          fi

      - name: Capture masked local-only database URL
        shell: bash
        run: |
          set +x
          cd "$SCHEMA_WORKDIR"
          "$SUPABASE_BIN" status -o env > /tmp/current-state-supabase.env
          grep -q '^DB_URL=' /tmp/current-state-supabase.env
          DB_URL="$(sed -n 's/^DB_URL="\{0,1\}\(.*\)"\{0,1\}$/\1/p' /tmp/current-state-supabase.env | head -n1)"
          test -n "$DB_URL"
          echo "::add-mask::$DB_URL"
          echo "DB_URL=$DB_URL" >> "$GITHUB_ENV"

      - name: Apply direct snapshot to isolated local database
        shell: bash
        run: |
          set -euo pipefail
          psql "$DB_URL" --no-psqlrc -X -v ON_ERROR_STOP=1 -f "$SCHEMA_WORKDIR/current-state-schema.sql"

      - name: Prove zero rows before fixtures
        shell: bash
        run: |
          set -euo pipefail
          psql "$DB_URL" --no-psqlrc -X -v ON_ERROR_STOP=1 <<'SQL'
          DO $verify$
          DECLARE
            item record;
            row_total bigint;
          BEGIN
            FOR item IN
              SELECT n.nspname, c.relname
              FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname IN ('public', 'private')
                AND c.relkind IN ('r', 'p')
              ORDER BY n.nspname, c.relname
            LOOP
              EXECUTE format('select count(*) from %I.%I', item.nspname, item.relname) INTO row_total;
              IF row_total <> 0 THEN
                RAISE EXCEPTION 'non-zero business table %.%: % rows', item.nspname, item.relname, row_total;
              END IF;
            END LOOP;
          END
          $verify$;
          SQL

      - name: Verify object inventory
        shell: bash
        run: |
          set -euo pipefail
          psql "$DB_URL" --no-psqlrc -X -v ON_ERROR_STOP=1 -At <<'SQL' > /tmp/current-state-inventory.txt
          SELECT 'tables=' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p');
          SELECT 'sequences=' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind='S';
          SELECT 'views=' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind='v';
          SELECT 'functions=' || count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private');
          SELECT 'policies=' || count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private');
          SQL
          grep -qx 'tables=83' /tmp/current-state-inventory.txt
          grep -qx 'sequences=34' /tmp/current-state-inventory.txt
          grep -qx 'views=6' /tmp/current-state-inventory.txt
          grep -qx 'functions=74' /tmp/current-state-inventory.txt
          grep -qx 'policies=50' /tmp/current-state-inventory.txt

      - name: Prove repository remains clean
        shell: bash
        run: |
          set -euo pipefail
          node scripts/closeout/materialize-current-state-schema.mjs
          test -z "$(git status --porcelain --untracked-files=all)"

      - name: Always destroy local stack and temporary values
        if: always()
        shell: bash
        run: |
          set +e
          if [ -d "$SCHEMA_WORKDIR" ]; then
            cd "$SCHEMA_WORKDIR"
            "$SUPABASE_BIN" stop --no-backup >/dev/null 2>&1 || true
          fi
          rm -rf "$SCHEMA_WORKDIR"
          rm -f /tmp/current-state-start-help.txt /tmp/current-state-supabase-start.log /tmp/current-state-supabase.env /tmp/current-state-inventory.txt
YAML

bash -n scripts/closeout/export-current-state-schema.sh scripts/closeout/finalize-current-state-schema.sh
node --check "$MATERIALIZER_PATH"
node "$MATERIALIZER_PATH"

if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund
fi
npm run verify:migrations
npm run verify:secrets
npm run verify:product-expansion
npm test

git diff --check

git add -- "$SNAPSHOT_PATH" "$MANIFEST_PATH" "$MATERIALIZER_PATH" "$WORKFLOW_PATH"
git add -A -- supabase/current-state-schema/parts supabase/current-state-schema/generated

while IFS= read -r path; do
  case "$path" in
    "$SNAPSHOT_PATH"|"$MANIFEST_PATH"|"$MATERIALIZER_PATH"|"$WORKFLOW_PATH"|supabase/current-state-schema/parts/*|supabase/current-state-schema/generated/*)
      ;;
    *)
      fail "refusing unrelated staged path: $path"
      ;;
  esac
done < <(git diff --cached --name-only)

git diff --cached --check
git commit -m "$COMMIT_MESSAGE"

FINAL_HEAD="$(git rev-parse HEAD)"
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'working tree is not clean after commit'
printf '[current-state-schema] created local commit %s\n' "$FINAL_HEAD"
printf '[current-state-schema] no push was performed\n'
