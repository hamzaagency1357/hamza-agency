import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("core runtime fixture follows real new request status contracts", () => {
  const fixture = read("scripts/closeout/core-runtime-fixtures.mjs");
  assert.match(fixture, /agency_applications[\s\S]*?'new'/);
  assert.match(fixture, /service_requests[\s\S]*?'new'/);
  assert.doesNotMatch(fixture, /agency_applications[\s\S]{0,500}'pending'/);
  assert.doesNotMatch(fixture, /service_requests[\s\S]{0,500}'pending'/);
});

test("macro workflow applies operational depth only after prior local migrations", () => {
  const workflow = read(".github/workflows/hamza-macro-runtime-suite.yml");
  const prior = workflow.indexOf("20260803006000_pr105_commerce_lifecycle_hardening.sql");
  const depth = workflow.indexOf("20260803007000_pr105_operational_depth_completion.sql");
  assert.ok(prior >= 0);
  assert.ok(depth > prior);
  assert.match(workflow, /test -z "\$\{SUPABASE_ACCESS_TOKEN:-\}"/);
  assert.match(workflow, /test -z "\$\{HAMZA_PRODUCTION_READONLY_URL:-\}"/);
});

test("operational depth respects existing constraints and exposes required runtime evidence", () => {
  const migration = read("supabase/migrations/20260803007000_pr105_operational_depth_completion.sql");
  assert.match(migration, /between 1 and 10485760/);
  assert.match(migration, /event_type,'retried'/);
  assert.doesNotMatch(migration, /event_type,'resumed'/);
  assert.match(migration, /perform private\.assert_member/);
  assert.match(migration, /sla_runtime_kpis/);
  assert.match(migration, /workflow_runtime_evidence/);
});
