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

function assertNoVulnerabilities(audit, label) {
  const vulnerabilities = audit.vulnerabilities || {};
  const keys = Object.keys(vulnerabilities).sort();
  if (keys.length > 0) {
    const details = keys.map((name) => {
      const finding = vulnerabilities[name];
      const via = (finding.via || []).map((item) =>
        typeof item === "string" ? item : [item.name, item.title, item.url].filter(Boolean).join(" | ")
      );
      return `- ${name}: severity=${finding.severity}; affected=${finding.range}; fix=${JSON.stringify(finding.fixAvailable)}; via=${via.join("; ")}`;
    });
    throw new Error(`${label}: unresolved dependency vulnerabilities detected. Remediate rather than expanding an allowlist.\n${details.join("\n")}`);
  }
  assert.equal(audit.metadata?.vulnerabilities?.total || 0, 0, `${label}: vulnerability count is not zero`);
}

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const packages = lock.packages || {};
assert.equal(packages["node_modules/next"]?.version, "15.5.28", "Next must remain on approved secure Next 15 patch");
assert.equal(packages["node_modules/postcss"]?.version, "8.5.26", "direct PostCSS security target regressed");
assert.equal(packages["node_modules/sharp"]?.version, "0.35.5", "direct Sharp security target regressed");
assert.equal(packages["node_modules/source-map-js"]?.version, "1.2.2", "source-map-js security target regressed");
assert.equal(packages["node_modules/nanoid"]?.version, "3.3.18", "nanoid security target regressed");
assert.equal(packages["node_modules/@playwright/test"]?.version, "1.62.1", "Playwright security target regressed");
assert.equal(packages["node_modules/js-yaml"]?.version, "4.3.2", "js-yaml dev transitive fix regressed");
assert.equal(packages["node_modules/browserslist"]?.version, "4.28.9", "browserslist dev transitive fix regressed");
assert.equal(packages["node_modules/baseline-browser-mapping"]?.version, "2.11.22", "baseline-browser-mapping dev transitive fix regressed");
assert.equal(packages["node_modules/tailwindcss"]?.version, "4.3.3", "Tailwind v4 security target regressed");
assert.equal(packages["node_modules/@tailwindcss/postcss"]?.version, "4.3.3", "Tailwind PostCSS adapter version regressed");
assert.equal(packages["node_modules/brace-expansion"]?.version, "1.1.21", "brace-expansion legacy-line fix regressed");
assert.equal(packages["node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion"]?.version, "5.0.12", "brace-expansion modern-line fix regressed");

// The upstream braces advisory (GHSA-vfj7-8cjw-p6xm) has no patched
// npm release as of 2026-10-13. Never silently suppress it in the full
// audit. Assert that the known affected dependency is dev-only and cannot
// enter the runtime dependency graph without failing this gate.
for (const name of ["braces", "micromatch", "fast-glob", "@next/eslint-plugin-next"]) {
  const entry = packages[`node_modules/${name}`];
  if (entry) {
    assert.equal(entry.dev, true, `${name} must remain dev-only; production exposure requires immediate remediation`);
  }
}

const runtimeAudit = runAudit(["--omit=dev"]);
assertNoVulnerabilities(runtimeAudit, "runtime audit");

const fullAudit = runAudit([]);
assertNoVulnerabilities(fullAudit, "full audit");

console.log("Dependency security gate PASS: runtime and full npm audits report zero vulnerabilities.");
