import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertExactPreviewUrl, isTrustedVercelDeployment } from "../scripts/closeout/discover-vercel-preview.mjs";

const migrationPath = "supabase/migrations/20260804090000_pr1_production_hardening_closeout.sql";
const healthPath = "app/api/product-expansion/health/route.ts";
const gatewayClientPath = "lib/server/pr101OidcGateway.ts";
const gatewayPath = "supabase/functions/pr101-vercel-oidc-gateway/index.ts";
const workflowPath = ".github/workflows/hamza-closeout-structure.yml";
const runtimeWorkflowPath = ".github/workflows/hamza-closeout-pr1-runtime.yml";

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("OIDC gateway grants remain least privilege", async () => {
  const migration = await text(migrationPath);
  const gatewayGrant = migration.match(/grant execute on function public\.pr101_oidc_gateway\([\s\S]*?\) to [a-z_]+;/i)?.[0] || "";
  assert.ok(gatewayGrant);
  assert.match(gatewayGrant, /to service_role;/i);
  assert.match(migration, /revoke all on function public\.pr101_oidc_gateway\([\s\S]*?\) from public,anon,authenticated;/i);
  assert.doesNotMatch(gatewayGrant, /to (anon|authenticated|public);/i);
});

test("published sections policy does not invoke admin authorization", async () => {
  const migration = await text(migrationPath);
  const policy = migration.match(/alter policy "public reads published visible sections"[\s\S]*?\n  \);/i)?.[0] || "";
  assert.ok(policy);
  assert.match(policy, /is_published=true/i);
  assert.match(policy, /scheduled_publish_at/i);
  assert.match(policy, /scheduled_unpublish_at/i);
  assert.doesNotMatch(policy, /current_user_is_admin|is_active_admin/i);
});

test("health performs a real read-only OIDC privilege probe", async () => {
  const [health, gateway, migration] = await Promise.all([
    text(healthPath),
    text(gatewayPath),
    text(migrationPath),
  ]);
  assert.match(health, /callPr101OidcGateway<[\s\S]*?>\([\s\S]*?"health_probe"/s);
  assert.doesNotMatch(health, /VERCEL_OIDC_TOKEN[^\n]*\? "healthy"/);
  assert.match(gateway, /action === "health_probe" \? "pr101_oidc_health_probe"/);
  assert.match(migration, /to_regprocedure\([\s\S]*pr101_oidc_gateway/i);
  assert.match(migration, /current_user\s*<>\s*'service_role'/i);
  assert.match(migration, /has_function_privilege\('service_role',gateway_oid,'EXECUTE'\)/i);
  assert.match(migration, /has_function_privilege\('anon',gateway_oid,'EXECUTE'\)/i);
  assert.match(migration, /has_function_privilege\('authenticated',gateway_oid,'EXECUTE'\)/i);
  const probe = migration.match(/create or replace function public\.pr101_oidc_health_probe\(\)[\s\S]*?\$function\$;/i)?.[0] || "";
  assert.ok(probe);
  assert.match(probe, /stable/i);
  assert.match(probe, /security invoker/i);
  assert.doesNotMatch(probe, /insert into|update\s|delete from/i);
});

test("gateway distinguishes database permission, function, rejection, and availability failures", async () => {
  const [client, edge] = await Promise.all([text(gatewayClientPath), text(gatewayPath)]);
  for (const reason of [
    "database_authentication_failed",
    "database_permission_rejected",
    "database_function_missing",
    "database_contract_rejected",
    "database_unavailable",
  ]) {
    assert.match(client, new RegExp(reason));
    assert.match(edge, new RegExp(reason));
  }
  assert.doesNotMatch(client, /response\.status === 502\) throw new Pr101OidcGatewayError\("database_unavailable"\)/);
  assert.match(edge, /classifyDatabaseError/);
  assert.match(edge, /sanitizeHealthProbe/);
});

test("full closeout is branch-agnostic, exact-head, trusted, and fail-closed", async () => {
  const [workflow, runtimeWorkflow] = await Promise.all([text(workflowPath), text(runtimeWorkflowPath)]);
  assert.doesNotMatch(workflow, /feat\/pr101-complete-product-expansion/);
  assert.doesNotMatch(workflow, /fix\/production-hardening-closeout/);
  assert.doesNotMatch(workflow, /hamza-agency-git-[a-z0-9-]+\.vercel\.app/);
  assert.doesNotMatch(workflow, /workflow_dispatch/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(workflow, /github\.actor != 'dependabot\[bot\]'/);
  assert.match(workflow, /author_association/);
  assert.match(workflow, /deployments: read/);
  assert.match(workflow, /discover-vercel-preview\.mjs/);
  assert.match(workflow, /preview_host: "\$\{\{ needs\.exact-preview\.outputs\.preview_host \}\}"/);
  assert.match(workflow, /value\.result!=='success'/);
  assert.match(workflow, /pr1-runtime-evidence/);
  assert.match(runtimeWorkflow, /20260803003000_pr105_macro_runtime_completion\.sql/);
  assert.match(runtimeWorkflow, /20260803008000_pr105_workflow_runtime_evidence_hardening\.sql/);
  assert.match(runtimeWorkflow, /20260804090000_pr1_production_hardening_closeout\.sql/);
  assert.match(runtimeWorkflow, /pr1-runtime-verify\.mjs/);
});

test("Preview discovery accepts only exact-SHA transient Vercel deployments", () => {
  const sha = "a".repeat(40);
  const trusted = {
    sha,
    production_environment: false,
    transient_environment: true,
    performed_via_github_app: { slug: "vercel" },
  };
  assert.equal(isTrustedVercelDeployment(trusted, sha), true);
  assert.equal(isTrustedVercelDeployment({ ...trusted, sha: "b".repeat(40) }, sha), false);
  assert.equal(isTrustedVercelDeployment({ ...trusted, production_environment: true }, sha), false);
  assert.equal(isTrustedVercelDeployment({ ...trusted, performed_via_github_app: { slug: "other" } }, sha), false);
  assert.deepEqual(
    assertExactPreviewUrl("https://hamza-agency-abc123.vercel.app/path?x=1"),
    { url: "https://hamza-agency-abc123.vercel.app", host: "hamza-agency-abc123.vercel.app" }
  );
  assert.throws(() => assertExactPreviewUrl("https://hamza-agency.com"), /Vercel deployment host|Production host/);
  assert.throws(() => assertExactPreviewUrl("http://preview.vercel.app"), /HTTPS/);
});
