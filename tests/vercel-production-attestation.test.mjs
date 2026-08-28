import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  buildProductionDeploymentEvidence,
  isTrustedVercelProductionDeployment,
  resolveCurrentProductionDeployment,
  validateProductionDeploymentEvidence,
  validateVercelStatusCorrelation,
} from "../scripts/ops/vercel-production-attestation.mjs";

const repository = "hamzaagency1357/hamza-agency";
const expectedSha = "321036ed6acd6a25b361aac3c5efce085a0c73f2";
const inspector = "https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/7xu3trE7FbpBTLhbfZ5QRSYKoYJq";
const alternateInspector = "https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/OTHER123";

function deployment(overrides = {}) {
  return {
    id: 123,
    sha: expectedSha,
    ref: "main",
    environment: "Production",
    production_environment: false,
    performed_via_github_app: null,
    created_at: "2026-08-28T08:00:00Z",
    updated_at: "2026-08-28T08:01:00Z",
    ...overrides,
  };
}

function deploymentStatus(overrides = {}) {
  return {
    id: 456,
    state: "success",
    target_url: alternateInspector,
    environment_url: "https://hamza-agency.com",
    created_at: "2026-08-28T08:02:00Z",
    updated_at: "2026-08-28T08:02:00Z",
    ...overrides,
  };
}

