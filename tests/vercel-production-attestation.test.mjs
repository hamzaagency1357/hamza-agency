import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  buildProductionDeploymentEvidence,
  isTrustedVercelProductionDeployment,
  resolveCurrentProductionDeployment,
  validateVercelStatusCorrelation,
} from "../scripts/ops/vercel-production-attestation.mjs";

const repository = "hamzaagency1357/hamza-agency";
const expectedSha = "5f6951ed2959803917370d2406ad1fdaf4053fea";
const inspector = "https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/CriwSQBGvJmrrn7cfDRsUtQmHpxm";

function deployment(overrides = {}) {
  return {
    id: 123,
    sha: expectedSha,
    ref: "main",
    environment: "Production",
    production_environment: false,
    performed_via_github_app: null,
    created_at: "2026-08-27T11:06:18Z",
    updated_at: "2026-08-27T11:07:43Z",
    ...overrides,
  };
}

function deploymentStatus(overrides = {}) {
  return {
    id: 456,
    state: "success",
    target_url: inspector,
    environment_url: "https://hamza-agency.com",
    created_at: "2026-08-27T11:07:43Z",
    updated_at: "2026-08-27T11:07:43Z",
    ...overrides,
  };
}

function commitStatus(overrides = {}) {
  return {
    context: "Vercel",
    state: "success",
    description: "Deployment has completed",
    target_url: inspector,
    ...overrides,
  };
}

function mockGithubFetch({ deployments = [deployment()], statuses = [deploymentStatus()], combinedStatuses = [commitStatus()] } = {}) {
  const urls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const value = String(url);
    urls.push(value);
    let body;
    if (value.includes("/deployments?")) body = deployments;
    else if (value.includes("/deployments/123/statuses")) body = statuses;
    else if (value.includes(`/commits/${expectedSha}/status`)) body = { state: "success", statuses: combinedStatuses };
    else throw new Error(`unexpected URL ${value}`);
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  return {
    urls,
    restore() { globalThis.fetch = originalFetch; },
  };
}

async function expectResolveFailure(options, pattern) {
  const mock = mockGithubFetch(options);
  try {
    await assert.rejects(
      resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" }),
      pattern
    );
  } finally {
    mock.restore();
  }
}

test("deployment query is constrained by exact SHA and Production environment", async () => {
  const mock = mockGithubFetch();
  try {
    await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.ok(mock.urls[0].includes(`/deployments?sha=${expectedSha}&environment=Production&per_page=100`));
  } finally {
    mock.restore();
  }
});

test("Production environment and exact full SHA are required", () => {
  assert.equal(isTrustedVercelProductionDeployment(deployment(), expectedSha), true);
  assert.equal(isTrustedVercelProductionDeployment(deployment({ environment: "Preview" }), expectedSha), false);
  assert.equal(isTrustedVercelProductionDeployment(deployment({ sha: "" }), expectedSha), false);
  assert.equal(isTrustedVercelProductionDeployment(deployment({ sha: "abc" }), expectedSha), false);
  assert.equal(isTrustedVercelProductionDeployment(deployment({ sha: "a".repeat(40) }), expectedSha), false);
});

test("production_environment false or missing does not reject valid exact-SHA Production evidence", () => {
  assert.equal(isTrustedVercelProductionDeployment(deployment({ production_environment: false }), expectedSha), true);
  const value = deployment();
  delete value.production_environment;
  assert.equal(isTrustedVercelProductionDeployment(value, expectedSha), true);
});

test("performed_via_github_app null or missing does not reject valid exact-SHA Production evidence", () => {
  assert.equal(isTrustedVercelProductionDeployment(deployment({ performed_via_github_app: null }), expectedSha), true);
  const value = deployment();
  delete value.performed_via_github_app;
  assert.equal(isTrustedVercelProductionDeployment(value, expectedSha), true);
});

test("exact SHA plus Production plus successful correlated Vercel status passes", async () => {
  const mock = mockGithubFetch();
  try {
    const evidence = await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(evidence.readyState, "READY");
    assert.equal(evidence.gitSha, expectedSha);
    assert.equal(evidence.environment, "Production");
    assert.equal(evidence.trustedApp, "vercel-status");
    assert.equal(evidence.deploymentUrl, inspector);
  } finally {
    mock.restore();
  }
});

