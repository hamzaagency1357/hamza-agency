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

function mockGithubFetch({
  deployments = [deployment()],
  statuses = [deploymentStatus()],
  statusesByDeploymentId = null,
  commitStatuses = [commitStatus()],
  statusCodeByPath = null,
} = {}) {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const value = String(url);
    requests.push({ url: value, options });
    if (statusCodeByPath) {
      for (const [needle, status] of Object.entries(statusCodeByPath)) {
        if (value.includes(needle)) return new Response("{}", { status });
      }
    }

    let body;
    if (value.includes("/deployments?")) {
      body = deployments;
    } else {
      const deploymentMatch = value.match(/\/deployments\/(\d+)\/statuses\?per_page=100$/);
      if (deploymentMatch) {
        const id = Number(deploymentMatch[1]);
        body = statusesByDeploymentId ? (statusesByDeploymentId[id] ?? []) : statuses;
      } else if (value.includes(`/commits/${expectedSha}/statuses?per_page=100`)) {
        body = commitStatuses;
      } else {
        throw new Error(`unexpected URL ${value}`);
      }
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  return {
    requests,
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
    return mock.requests;
  } finally {
    mock.restore();
  }
}

test("real workflow invocation and script runtime interface use the same environment variables", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  const script = await readFile("scripts/ops/vercel-production-attestation.mjs", "utf8");
  assert.match(workflow, /GITHUB_TOKEN:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(workflow, /EXPECTED_SHA:\s*\$\{\{ inputs\.expected_main_sha \}\}/);
  assert.match(workflow, /FORWARD_VERCEL_JSON:\s*\/tmp\/hamza-forward-vercel\.json/);
  assert.match(workflow, /node scripts\/ops\/vercel-production-attestation\.mjs/);
  assert.match(script, /repository:\s*process\.env\.GITHUB_REPOSITORY/);
  assert.match(script, /expectedSha:\s*process\.env\.EXPECTED_SHA/);
  assert.match(script, /token:\s*process\.env\.GITHUB_TOKEN/);
  assert.match(script, /process\.env\.FORWARD_VERCEL_JSON/);
});

test("GitHub requests use exact query, repository, SHA, and safe authenticated API headers", async () => {
  const mock = mockGithubFetch();
  try {
    await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(
      mock.requests[0].url,
      `https://api.github.com/repos/${repository}/deployments?sha=${expectedSha}&environment=Production&per_page=100`
    );
    assert.equal(mock.requests[0].options.headers.Accept, "application/vnd.github+json");
    assert.equal(mock.requests[0].options.headers.Authorization, "Bearer test-token");
    assert.equal(mock.requests[0].options.headers["X-GitHub-Api-Version"], "2022-11-28");
    assert.ok(mock.requests.some(({ url }) => url.endsWith(`/commits/${expectedSha}/statuses?per_page=100`)));
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

test("multiple exact-SHA Production deployments select newest created deployment then id", async () => {
  const older = deployment({ id: 101, created_at: "2026-08-28T07:00:00Z", updated_at: "2026-08-28T09:00:00Z" });
  const current = deployment({ id: 202, created_at: "2026-08-28T08:00:00Z", updated_at: "2026-08-28T08:00:00Z" });
  const mock = mockGithubFetch({
    deployments: [current, older],
    statusesByDeploymentId: {
      101: [deploymentStatus({ id: 1, state: "failure" })],
      202: [deploymentStatus({ id: 2, state: "success" })],
    },
  });
  try {
    const evidence = await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(evidence.deploymentId, 202);
    assert.ok(mock.requests.some(({ url }) => url.includes("/deployments/202/statuses")));
    assert.equal(mock.requests.some(({ url }) => url.includes("/deployments/101/statuses")), false);
  } finally {
    mock.restore();
  }
});

test("failed current deployment cannot be rescued by older successful deployment", async () => {
  const older = deployment({ id: 101, created_at: "2026-08-28T07:00:00Z" });
  const current = deployment({ id: 202, created_at: "2026-08-28T08:00:00Z" });
  const requests = await expectResolveFailure({
    deployments: [older, current],
    statusesByDeploymentId: {
      101: [deploymentStatus({ id: 1, state: "success" })],
      202: [deploymentStatus({ id: 2, state: "failure" })],
    },
  }, /Deployment status not success: state=failure deploymentId=202/);
  assert.ok(requests.some(({ url }) => url.includes("/deployments/202/statuses")));
  assert.equal(requests.some(({ url }) => url.includes("/deployments/101/statuses")), false);
});

test("deployment candidate timestamp tie uses higher numeric id deterministically", async () => {
  const sameTime = "2026-08-28T08:00:00Z";
  const mock = mockGithubFetch({
    deployments: [deployment({ id: 300, created_at: sameTime }), deployment({ id: 301, created_at: sameTime })],
    statusesByDeploymentId: {
      300: [deploymentStatus({ state: "failure" })],
      301: [deploymentStatus({ state: "success" })],
    },
  });
  try {
    const evidence = await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(evidence.deploymentId, 301);
  } finally {
    mock.restore();
  }
});

test("out-of-order Deployment statuses: older failure and newer success passes", async () => {
  const mock = mockGithubFetch({ statuses: [
    deploymentStatus({ id: 1, state: "success", created_at: "2026-08-28T08:05:00Z" }),
    deploymentStatus({ id: 2, state: "failure", created_at: "2026-08-28T08:01:00Z" }),
  ] });
  try {
    const evidence = await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(evidence.statusId, 1);
  } finally {
    mock.restore();
  }
});

test("out-of-order Deployment statuses: older success and newer failure fails", async () => {
  await expectResolveFailure({ statuses: [
    deploymentStatus({ id: 1, state: "failure", created_at: "2026-08-28T08:05:00Z" }),
    deploymentStatus({ id: 2, state: "success", created_at: "2026-08-28T08:01:00Z" }),
  ] }, /Deployment status not success: state=failure/);
});

test("out-of-order Deployment statuses: older success and newer inactive fails", async () => {
  await expectResolveFailure({ statuses: [
    deploymentStatus({ id: 1, state: "inactive", created_at: "2026-08-28T08:05:00Z" }),
    deploymentStatus({ id: 2, state: "success", created_at: "2026-08-28T08:01:00Z" }),
  ] }, /Deployment status not success: state=inactive/);
});

test("Deployment status timestamp tie uses higher numeric id deterministically", async () => {
  const sameTime = "2026-08-28T08:05:00Z";
  await expectResolveFailure({ statuses: [
    deploymentStatus({ id: 10, state: "success", created_at: sameTime }),
    deploymentStatus({ id: 11, state: "failure", created_at: sameTime }),
  ] }, /statusId=11/);
});

test("missing Deployment status fails closed with deployment ID", async () => {
  await expectResolveFailure({ statuses: [] }, /no Deployment status for deployment 123/);
});

for (const state of ["pending", "queued", "in_progress", "inactive", "error", "failure"]) {
  test(`Deployment status ${state} fails closed`, async () => {
    await expectResolveFailure({ statuses: [deploymentStatus({ state })] }, new RegExp(`Deployment status not success: state=${state}`));
  });
}

test("Vercel pending older then Vercel success newer passes", async () => {
  const mock = mockGithubFetch({ commitStatuses: [
    commitStatus({ id: 1, state: "pending", created_at: "2026-08-28T08:01:00Z" }),
    commitStatus({ id: 2, state: "success", created_at: "2026-08-28T08:05:00Z" }),
  ] });
  try {
    const evidence = await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(evidence.deploymentUrl, inspector);
  } finally {
    mock.restore();
  }
});

test("stale Vercel success cannot override newer Vercel failure", async () => {
  await expectResolveFailure({ commitStatuses: [
    commitStatus({ id: 1, state: "success", created_at: "2026-08-28T08:01:00Z" }),
    commitStatus({ id: 2, state: "failure", created_at: "2026-08-28T08:05:00Z" }),
  ] }, /latest Vercel commit status not success: state=failure.*statusId=2/);
});

test("other provider success never satisfies exact Vercel context", async () => {
  await expectResolveFailure({ commitStatuses: [
    commitStatus({ context: "Other", state: "success" }),
  ] }, /no Vercel commit status for exact context Vercel/);
});

test("lowercase vercel context does not satisfy exact Vercel contract", async () => {
  await expectResolveFailure({ commitStatuses: [commitStatus({ context: "vercel" })] }, /no Vercel commit status for exact context Vercel/);
});

test("multiple successful Vercel redeploy statuses select newest deterministically", async () => {
  const newestInspector = "https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/NEWEST456";
  const mock = mockGithubFetch({ commitStatuses: [
    commitStatus({ id: 10, target_url: inspector, created_at: "2026-08-28T08:01:00Z" }),
    commitStatus({ id: 11, target_url: newestInspector, created_at: "2026-08-28T08:05:00Z" }),
  ] });
  try {
    const evidence = await resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" });
    assert.equal(evidence.deploymentUrl, newestInspector);
  } finally {
    mock.restore();
  }
});

test("Vercel status timestamp tie uses higher numeric id deterministically", async () => {
  const sameTime = "2026-08-28T08:05:00Z";
  await expectResolveFailure({ commitStatuses: [
    commitStatus({ id: 10, state: "success", created_at: sameTime }),
    commitStatus({ id: 11, state: "failure", created_at: sameTime }),
  ] }, /latest Vercel commit status not success: state=failure.*statusId=11/);
});

test("real known Vercel inspector fixture parses and passes", () => {
  const normalized = validateVercelStatusCorrelation({
    deploymentStatus: deploymentStatus({ target_url: null }),
    commitStatus: commitStatus({
      context: "Vercel",
      state: "success",
      description: "Deployment has completed",
      target_url: inspector,
    }),
    repository,
    deploymentId: 123,
  });
  const parsed = new URL(normalized);
  assert.equal(parsed.protocol, "https:");
  assert.equal(parsed.hostname, "vercel.com");
  assert.deepEqual(parsed.pathname.split("/").slice(1), [
    "hamzaagencysy-3009s-projects",
    "hamza-agency",
    "7xu3trE7FbpBTLhbfZ5QRSYKoYJq",
  ]);
});

test("Deployment-status target_url is independent when null, missing, or different", () => {
  for (const status of [
    deploymentStatus({ target_url: null }),
    (() => { const value = deploymentStatus(); delete value.target_url; return value; })(),
    deploymentStatus({ target_url: "https://example.invalid/informational-only" }),
  ]) {
    const evidence = buildProductionDeploymentEvidence(deployment(), status, expectedSha, commitStatus(), repository);
    assert.equal(evidence.deploymentUrl, inspector);
  }
});

test("strict Vercel URL parser rejects hostname, scheme, userinfo, path, encoding, query and hash attacks", () => {
  const rejected = [
    "https://vercel.com.evil.example/team/hamza-agency/abc",
    "https://evil.vercel.com/team/hamza-agency/abc",
    "http://vercel.com/team/hamza-agency/abc",
    "https://user:pass@vercel.com/team/hamza-agency/abc",
    "https://vercel.com/team/other-project/abc",
    "https://vercel.com/team/hamza-agency",
    "https://vercel.com/team/hamza-agency/abc/extra",
    "https://vercel.com/team//hamza-agency/abc",
    "https://vercel.com//team/hamza-agency/abc",
    "https://vercel.com/team/hamza-agency%2Fextra/abc",
    "https://vercel.com/team/hamza-agency/abc%2Fextra",
    "https://vercel.com/team/hamza-agency/abc%5Cextra",
    `${inspector}?next=evil`,
    `${inspector}#frag`,
  ];
  for (const target_url of rejected) {
    assert.throws(() => validateVercelStatusCorrelation({
      deploymentStatus: deploymentStatus(),
      commitStatus: commitStatus({ target_url }),
      repository,
      deploymentId: 123,
    }), /malformed\/untrusted Vercel inspector URL|wrong Vercel project/);
  }
});

test("wrong Vercel project has a distinct safe failure", () => {
  assert.throws(() => validateVercelStatusCorrelation({
    deploymentStatus: deploymentStatus(),
    commitStatus: commitStatus({ target_url: "https://vercel.com/team/other-project/abc" }),
    repository,
    deploymentId: 123,
  }), /wrong Vercel project: expected hamza-agency/);
});

test("wrong, missing and malformed deployment SHA fail closed distinctly", async () => {
  await expectResolveFailure({ deployments: [deployment({ sha: "a".repeat(40) })] }, /SHA mismatch/);
  await expectResolveFailure({ deployments: [deployment({ sha: "" })] }, /deployment SHA is missing or malformed.*deploymentId=123/);
  await expectResolveFailure({ deployments: [deployment({ sha: "abc" })] }, /deployment SHA is missing or malformed.*deploymentId=123/);
});

test("wrong environment and empty candidate set fail closed distinctly", async () => {
  await expectResolveFailure({ deployments: [deployment({ environment: "Preview" })] }, /no exact-SHA Production deployment candidate.*environment=Production/);
  await expectResolveFailure({ deployments: [] }, /no exact-SHA Production deployment candidate.*sha=.*environment=Production/);
});

test("malformed GitHub collection responses fail closed", async () => {
  const originalFetch = globalThis.fetch;
  let index = 0;
  globalThis.fetch = async () => {
    index += 1;
    return new Response(JSON.stringify(index === 1 ? { not: "array" } : []), { status: 200 });
  };
  try {
    await assert.rejects(
      resolveCurrentProductionDeployment({ repository, expectedSha, token: "test-token" }),
      /GitHub deployments response is invalid/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external HTTP failures do not leak the token", async () => {
  const requests = await expectResolveFailure({
    statusCodeByPath: { "/deployments?": 403 },
  }, /GitHub deployment evidence lookup failed with HTTP 403/);
  assert.equal(requests[0].url.includes("test-token"), false);
});

test("production_environment and performed_via_github_app.slug are not mandatory", () => {
  assert.equal(isTrustedVercelProductionDeployment(deployment({ production_environment: false }), expectedSha), true);
  assert.equal(isTrustedVercelProductionDeployment(deployment({ performed_via_github_app: null }), expectedSha), true);
});

test("successful Vercel status cannot bypass failed Deployment status", () => {
  assert.throws(() => buildProductionDeploymentEvidence(
    deployment(),
    deploymentStatus({ state: "failure" }),
    expectedSha,
    commitStatus(),
    repository
  ), /Deployment status not success: state=failure/);
});

test("final evidence validation failure is distinct and includes safe metadata", () => {
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
  }, expectedSha), /final evidence validation failure: deploymentId=123.*environment=Production/);
});

test("workflow and resolver have no PR-, preview-, local-fixture-, or external-PAT dependency", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  const script = await readFile("scripts/ops/vercel-production-attestation.mjs", "utf8");
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(script, /head_ref|pull_request|preview|VERCEL_TOKEN|GH_TOKEN|personal access token|fixture/i);
  assert.doesNotMatch(workflow.match(/- name: Resolve exact Vercel Production deployment identity[\s\S]*?- name: Mask and require short-lived Production PAT/)?.[0] || "", /VERCEL_TOKEN|GH_TOKEN|SUPABASE_PRODUCTION_JIT_TOKEN/);
});

test("/api/health remains liveness-only and commitSha is not required by workflow contract", async () => {
  const contract = await readFile("scripts/ops/forward-production-contract.mjs", "utf8");
  assert.match(contract, /api\/health is not ok/);
  assert.doesNotMatch(contract, /health.*commitSha|commitSha.*health/i);
});

test("migration target and SHA-256 remain explicitly locked", async () => {
  const path = "supabase/migrations/20260827090000_pr99_trusted_admin_actor_db_bridge.sql";
  const sql = await readFile(path, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  assert.equal(hash, "52dc558d547d4978d60dc5e32562fc528fd867e58a88ccfba3082bb6e940db83");
});

test("workflow permissions and migration execution safety contract remain unchanged", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  assert.match(workflow, /permissions:\n  contents: read\n  deployments: read\n  statuses: read/);
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
