import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  assertExactPreviewUrl,
  discoverExactHeadPreview,
  isTrustedVercelComment,
  isTrustedVercelDeployment,
  normalizeInspectorUrl,
  readPreviewCommitSha,
  selectPreviewCandidate,
  selectStatusCommentCandidate,
} from "../scripts/closeout/discover-vercel-preview.mjs";

const SHA = "a".repeat(40);
const OTHER_SHA = "b".repeat(40);
const INSPECTOR = "https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/9nCQqhRCrTDMngXJkU729gsugtwP";
const PREVIEW = "https://hamza-agency-git-fix-produc-fa04d6-hamzaagencysy-3009s-projects.vercel.app";

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

function deploymentStatus(overrides = {}) {
  return {
    id: 100,
    state: "success",
    environment_url: "https://hamza-agency-preview-a.vercel.app",
    created_at: "2026-08-04T10:00:00Z",
    updated_at: "2026-08-04T10:00:00Z",
    ...overrides,
  };
}

function commitStatus(overrides = {}) {
  return {
    id: 9001,
    context: "Vercel",
    state: "success",
    target_url: INSPECTOR,
    description: "Deployment has completed",
    created_at: "2026-08-04T16:34:00Z",
    updated_at: "2026-08-04T16:34:00Z",
    creator: { login: "vercel[bot]", type: "Bot" },
    ...overrides,
  };
}

function vercelComment(overrides = {}) {
  return {
    id: 5176986458,
    body: `[vc]: opaque-payload-must-not-be-decoded\nThe latest updates on your projects.\n\n| Project | Deployment | Actions |\n| :--- | :--- | :--- |\n| hamza-agency | ![Ready](https://vercel.com/static/status/ready.svg) [Ready](${INSPECTOR}) | [Preview](${PREVIEW}) |`,
    user: { login: "vercel[bot]", type: "Bot" },
    performed_via_github_app: { slug: "vercel" },
    created_at: "2026-08-04T16:34:30Z",
    updated_at: "2026-08-04T16:34:30Z",
    ...overrides,
  };
}

test("keeps the trusted GitHub Deployment path as the primary source", () => {
  const candidate = selectPreviewCandidate([{ deployment: deployment(), statuses: [deploymentStatus()] }], SHA);
  assert.equal(candidate.url, "https://hamza-agency-preview-a.vercel.app");
  assert.equal(candidate.deploymentId, 10);
  assert.equal(candidate.source, "github-deployment");
});

test("selects the newest successful GitHub Deployment Preview deterministically", () => {
  const candidate = selectPreviewCandidate([
    { deployment: deployment({ id: 10 }), statuses: [deploymentStatus({ id: 100, environment_url: "https://old.vercel.app", updated_at: "2026-08-04T09:00:00Z" })] },
    { deployment: deployment({ id: 11 }), statuses: [deploymentStatus({ id: 101, environment_url: "https://new.vercel.app", updated_at: "2026-08-04T10:00:00Z" })] },
  ], SHA);
  assert.equal(candidate.url, "https://new.vercel.app");
  assert.equal(candidate.deploymentId, 11);
});

test("rejects GitHub Deployments for another SHA or Production", () => {
  assert.equal(selectPreviewCandidate([{ deployment: deployment({ sha: OTHER_SHA }), statuses: [deploymentStatus()] }], SHA), null);
  assert.equal(isTrustedVercelDeployment(deployment({ sha: OTHER_SHA }), SHA), false);
  assert.equal(selectPreviewCandidate([{ deployment: deployment({ environment: "Production" }), statuses: [deploymentStatus()] }], SHA), null);
  assert.equal(selectPreviewCandidate([{ deployment: deployment({ production_environment: true }), statuses: [deploymentStatus()] }], SHA), null);
});

test("uses only the newest GitHub Deployment status and rejects pending or failed", () => {
  assert.equal(selectPreviewCandidate([{ deployment: deployment(), statuses: [
    deploymentStatus({ id: 102, state: "pending", updated_at: "2026-08-04T11:00:00Z" }),
    deploymentStatus({ id: 101, state: "success", updated_at: "2026-08-04T10:00:00Z" }),
  ] }], SHA), null);
  assert.equal(selectPreviewCandidate([{ deployment: deployment(), statuses: [deploymentStatus({ state: "failure" })] }], SHA), null);
});

