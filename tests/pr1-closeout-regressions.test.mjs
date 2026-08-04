import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("runtime evidence preserves real failure outcomes while always cleaning", async () => {
  const workflow = await text(".github/workflows/hamza-closeout-pr1-runtime.yml");
  assert.doesNotMatch(workflow, /id: runtime\n\s+continue-on-error: true/);
  assert.doesNotMatch(workflow, /id: health_states\n\s+continue-on-error: true/);
  assert.match(workflow, /id: health_states\n\s+if: always\(\)/);
  assert.match(workflow, /id: cleanup\n\s+if: always\(\)/);
  assert.match(workflow, /runtime='\$\{\{ steps\.runtime\.outcome \}\}'/);
  assert.match(workflow, /test "\$runtime:\$health:\$cleanup" = 'success:success:success'/);
});

test("runtime verifier uses only the isolated server credential and official primary tenant contract", async () => {
  const verifier = await text("scripts/closeout/pr1-runtime-verify.mjs");
  assert.match(verifier, /REQUIRED_ENV_NAMES[\s\S]*"SERVICE_ROLE_KEY"/);
  assert.match(verifier, /REQUIRED_ENV_NAMES\.every\(\(name\) => !name\.startsWith\("NEXT_PUBLIC_"\)\)/);
  assert.match(verifier, /serviceCredential: process\.env\[REQUIRED_ENV_NAMES\[3\]\]/);
  assert.doesNotMatch(verifier, /const\s+SERVICE_ROLE_KEY\s*=/);
  assert.doesNotMatch(verifier, /process\.env\.NEXT_PUBLIC_/);
  assert.match(verifier, /is_primary\)\s*\n\s*values\([\s\S]*'active',true\)/);
  assert.match(verifier, /allTableCountFingerprint/);
  assert.match(verifier, /writeSensitiveFingerprint/);
  assert.match(verifier, /authenticated without admin membership must not manage sections/);
  assert.match(verifier, /health probe must not alter gateway-write or audit table contents/);
  assert.match(verifier, /delete from public\.activity_logs where tenant_id=/);
});

test("current-state verification is trusted, exact-head, migration-aware, and non-duplicative", async () => {
  const workflow = await text(".github/workflows/current-state-schema-verify.yml");
  assert.doesNotMatch(workflow, /feat\/pr101-complete-product-expansion/);
  assert.doesNotMatch(workflow, /fix\/production-hardening-closeout/);
  assert.doesNotMatch(workflow, /workflow_dispatch/);
  assert.match(workflow, /"supabase\/migrations\/\*\*"/);
  assert.match(workflow, /"tests\/pr1-\*\.test\.mjs"/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(workflow, /github\.actor != 'dependabot\[bot\]'/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /materialize-current-state-schema\.mjs/);
  assert.match(workflow, /build-current-state-apply\.part\{00,01,02,03\}/);
  assert.doesNotMatch(workflow, /supabase.*start/i);
  assert.doesNotMatch(workflow, /postgresql-client/);
});
