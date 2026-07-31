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

test("preview environment requires HTTPS and exact host", () => {
  assert.equal(assertCloseoutEnvironment(baseEnv()).targetHost, "preview.example.vercel.app");
  assert.throws(() => assertCloseoutEnvironment(baseEnv({ CLOSEOUT_TARGET_URL: "http://preview.example.vercel.app" })), /requires HTTPS/);
  assert.throws(() => assertCloseoutEnvironment(baseEnv({ CLOSEOUT_PREVIEW_HOST: "other.vercel.app" })), /preview host mismatch/);
});

test("stateful suites fail closed outside local-isolated", () => {
  assert.throws(() => assertCloseoutEnvironment(baseEnv({ CLOSEOUT_SUITE: "admin" })), /requires local-isolated/);
  assert.throws(() => assertCloseoutEnvironment(baseEnv({ CLOSEOUT_ACTUAL_SHA: "b".repeat(40) })), /Head mismatch/);
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
  fs.writeFileSync(path.join(raw, "report.json"), JSON.stringify({ authorization: "Bearer abc.def.ghi", access_token: "secret" }));
  assert.equal(sanitizeArtifactTree(raw, safe), 1);
  const sanitized = fs.readFileSync(path.join(safe, "report.json"), "utf8");
  assert.match(sanitized, /\[REDACTED\]/);
  assert.equal(scanSafeArtifacts(safe), 1);
  fs.writeFileSync(path.join(raw, "network.har"), "{}");
  assert.throws(() => sanitizeArtifactTree(raw, path.join(root, "safe-2")), /Forbidden raw artifact type/);
});

test("result validator rejects empty, skipped, and assertion-free runs", () => {
  const root = tempDir();
  const file = path.join(root, "results.json");
  fs.writeFileSync(file, JSON.stringify({ suites: [] }));
  assert.throws(() => validatePlaywrightResults(file, "public"), /executed = 0/);

  fs.writeFileSync(file, JSON.stringify({ suites: [{ specs: [{ title: "public", tests: [{ results: [{ status: "skipped", steps: [] }] }] }] }] }));
  assert.throws(() => validatePlaywrightResults(file, "public"), /executed = 0|unexpected skips/);

  fs.writeFileSync(file, JSON.stringify({ suites: [{ specs: [{ title: "public", tests: [{ results: [{ status: "passed", steps: [] }] }] }] }] }));
  assert.throws(() => validatePlaywrightResults(file, "public"), /no assertion evidence/);

  fs.writeFileSync(file, JSON.stringify({ suites: [{ specs: [{ title: "public", tests: [{ results: [{ status: "passed", steps: [{ category: "expect", title: "expect.toBeTruthy" }] }] }] }] }] }));
  const summary = validatePlaywrightResults(file, "public");
  assert.equal(summary.executed, 1);
  assert.equal(summary.assertions, 1);
});
