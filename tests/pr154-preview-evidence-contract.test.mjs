import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInspectorUrl,
  isTrustedVercelComment,
  selectStatusCommentCandidate,
  isTrustedVercelDeployment,
  selectPreviewCandidate,
} from "../scripts/closeout/discover-vercel-preview.mjs";

const sha = "5a553699a8a4fa5e7b300a42be7695bc636e9c99";
const inspector = "https://vercel.com/owner/project/new-deployment";
const staleInspector = "https://vercel.com/owner/project/old-deployment";
const preview = "https://exact-preview.vercel.app";

test("stale Vercel comment cannot certify a newer commit status", () => {
  const statuses = [{ id: 2, context: "Vercel", state: "success", target_url: inspector }];
  const comments = [{
    user: { login: "vercel[bot]", type: "Bot" },
    body: `[Inspect](${staleInspector}) [Preview](${preview})`,
  }];
  assert.equal(isTrustedVercelComment(comments[0], normalizeInspectorUrl(inspector)), false);
  assert.equal(selectStatusCommentCandidate(statuses, comments), null);
});

test("matching Vercel inspector and Preview label permit a trusted candidate", () => {
  const statuses = [{ id: 3, context: "Vercel", state: "success", target_url: inspector }];
  const comments = [{
    user: { login: "vercel[bot]", type: "Bot" },
    body: `[Inspect](${inspector}) [Preview](${preview})`,
  }];
  assert.equal(selectStatusCommentCandidate(statuses, comments)?.url, preview);
});

test("GitHub deployment evidence must match exact commit and Vercel app", () => {
  const deployment = {
    id: 9, sha, environment: "Preview", production_environment: false,
    performed_via_github_app: { slug: "vercel" },
  };
  assert.equal(isTrustedVercelDeployment(deployment, sha), true);
  assert.equal(isTrustedVercelDeployment(deployment, "a".repeat(40)), false);
  assert.equal(isTrustedVercelDeployment({ ...deployment, environment: "Production" }, sha), false);
  assert.equal(isTrustedVercelDeployment({ ...deployment, performed_via_github_app: null }, sha), false);
  assert.equal(selectPreviewCandidate([{
    deployment,
    statuses: [{ id: 10, state: "success", environment_url: preview }],
  }], sha)?.url, preview);
});
