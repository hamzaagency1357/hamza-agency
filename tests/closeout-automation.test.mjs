import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertCloseoutEnvironment } from "../scripts/closeout/environment-guard.mjs";
import { buildUrlGuard } from "../scripts/closeout/url-guard.mjs";
import { sanitizeArtifactTree } from "../scripts/closeout/sanitize-artifacts.mjs";
import { scanSafeArtifacts } from "../scripts/closeout/scan-safe-artifacts.mjs";
import { validatePlaywrightResults } from "../scripts/closeout/validate-results.mjs";

const SHA = "a".repeat(40);

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hamza-closeout-"));
}

function baseEnv(overrides = {}) {
  return {
    CLOSEOUT_EXECUTION_MODE: "preview-readonly",
    CLOSEOUT_SUITE: "public",
    CLOSEOUT_TARGET_URL: "https://preview.example.vercel.app",
    CLOSEOUT_PREVIEW_HOST: "preview.example.vercel.app",
    CLOSEOUT_EXPECTED_SHA: SHA,
    CLOSEOUT_ACTUAL_SHA: SHA,
    ...overrides,
  };
}

function resultFile(file, testValue) {
  fs.writeFileSync(file, JSON.stringify({ suites: [{ specs: [{ title: "public", tests: [testValue] }] }] }));
}

test("preview environment requires HTTPS and exact host", () => {
  assert.equal(assertCloseoutEnvironment(baseEnv()).targetHost, "preview.example.vercel.app");
  assert.throws(() => assertCloseoutEnvironment(baseEnv({ CLOSEOUT_TARGET_URL: "http://preview.example.vercel.app" })), /requires HTTPS/);
  assert.throws(() => assertCloseoutEnvironment(baseEnv({ CLOSEOUT_PREVIEW_HOST: "other.vercel.app" })), /preview host mismatch/);
});

test("stateful suites fail closed outside local-isolated", () => {
  assert.throws(() => assertCloseoutEnvironment(baseEnv({ CLOSEOUT_SUITE: "admin" })), /requires local-isolated/);
  assert.throws(() => assertCloseoutEnvironment(baseEnv({ CLOSEOUT_ACTUAL_SHA: "b".repeat(40) })), /Head mismatch/);
});

test("explicit checked-out Head takes precedence over pull merge ref", () => {
  const result = assertCloseoutEnvironment(baseEnv({ GITHUB_SHA: "b".repeat(40) }));
  assert.equal(result.expectedSha, SHA);
});

test("preview URL guard blocks Production, unknown hosts, and action URLs", () => {
  const guard = buildUrlGuard({ expectedHost: "preview.example.vercel.app", allowedExternalHosts: ["fonts.example.com"] });
  assert.equal(guard("https://preview.example.vercel.app/en").hostname, "preview.example.vercel.app");
  assert.equal(guard("https://fonts.example.com/font.woff2").hostname, "fonts.example.com");
  assert.throws(() => guard("https://hamza-agency.com"), /reached Production/);
  assert.throws(() => guard("https://evil.example.com"), /outside the allowlist/);
  assert.throws(() => guard("https://preview.example.vercel.app/accept-invitation?token=x"), /state-changing action URL/);
});

test("artifact sanitization copies only sanitized text and rejects raw HAR", () => {
  const root = tempDir();
  const raw = path.join(root, "raw");
  const safe = path.join(root, "safe");
  fs.mkdirSync(raw, { recursive: true });
  fs.writeFileSync(path.join(raw, "report.json"), JSON.stringify({ authorization: "Bearer abc.def.ghi", access_token: "secret-value" }));
  assert.equal(sanitizeArtifactTree(raw, safe), 1);
  const sanitized = fs.readFileSync(path.join(safe, "report.json"), "utf8");
  assert.match(sanitized, /\[REDACTED\]/);
  fs.appendFileSync(path.join(safe, "report.json"), "\n/authorization:|refresh_token/i\n");
  assert.equal(scanSafeArtifacts(safe), 1);

  const unsafe = path.join(root, "unsafe");
  fs.mkdirSync(unsafe, { recursive: true });
  fs.writeFileSync(path.join(unsafe, "report.json"), JSON.stringify({ authorization: "Bearer raw-secret-value" }));
  assert.throws(() => scanSafeArtifacts(unsafe), /secret pattern/);

  fs.writeFileSync(path.join(raw, "network.har"), "{}");
  assert.throws(() => sanitizeArtifactTree(raw, path.join(root, "safe-2")), /Forbidden raw artifact type/);
});

test("result validator rejects empty, skipped, flaky, and assertion-free runs", () => {
  const root = tempDir();
  const file = path.join(root, "results.json");
  fs.writeFileSync(file, JSON.stringify({ suites: [] }));
  assert.throws(() => validatePlaywrightResults(file, "public"), /executed = 0/);

  resultFile(file, { results: [{ status: "skipped" }], annotations: [] });
  assert.throws(() => validatePlaywrightResults(file, "public"), /executed = 0|unexpected skips/);

  resultFile(file, { results: [{ status: "passed" }], annotations: [] });
  assert.throws(() => validatePlaywrightResults(file, "public"), /tests without assertion evidence/);

  resultFile(file, { status: "flaky", results: [{ status: "failed" }, { status: "passed" }], annotations: [{ type: "closeout-assertions", description: "1" }] });
  assert.throws(() => validatePlaywrightResults(file, "public"), /flaky tests/);

  resultFile(file, { results: [{ status: "passed" }], annotations: [{ type: "closeout-assertions", description: "3" }] });
  const summary = validatePlaywrightResults(file, "public");
  assert.equal(summary.executed, 1);
  assert.equal(summary.assertions, 3);
  assert.equal(summary.assertionFree, 0);
});

test("reusable workflow preserves failures while sanitizing and cleaning artifacts", () => {
  const workflow = fs.readFileSync(path.resolve(".github/workflows/hamza-closeout-suite.yml"), "utf8");
  assert.match(workflow, /id: playwright\n\s+continue-on-error: true/);
  assert.match(workflow, /name: Generate safe failure summary source\n\s+if: always\(\)/);
  assert.match(workflow, /id: sanitize\n\s+if: always\(\)\n\s+continue-on-error: true/);
  assert.match(workflow, /id: secret_scan\n\s+if: always\(\) && steps\.sanitize\.outcome == 'success'/);
  assert.match(workflow, /name: Upload safe reports only\n\s+if: always\(\) && steps\.sanitize\.outcome == 'success' && steps\.secret_scan\.outcome == 'success'/);
  assert.match(workflow, /name: Always remove fixtures and local runtime\n\s+if: always\(\)/);
  assert.match(workflow, /rm -rf artifacts\/raw/);
  assert.match(workflow, /name: Preserve the real suite conclusion\n\s+if: always\(\)/);
  assert.match(workflow, /test '\$\{\{ steps\.playwright\.outcome \}\}' = success/);
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
  assert.match(reusable, /tracking\|admin\|page-builder\|backup-restore\|trash\|notifications\|permissions\|security/);
});
