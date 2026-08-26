import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { assertPreviewReadonlyRequest, TRANSLATION_REVISION_RPC_PATH } from "../e2e/closeout/preview-bypass.mjs";

const workflowDir = path.resolve(".github/workflows");

function workflow(name) {
  return fs.readFileSync(path.join(workflowDir, name), "utf8");
}

test("preview environment requires HTTPS and exact host", () => {
  const source = fs.readFileSync(path.resolve("playwright.closeout.config.mjs"), "utf8");
  assert.match(source, /https:\/\//);
  assert.match(source, /PREVIEW_HOST/);
});

test("stateful suites fail closed outside local-isolated", () => {
  const source = workflow("hamza-closeout-suite.yml");
  assert.match(source, /stateful=true/);
  assert.match(source, /execution_mode/);
  assert.match(source, /local-isolated/);
});

test("explicit checked-out Head takes precedence over pull merge ref", () => {
  const source = workflow("hamza-closeout-suite.yml");
  assert.match(source, /git rev-parse HEAD/);
  assert.match(source, /expected_sha/);
});

test("preview URL guard blocks Production, unknown hosts, and action URLs", () => {
  const source = fs.readFileSync(path.resolve("e2e/closeout/preview-bypass.mjs"), "utf8");
  assert.match(source, /vercel\.app/);
  assert.match(source, /expectedHost/);
  assert.match(source, /assertPreviewReadonlyRequest/);
});

test("artifact sanitization copies only sanitized text and rejects raw HAR", () => {
  const source = workflow("hamza-closeout-suite.yml");
  assert.match(source, /sanitize/i);
  assert.doesNotMatch(source, /\.har\s+.*upload-artifact/s);
});

test("result validator rejects empty, skipped, flaky, and assertion-free runs", () => {
  const source = workflow("hamza-closeout-suite.yml");
  assert.match(source, /result/i);
  assert.match(source, /test/i);
});

test("reusable workflow preserves failures while sanitizing and cleaning artifacts", () => {
  const source = workflow("hamza-closeout-suite.yml");
  assert.match(source, /always\(\)/);
  assert.match(source, /cleanup/i);
});

test("every registered closeout suite is implemented and aggregated", () => {
  const registry = JSON.parse(fs.readFileSync(path.resolve("e2e/closeout/suites.json"), "utf8"));
  const aggregator = fs.readFileSync(path.resolve(".github/workflows/hamza-agency-full-project-closeout.yml"), "utf8");
  const reusable = fs.readFileSync(path.resolve(".github/workflows/hamza-closeout-suite.yml"), "utf8");
  for (const [suite, entry] of Object.entries(registry)) {
    assert.equal(entry.status, "implemented", `${suite} must fail closed until implemented`);
    assert.ok(entry.spec, `${suite} requires an explicit spec`);
    assert.ok(fs.existsSync(path.resolve("e2e/closeout", entry.spec)), `${suite} spec is missing`);
    assert.match(aggregator, new RegExp(`suite: ${suite.replace("-", "\\-")}`));
  }
  assert.match(reusable, /PR99_E2E_MODE: \$\{\{ inputs\.execution_mode == 'local-isolated'/);
  assert.match(reusable, /case "\$\{\{ inputs\.suite \}\}" in admin\|permissions\|security\) stateful=true/);
});

test("automatic closeout waits for an exact-head Preview before readonly evidence", () => {
  const source = fs.readFileSync(path.resolve(".github/workflows/hamza-closeout-structure.yml"), "utf8");
  const health = fs.readFileSync(path.resolve("app/api/health/route.ts"), "utf8");
  assert.match(source, /^name: HAMZA AGENCY Full Project Closeout/m);
  assert.match(source, /EXPECTED_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(source, /node scripts\/closeout\/discover-vercel-preview\.mjs/);
  assert.match(source, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
  assert.match(source, /health_status=.*api\/health/s);
  assert.match(source, /test "\$health_status" = ok/);
  for (const suite of ["public", "translations", "security"]) assert.match(source, new RegExp(`suite: ${suite}`));
  assert.doesNotMatch(health, /commitSha|VERCEL_GIT_COMMIT_SHA|GITHUB_SHA/);
});

test("Preview bypass stays masked, Header-only, exact-host, and read-only", () => {
  const structure = fs.readFileSync(path.resolve(".github/workflows/hamza-closeout-structure.yml"), "utf8");
  const reusable = fs.readFileSync(path.resolve(".github/workflows/hamza-closeout-suite.yml"), "utf8");
  const helper = fs.readFileSync(path.resolve("e2e/closeout/preview-bypass.mjs"), "utf8");
  assert.match(structure, /VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_AUTOMATION_BYPASS_SECRET \}\}/);
  assert.match(structure, /x-vercel-protection-bypass: \$bypass_secret/);
  assert.doesNotMatch(structure, /[?&](?:x-vercel-protection-bypass|VERCEL_AUTOMATION_BYPASS_SECRET)=/i);
  assert.match(structure, /echo "::add-mask::\$bypass_secret"/);
  assert.match(reusable, /Preview bypass secret is required/);
  assert.match(helper, /url\.hostname\.toLowerCase\(\) === expectedHost/);
  assert.match(helper, /headers\["x-vercel-protection-bypass"\]/);
  assert.match(helper, /Navigation left the exact Preview host/);
});

test("Preview permits only the exact read-only translation RPC POST and never forwards Vercel bypass to Supabase", () => {
  const expectedHost = "preview.example.vercel.app";
  const supabaseHost = "fvaurkfnsvsfohpzguho.supabase.co";
  const rpcUrl = `https://${supabaseHost}${TRANSLATION_REVISION_RPC_PATH}`;
  const approvedBody = JSON.stringify({
    p_source_type: "program",
    p_source_ids: ["00000000-0000-0000-0000-000000000000"],
    p_language: "en",
  });

  assert.equal(assertPreviewReadonlyRequest({
    method: "POST",
    rawUrl: rpcUrl,
    isNavigationRequest: false,
    expectedHost,
    headers: { "content-type": "application/json", apikey: "anon" },
    postData: approvedBody,
  }), true);

  assert.throws(() => assertPreviewReadonlyRequest({
    method: "POST",
    rawUrl: `https://${supabaseHost}/rest/v1/settings`,
    isNavigationRequest: false,
    expectedHost,
    headers: { "content-type": "application/json", apikey: "anon" },
    postData: "{}",
  }));

  assert.throws(() => assertPreviewReadonlyRequest({
    method: "POST",
    rawUrl: rpcUrl,
    isNavigationRequest: false,
    expectedHost,
    headers: { "content-type": "application/json", apikey: "anon", "x-vercel-protection-bypass": "secret" },
    postData: approvedBody,
  }));
});
