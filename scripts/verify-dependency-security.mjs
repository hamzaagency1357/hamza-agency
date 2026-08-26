import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

function runAudit(args) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["audit", ...args, "--json"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (!result.stdout?.trim()) {
    throw new Error(`npm audit produced no JSON output: ${result.stderr || `exit ${result.status}`}`);
  }
  return JSON.parse(result.stdout);
}

function assertApprovedNext15Residual(audit, label) {
  const vulnerabilities = audit.vulnerabilities || {};
  const keys = Object.keys(vulnerabilities).sort();
  assert.deepEqual(keys, ["next", "postcss", "sharp"], `${label}: unexpected vulnerability set: ${keys.join(", ")}`);
  assert.equal(audit.metadata?.vulnerabilities?.critical || 0, 0, `${label}: critical vulnerability detected`);
  assert.equal(audit.metadata?.vulnerabilities?.high || 0, 3, `${label}: high vulnerability count changed`);

  const next = vulnerabilities.next;
  const postcss = vulnerabilities.postcss;
  const sharp = vulnerabilities.sharp;

  assert.equal(next?.isDirect, true, `${label}: Next must remain the only direct affected package`);
  assert.equal(postcss?.isDirect, false, `${label}: nested PostCSS unexpectedly became direct`);
  assert.equal(sharp?.isDirect, false, `${label}: nested Sharp unexpectedly became direct`);
  assert.deepEqual(postcss?.nodes, ["node_modules/next/node_modules/postcss"], `${label}: PostCSS advisory path changed`);
  assert.deepEqual(sharp?.nodes, ["node_modules/next/node_modules/sharp"], `${label}: Sharp advisory path changed`);
  assert.equal(next?.fixAvailable?.isSemVerMajor, true, `${label}: Next remediation is no longer a major-only boundary`);
  assert.match(String(next?.fixAvailable?.version || ""), /^16\./, `${label}: expected Next 16 remediation boundary`);
}

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const packages = lock.packages || {};
assert.equal(packages["node_modules/next"]?.version, "15.5.22", "Next must remain on approved secure Next 15 patch");
assert.equal(packages["node_modules/postcss"]?.version, "8.5.26", "direct PostCSS security target regressed");
assert.equal(packages["node_modules/sharp"]?.version, "0.35.3", "direct Sharp security target regressed");
assert.equal(packages["node_modules/nanoid"]?.version, "3.3.18", "nanoid security target regressed");
assert.equal(packages["node_modules/@playwright/test"]?.version, "1.62.1", "Playwright security target regressed");
assert.equal(packages["node_modules/js-yaml"]?.version, "4.3.1", "js-yaml dev transitive fix regressed");
assert.equal(packages["node_modules/brace-expansion"]?.version, "1.1.18", "brace-expansion legacy-line fix regressed");
assert.equal(packages["node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion"]?.version, "5.0.9", "brace-expansion modern-line fix regressed");

const runtimeAudit = runAudit(["--omit=dev"]);
assertApprovedNext15Residual(runtimeAudit, "runtime audit");

const fullAudit = runAudit([]);
assertApprovedNext15Residual(fullAudit, "full audit");

console.log("Dependency security gate PASS: direct/dev findings fixed; only documented Next 15 nested PostCSS/Sharp residual remains, with remediation requiring Next 16.");