test("discovers fallback from exact-SHA Vercel status and matching trusted Vercel comment", () => {
  const candidate = selectStatusCommentCandidate([commitStatus()], [vercelComment()]);
  assert.equal(candidate.source, "vercel-status-comment");
  assert.equal(candidate.url, PREVIEW);
  assert.equal(candidate.inspectorUrl, INSPECTOR);
  assert.equal(isTrustedVercelComment(vercelComment(), INSPECTOR), true);
});

test("normalizes only a real Vercel inspector URL and safe tracking parameters", () => {
  assert.equal(normalizeInspectorUrl(`${INSPECTOR}/?utm_source=github`), INSPECTOR);
  assert.throws(() => normalizeInspectorUrl("https://vercel.com/hamza-agency"), /status_missing/);
  assert.throws(() => normalizeInspectorUrl(`${INSPECTOR}?token=unsafe`), /status_missing/);
});

test("rejects an ordinary user even when the comment contains Vercel links", () => {
  const candidate = selectStatusCommentCandidate([commitStatus()], [vercelComment({
    user: { login: "hamzaagency1357", type: "User" },
    performed_via_github_app: null,
  })]);
  assert.equal(candidate, null);
});

test("rejects a non-Vercel bot and a different GitHub App", () => {
  assert.equal(selectStatusCommentCandidate([commitStatus()], [vercelComment({
    user: { login: "other[bot]", type: "Bot" },
    performed_via_github_app: null,
  })]), null);
  assert.equal(selectStatusCommentCandidate([commitStatus()], [vercelComment({
    performed_via_github_app: { slug: "other" },
  })]), null);
});

test("accepts Vercel bot fallback when performed_via_github_app is omitted", () => {
  const comment = vercelComment();
  delete comment.performed_via_github_app;
  assert.equal(selectStatusCommentCandidate([commitStatus()], [comment]).url, PREVIEW);
});

test("rejects a Vercel comment whose inspector does not match the exact status", () => {
  const body = vercelComment().body.replace(INSPECTOR, "https://vercel.com/team/other-project/deployment123");
  assert.equal(selectStatusCommentCandidate([commitStatus()], [vercelComment({ body })]), null);
});

test("rejects pending or failed Vercel statuses and non-Vercel contexts", () => {
  assert.equal(selectStatusCommentCandidate([commitStatus({ state: "pending" })], [vercelComment()]), null);
  assert.equal(selectStatusCommentCandidate([commitStatus({ state: "failure" })], [vercelComment()]), null);
  assert.equal(selectStatusCommentCandidate([commitStatus({ context: "Other CI" })], [vercelComment()]), null);
});

test("accepts only a valid HTTPS vercel.app Preview candidate", () => {
  assert.deepEqual(assertExactPreviewUrl(`${PREVIEW}/path?x=1#fragment`), {
    url: PREVIEW,
    host: new URL(PREVIEW).hostname,
  });
  assert.equal(selectStatusCommentCandidate([commitStatus()], [vercelComment()]).url, PREVIEW);
});

test("rejects Production, external, and HTTP links explicitly labeled as Preview", () => {
  for (const rejected of [
    "https://hamza-agency.com",
    "https://preview.example.com",
    "http://preview.vercel.app",
  ]) {
    const comment = vercelComment({ body: vercelComment().body.replace(PREVIEW, rejected) });
    assert.throws(
      () => selectStatusCommentCandidate([commitStatus()], [comment]),
      /preview_host_rejected/
    );
    assert.throws(() => assertExactPreviewUrl(rejected), /preview_host_rejected/);
  }
});

test("returns preview_url_missing when a matching Inspector has no Preview link", () => {
  const withoutPreview = vercelComment({
    body: `[vc]: ignored\n[Ready](${INSPECTOR})`,
  });
  assert.throws(
    () => selectStatusCommentCandidate([commitStatus()], [withoutPreview]),
    /preview_url_missing/
  );
});

test("does not treat a side external link as a Preview candidate", () => {
  const sideLinkOnly = vercelComment({
    body: `[Ready](${INSPECTOR})\n[Documentation](https://preview.example.com)`,
  });
  assert.throws(
    () => selectStatusCommentCandidate([commitStatus()], [sideLinkOnly]),
    /preview_url_missing/
  );
});

