import fs from "node:fs";
import path from "node:path";

function fail(message) {
  throw new Error(`[closeout results] ${message}`);
}

function collectSuites(node, output = []) {
  if (!node || typeof node !== "object") return output;
  if (Array.isArray(node.suites)) {
    for (const suite of node.suites) collectSuites(suite, output);
  }
  if (Array.isArray(node.specs)) {
    for (const spec of node.specs) {
      if (!Array.isArray(spec.tests)) continue;
      for (const test of spec.tests) output.push({ spec, test });
    }
  }
  return output;
}

function assertionEvidence(test) {
  const annotations = Array.isArray(test.annotations) ? test.annotations : [];
  return annotations
    .filter((annotation) => annotation?.type === "closeout-assertions")
    .reduce((total, annotation) => {
      const count = Number.parseInt(String(annotation.description || "0"), 10);
      return total + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
}

export function validatePlaywrightResults(file, expectedSuite) {
  if (!file || !fs.existsSync(file)) fail("results.json is missing");
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`results.json is invalid: ${error.message}`);
  }

  const tests = collectSuites(parsed);
  if (tests.length === 0) fail("executed = 0");

  let executed = 0;
  let skipped = 0;
  let failed = 0;
  let flaky = 0;
  let assertions = 0;
  let assertionFree = 0;

  for (const { test } of tests) {
    const results = Array.isArray(test.results) ? test.results : [];
    const attempts = results.filter((result) => result?.status !== "skipped");
    if (attempts.length === 0) {
      skipped += 1;
      continue;
    }

    executed += 1;
    const finalStatus = attempts.at(-1)?.status || "unknown";
    if (!["passed", "expected"].includes(finalStatus)) failed += 1;
    if (test.status === "flaky" || attempts.some((attempt, index) => index < attempts.length - 1 && !["passed", "expected"].includes(attempt.status))) flaky += 1;

    const evidence = assertionEvidence(test);
    assertions += evidence;
    if (evidence === 0) assertionFree += 1;
  }

  if (executed === 0) fail("executed = 0");
  if (skipped > 0) fail(`unexpected skips = ${skipped}`);
  if (failed > 0) fail(`failed tests = ${failed}`);
  if (flaky > 0) fail(`flaky tests = ${flaky}`);
  if (assertionFree > 0) fail(`tests without assertion evidence = ${assertionFree}`);
  if (assertions === 0) fail("no assertion evidence found in executed tests");

  const summary = { expectedSuite, executed, skipped, failed, flaky, assertions, assertionFree };
  const summaryPath = path.join(path.dirname(file), "validated-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = validatePlaywrightResults(process.argv[2], process.argv[3]);
  console.log(JSON.stringify(summary));
}
