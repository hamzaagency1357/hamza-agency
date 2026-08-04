import assert from "node:assert/strict";
import test from "node:test";
import {
  assertExactPreviewUrl,
  isTrustedVercelDeployment,
  readPreviewCommitSha,
  selectPreviewCandidate,
} from "../scripts/closeout/discover-vercel-preview.mjs";

const SHA = "a".repeat(40);
const OTHER_SHA = "b".repeat(40);

function deployment(overrides = {}) {
  return {
    id: 10,
    sha: SHA,
    environment: "Preview",
    production_environment: false,
    performed_via_github_app: { slug: "vercel" },
    ...overrides,
  };
}

function status(overrides = {}) {
  return {
    id: 100,
    state: "success",
    environment_url: "https://hamza-agency-preview-a.vercel.app",
    created_at: "2026-08-04T10:00:00Z",
    updated_at: "2026-08-04T10:00:00Z",
    ...overrides,
  };
}

test("selects one successful exact-head Preview from environment_url", () => {
  const candidate = selectPreviewCandidate([{ deployment: deployment(), statuses: [status()] }], SHA);
  assert.equal(candidate.url, "https://hamza-agency-preview-a.vercel.app");
  assert.equal(candidate.deploymentId, 10);
});

test("selects the newest successful Preview deterministically", () => {
  const candidate = selectPreviewCandidate([
    { deployment: deployment({ id: 10 }), statuses: [status({ id: 100, environment_url: "https://old.vercel.app", updated_at: "2026-08-04T09:00:00Z" })] },
    { deployment: deployment({ id: 11 }), statuses: [status({ id: 101, environment_url: "https://new.vercel.app", updated_at: "2026-08-04T10:00:00Z" })] },
  ], SHA);
  assert.equal(candidate.url, "https://new.vercel.app");
  assert.equal(candidate.deploymentId, 11);
});

test("rejects a deployment for a different Head SHA", () => {
  assert.equal(selectPreviewCandidate([{ deployment: deployment({ sha: OTHER_SHA }), statuses: [status()] }], SHA), null);
  assert.equal(isTrustedVercelDeployment(deployment({ sha: OTHER_SHA }), SHA), false);
});

test("rejects Production even when Vercel created the deployment", () => {
  assert.equal(selectPreviewCandidate([{ deployment: deployment({ environment: "Production" }), statuses: [status()] }], SHA), null);
  assert.equal(selectPreviewCandidate([{ deployment: deployment({ production_environment: true }), statuses: [status()] }], SHA), null);
});

test("uses only the newest status and rejects failed or pending deployments", () => {
  assert.equal(selectPreviewCandidate([{ deployment: deployment(), statuses: [
    status({ id: 102, state: "pending", updated_at: "2026-08-04T11:00:00Z" }),
    status({ id: 101, state: "success", updated_at: "2026-08-04T10:00:00Z" }),
  ] }], SHA), null);
  assert.equal(selectPreviewCandidate([{ deployment: deployment(), statuses: [status({ state: "failure" })] }], SHA), null);
});

test("falls back to a trusted target_url", () => {
  const candidate = selectPreviewCandidate([{ deployment: deployment(), statuses: [status({ environment_url: null, target_url: "https://target.vercel.app" })] }], SHA);
  assert.equal(candidate.url, "https://target.vercel.app");
});

test("rejects a successful status without a trusted deployment URL", () => {
  assert.equal(selectPreviewCandidate([{ deployment: deployment(), statuses: [status({ environment_url: null, target_url: null })] }], SHA), null);
  assert.throws(() => assertExactPreviewUrl("https://hamza-agency.com"), /Vercel deployment host|Production host/);
});

test("requires /api/health commitSha to match the exact Head", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() { return { commitSha: SHA }; },
  });
  try {
    assert.equal(await readPreviewCommitSha("https://preview.vercel.app", "masked"), SHA);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
