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

test("macro workflow applies local additive migrations in exact order", () => {
  const workflow = read(".github/workflows/hamza-macro-runtime-suite.yml");
  const prior = workflow.indexOf("20260803006000_pr105_commerce_lifecycle_hardening.sql");
  const depth = workflow.indexOf("20260803007000_pr105_operational_depth_completion.sql");
  const workflowDepth = workflow.indexOf("20260803008000_pr105_workflow_runtime_evidence_hardening.sql");
  assert.ok(prior >= 0);
  assert.ok(depth > prior);
  assert.ok(workflowDepth > depth);
  assert.match(workflow, /test -z "\$\{SUPABASE_ACCESS_TOKEN:-\}"/);
  assert.match(workflow, /test -z "\$\{HAMZA_PRODUCTION_READONLY_URL:-\}"/);
  assert.match(workflow, /--retries=0/);
});

test("operational depth respects existing constraints and exposes real evidence", () => {
  const depth = read("supabase/migrations/20260803007000_pr105_operational_depth_completion.sql");
  const workflow = read("supabase/migrations/20260803008000_pr105_workflow_runtime_evidence_hardening.sql");
  assert.match(depth, /between 1 and 10485760/);
  assert.match(depth, /manage_task_collaboration/);
  assert.match(depth, /sla_business_minutes/);
  assert.match(depth, /sla_runtime_kpis/);
  assert.match(workflow, /'retried'/);
  assert.match(workflow, /'operation','resume'/);
  assert.match(workflow, /workflow_runtime_evidence/);
  assert.match(workflow, /tenant_admin_audit/);
  assert.doesNotMatch(workflow, /workflow_events[\s\S]{0,250}'resumed'/);
  assert.doesNotMatch(depth + workflow, /drop constraint|disable trigger|no validate/i);
});