test("keeps Inspector evidence separate from Preview host validation", () => {
  assert.equal(normalizeInspectorUrl(INSPECTOR), INSPECTOR);
  const inspectorOnly = vercelComment({ body: `[Ready](${INSPECTOR})` });
  assert.equal(isTrustedVercelComment(inspectorOnly, INSPECTOR), true);
  assert.throws(
    () => selectStatusCommentCandidate([commitStatus()], [inspectorOnly]),
    /preview_url_missing/
  );
});

test("never decodes or trusts the opaque vc payload as Preview evidence", () => {
  const opaqueOnly = vercelComment({
    body: `[vc]: [Preview](https://preview.example.com)\n[Ready](${INSPECTOR})`,
  });
  assert.throws(
    () => selectStatusCommentCandidate([commitStatus()], [opaqueOnly]),
    /preview_url_missing/
  );
});

test("rejects conflicting Preview URLs for one exact Inspector", () => {
  const conflicting = vercelComment({
    body: `${vercelComment().body}\n[Preview 2](https://different-preview.vercel.app)`,
  });
  assert.throws(() => selectStatusCommentCandidate([commitStatus()], [conflicting]), /ambiguous_candidates/);
});

test("does not synthesize a Preview URL from a branch name or a Status inspector", () => {
  const statusWithBranchMetadata = commitStatus({ branch: "fix/production-hardening-closeout" });
  assert.equal(selectStatusCommentCandidate([statusWithBranchMetadata], []), null);
});

test("requires HTTP 200, status ok, and the exact health commit SHA", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() { return { status: "ok", commitSha: SHA }; },
  });
  try {
    assert.equal(await readPreviewCommitSha(PREVIEW, "masked"), SHA);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("completes the full fallback when exact status, trusted comment, and health SHA agree", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (rawUrl) => {
    const url = String(rawUrl);
    if (url.includes("/deployments?")) return { ok: true, async json() { return []; } };
    if (url.includes(`/commits/${SHA}/statuses`)) return { ok: true, async json() { return [commitStatus()]; } };
    if (url.includes("/issues/107/comments")) return { ok: true, async json() { return [vercelComment()]; } };
    if (url === `${PREVIEW}/api/health`) return { ok: true, async json() { return { status: "ok", commitSha: SHA }; } };
    throw new Error(`Unexpected URL: ${url}`);
  };
  try {
    const candidate = await discoverExactHeadPreview({
      repository: "hamzaagency1357/hamza-agency",
      expectedSha: SHA,
      prNumber: 107,
      token: "github-token-fixture",
      bypassSecret: "bypass-fixture",
      attempts: 1,
      intervalMs: 0,
    });
    assert.equal(candidate.source, "vercel-status-comment");
    assert.equal(candidate.inspectorUrl, INSPECTOR);
    assert.equal(candidate.url, PREVIEW);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects fallback when /api/health returns a different SHA", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (rawUrl) => {
    const url = String(rawUrl);
    if (url.includes("/deployments?")) return { ok: true, async json() { return []; } };
    if (url.includes(`/commits/${SHA}/statuses`)) return { ok: true, async json() { return [commitStatus()]; } };
    if (url.includes("/issues/107/comments")) return { ok: true, async json() { return [vercelComment()]; } };
    if (url === `${PREVIEW}/api/health`) return { ok: true, async json() { return { status: "ok", commitSha: OTHER_SHA }; } };
    throw new Error(`Unexpected URL: ${url}`);
  };
  try {
    await assert.rejects(
      discoverExactHeadPreview({
        repository: "hamzaagency1357/hamza-agency",
        expectedSha: SHA,
        prNumber: 107,
        token: "github-token-fixture",
        bypassSecret: "bypass-fixture",
        attempts: 1,
        intervalMs: 0,
      }),
      /No trusted Vercel Preview/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses no Vercel API token and workflow grants read-only evidence permissions", () => {
  const script = fs.readFileSync(new URL("../scripts/closeout/discover-vercel-preview.mjs", import.meta.url), "utf8");
  const workflow = fs.readFileSync(new URL("../.github/workflows/hamza-closeout-structure.yml", import.meta.url), "utf8");
  assert.doesNotMatch(script, /VERCEL_TOKEN|api\.vercel\.com/i);
  for (const permission of ["contents", "deployments", "statuses", "issues", "pull-requests"]) {
    assert.match(workflow, new RegExp(`^  ${permission}: read$`, "m"));
  }
  assert.match(workflow, /GITHUB_REPOSITORY: \$\{\{ github\.repository \}\}/);
  assert.match(workflow, /PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \}\}/);
});