test("wrong, missing, or malformed deployment SHA fails closed", async () => {
  await expectResolveFailure({ deployments: [deployment({ sha: "a".repeat(40) })] }, /could not be resolved/);
  await expectResolveFailure({ deployments: [deployment({ sha: "" })] }, /could not be resolved/);
  await expectResolveFailure({ deployments: [deployment({ sha: "abc" })] }, /could not be resolved/);
});

test("wrong environment fails closed", async () => {
  await expectResolveFailure({ deployments: [deployment({ environment: "Preview" })] }, /could not be resolved/);
});

test("deployment pending, inactive, error, or failure never maps to READY", async () => {
  for (const state of ["pending", "in_progress", "inactive", "error", "failure"]) {
    await expectResolveFailure({ statuses: [deploymentStatus({ state })] }, /identity correlation failed/);
  }
});

test("non-Vercel or unsuccessful commit status evidence fails closed", async () => {
  await expectResolveFailure({ combinedStatuses: [commitStatus({ context: "Other" })] }, /successful Vercel commit status evidence is missing/);
  await expectResolveFailure({ combinedStatuses: [commitStatus({ state: "pending" })] }, /successful Vercel commit status evidence is missing/);
});

test("Vercel spoof protection rejects loose hostname and project matching", () => {
  for (const target_url of [
    "https://vercel.com.evil.example/team/hamza-agency/CriwSQBGvJmrrn7cfDRsUtQmHpxm",
    "https://evil.example/team/hamza-agency/CriwSQBGvJmrrn7cfDRsUtQmHpxm",
    "http://vercel.com/team/hamza-agency/CriwSQBGvJmrrn7cfDRsUtQmHpxm",
    "https://vercel.com/team/other-project/CriwSQBGvJmrrn7cfDRsUtQmHpxm",
    "https://vercel.com/team/hamza-agency/CriwSQBGvJmrrn7cfDRsUtQmHpxm?redirect=evil",
  ]) {
    assert.throws(
      () => validateVercelStatusCorrelation({ deploymentStatus: deploymentStatus({ target_url }), commitStatus: commitStatus({ target_url }), repository }),
      /identity correlation failed/
    );
  }
});

test("deployment status and Vercel commit status must identify the same inspector deployment", () => {
  assert.throws(
    () => validateVercelStatusCorrelation({
      deploymentStatus: deploymentStatus(),
      commitStatus: commitStatus({ target_url: "https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/DIFFERENT" }),
      repository,
    }),
    /identity correlation failed/
  );
});

test("correlated evidence does not depend on production_environment or GitHub App metadata", () => {
  const value = deployment({ production_environment: false, performed_via_github_app: null });
  const evidence = buildProductionDeploymentEvidence(value, deploymentStatus(), expectedSha, commitStatus(), repository);
  assert.equal(evidence.trustedApp, "vercel-status");
  assert.equal(evidence.productionEnvironment, true);
  assert.equal(evidence.gitSha, expectedSha);
});

test("/api/health remains liveness-only and commitSha is not required by workflow contract", async () => {
  const contract = await readFile("scripts/ops/forward-production-contract.mjs", "utf8");
  assert.match(contract, /api\/health is not ok/);
  assert.doesNotMatch(contract, /health.*commitSha|commitSha.*health/i);
});

test("migration target and SHA-256 remain unchanged", async () => {
  const path = "supabase/migrations/20260827090000_pr99_trusted_admin_actor_db_bridge.sql";
  const sql = await readFile(path, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  assert.equal(hash, "ee8e342eef5e6e0a677f4fe981b66de8eac2bf2446896bc8260a9063a58decd5");
});

test("workflow permissions and execution safety contract remain unchanged", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  assert.match(workflow, /permissions:\n  contents: read\n  deployments: read\n  statuses: read/);
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment: production-database/);
  assert.match(workflow, /test "\$\(\$cli --version\)" = "2\.109\.1"/);
  assert.match(workflow, /db push --db-url "\$FORWARD_DB_URL" --dry-run/);
  assert.match(workflow, /migration up --db-url "\$FORWARD_DB_URL"/);
  assert.match(workflow, /20260827090000_pr99_trusted_admin_actor_db_bridge\.sql/);
  assert.doesNotMatch(workflow, /--include-all/);
  assert.doesNotMatch(workflow, /migration repair/);
});

test("exactly-one-target enforcement remains in forward contract", async () => {
  const contract = await readFile("scripts/ops/forward-production-contract.mjs", "utf8");
  assert.match(contract, /exactly one/i);
  assert.match(contract, /unauthorized migration/i);
});