function commitStatus(overrides = {}) {
  return {
    id: 789,
    context: "Vercel",
    state: "success",
    description: "Deployment has completed",
    target_url: inspector,
    created_at: "2026-08-28T08:03:00Z",
    updated_at: "2026-08-28T08:03:00Z",
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
    else if (/\/deployments\/\d+\/statuses/.test(value)) body = statuses;
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

test("exact SHA and Production query constraints are preserved", async () => {
  const mock = mockGithubFetch();
  try {
    await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.ok(mock.urls[0].includes(`sha=${expectedSha}`));
    assert.ok(mock.urls[0].includes("environment=Production"));
  } finally {
    mock.restore();
  }
});

test("exact SHA candidate plus Deployment success plus trusted Vercel commit success passes", async () => {
  const mock = mockGithubFetch();
  try {
    const evidence = await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(evidence.readyState, "READY");
    assert.equal(evidence.gitSha, expectedSha);
    assert.equal(evidence.environment, "Production");
    assert.equal(evidence.deploymentUrl, inspector);
  } finally {
    mock.restore();
  }
});

test("different Deployment-status and Vercel commit-status URLs pass when independent evidence is valid", async () => {
  const mock = mockGithubFetch({
    statuses: [deploymentStatus({ target_url: alternateInspector })],
    combinedStatuses: [commitStatus({ target_url: inspector })],
  });
  try {
    const evidence = await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(evidence.deploymentStatusTargetUrl, alternateInspector);
    assert.equal(evidence.deploymentUrl, inspector);
  } finally {
    mock.restore();
  }
});

test("Deployment-status target_url is informational and not a trust root", () => {
  const evidence = buildProductionDeploymentEvidence(
    deployment(),
    deploymentStatus({ target_url: "https://example.invalid/not-vercel" }),
    expectedSha,
    commitStatus(),
    repository
  );
  assert.equal(evidence.deploymentUrl, inspector);
  assert.equal(evidence.deploymentStatusTargetUrl, "https://example.invalid/not-vercel");
});

test("missing Deployment status fails closed with a distinct reason", async () => {
  await expectResolveFailure({ statuses: [] }, /no Deployment status/);
});

for (const state of ["pending", "queued", "in_progress", "inactive", "error", "failure"]) {
  test(`Deployment status ${state} fails closed`, async () => {
    await expectResolveFailure({ statuses: [deploymentStatus({ state })] }, new RegExp(`Deployment status not success: ${state}`));
  });
}

test("latest relevant Deployment status must be success", async () => {
  await expectResolveFailure({
    statuses: [
      deploymentStatus({ id: 1, state: "success", updated_at: "2026-08-28T08:01:00Z" }),
      deploymentStatus({ id: 2, state: "failure", updated_at: "2026-08-28T08:04:00Z" }),
    ],
  }, /Deployment status not success: failure/);
});

test("missing Vercel commit status fails closed", async () => {
  await expectResolveFailure({ combinedStatuses: [] }, /no successful Vercel commit status/);
});

test("non-success Vercel commit status fails closed", async () => {
  await expectResolveFailure({ combinedStatuses: [commitStatus({ state: "pending" })] }, /no successful Vercel commit status/);
});

test("Vercel context must be exactly Vercel", async () => {
  await expectResolveFailure({ combinedStatuses: [commitStatus({ context: "vercel" })] }, /no successful Vercel commit status/);
});

test("Vercel description is informational only", () => {
  const value = validateVercelStatusCorrelation({
    deploymentStatus: deploymentStatus(),
    commitStatus: commitStatus({ description: "anything informational" }),
    repository,
  });
  assert.equal(value, inspector);
});

test("hostname spoofing is rejected", () => {
  assert.throws(() => validateVercelStatusCorrelation({
    deploymentStatus: deploymentStatus(),
    commitStatus: commitStatus({ target_url: "https://vercel.com.evil.example/team/hamza-agency/abc" }),
    repository,
  }), /malformed\/untrusted Vercel inspector URL/);
});

test("HTTP is rejected", () => {
  assert.throws(() => validateVercelStatusCorrelation({
    deploymentStatus: deploymentStatus(),
    commitStatus: commitStatus({ target_url: "http://vercel.com/team/hamza-agency/abc" }),
    repository,
  }), /malformed\/untrusted Vercel inspector URL/);
});

test("wrong Vercel project is rejected distinctly", () => {
  assert.throws(() => validateVercelStatusCorrelation({
    deploymentStatus: deploymentStatus(),
    commitStatus: commitStatus({ target_url: "https://vercel.com/team/other-project/abc" }),
    repository,
  }), /wrong Vercel project/);
});

test("malformed inspector path and missing deployment identifier are rejected", () => {
  for (const target_url of [
    "not-a-url",
    "https://vercel.com/team/hamza-agency",
    "https://vercel.com/team/hamza-agency/",
    "https://vercel.com/team/hamza-agency/abc/extra",
    "https://vercel.com/team!/hamza-agency/abc",
    "https://vercel.com/team/hamza-agency/a$b",
  ]) {
    assert.throws(() => validateVercelStatusCorrelation({
      deploymentStatus: deploymentStatus(),
      commitStatus: commitStatus({ target_url }),
      repository,
    }), /malformed\/untrusted Vercel inspector URL/);
  }
});

test("query, hash, and credentials/userinfo manipulation are rejected", () => {
  for (const target_url of [
    `${inspector}?next=evil`,
    `${inspector}#frag`,
    "https://user@vercel.com/team/hamza-agency/abc",
    "https://user:pass@vercel.com/team/hamza-agency/abc",
  ]) {
    assert.throws(() => validateVercelStatusCorrelation({
      deploymentStatus: deploymentStatus(),
      commitStatus: commitStatus({ target_url }),
      repository,
    }), /malformed\/untrusted Vercel inspector URL/);
  }
});

test("wrong SHA fails closed with a distinct mismatch reason", async () => {
  await expectResolveFailure({ deployments: [deployment({ sha: "a".repeat(40) })] }, /SHA mismatch/);
});

test("missing or malformed deployment SHA fails closed distinctly", async () => {
  await expectResolveFailure({ deployments: [deployment({ sha: "" })] }, /deployment SHA is missing or malformed/);
  await expectResolveFailure({ deployments: [deployment({ sha: "abc" })] }, /deployment SHA is missing or malformed/);
});

test("wrong environment fails closed with no exact-SHA Production candidate", async () => {
  await expectResolveFailure({ deployments: [deployment({ environment: "Preview" })] }, /no exact-SHA Production deployment candidate/);
});

test("no deployment candidate fails closed distinctly", async () => {
  await expectResolveFailure({ deployments: [] }, /no exact-SHA Production deployment candidate/);
});

test("production_environment is not mandatory", () => {
  assert.equal(isTrustedVercelProductionDeployment(deployment({ production_environment: false }), expectedSha), true);
  const value = deployment();
  delete value.production_environment;
  assert.equal(isTrustedVercelProductionDeployment(value, expectedSha), true);
});

test("performed_via_github_app.slug is not mandatory", () => {
  assert.equal(isTrustedVercelProductionDeployment(deployment({ performed_via_github_app: null }), expectedSha), true);
  const value = deployment();
  delete value.performed_via_github_app;
  assert.equal(isTrustedVercelProductionDeployment(value, expectedSha), true);
});

test("successful commit status alone cannot bypass missing Deployment success", () => {
  assert.throws(() => buildProductionDeploymentEvidence(
    deployment(),
    deploymentStatus({ state: "failure" }),
    expectedSha,
    commitStatus(),
    repository
  ), /Deployment status not success: failure/);
});

test("Vercel commit status remains mandatory even if GitHub App metadata says vercel", () => {
  assert.throws(() => buildProductionDeploymentEvidence(
    deployment({ performed_via_github_app: { slug: "vercel" }, production_environment: true }),
    deploymentStatus(),
    expectedSha,
    null,
    repository
  ), /no successful Vercel commit status/);
});

test("final evidence validation failure has a distinct safe reason", () => {
  assert.throws(() => validateProductionDeploymentEvidence({
    source: "unexpected",
    trustedApp: "vercel-status",
    repository,
    environment: "Production",
    readyState: "READY",
    gitSha: expectedSha,
    deploymentId: 123,
    statusId: 456,
    deploymentUrl: inspector,
  }, expectedSha), /final evidence validation failure/);
});

test("final evidence requires the exact expected SHA", () => {
  assert.throws(() => validateProductionDeploymentEvidence({
    source: "github-vercel-deployment",
    trustedApp: "vercel-status",
    repository,
    environment: "Production",
    readyState: "READY",
    gitSha: "a".repeat(40),
    deploymentId: 123,
    statusId: 456,
    deploymentUrl: inspector,
  }, expectedSha), /SHA mismatch/);
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
  assert.doesNotMatch(workflow, /schema_migrations\s*\([^)]*\)\s*values|insert\s+into\s+supabase_migrations\.schema_migrations|update\s+supabase_migrations\.schema_migrations|delete\s+from\s+supabase_migrations\.schema_migrations/i);
});

test("exactly-one-target enforcement remains in forward contract", async () => {
  const contract = await readFile("scripts/ops/forward-production-contract.mjs", "utf8");
  assert.match(contract, /exactly one/i);
  assert.match(contract, /unauthorized migration/i);
});
