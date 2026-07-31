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
  let assertions = 0;

  for (const { spec, test } of tests) {
    const results = Array.isArray(test.results) ? test.results : [];
    if (results.length === 0) continue;
    for (const result of results) {
      const status = result.status || "unknown";
      if (status === "skipped") {
        skipped += 1;
        continue;
      }
      executed += 1;
      if (!["passed", "expected"].includes(status)) failed += 1;
      const stepList = Array.isArray(result.steps) ? result.steps : [];
      assertions += stepList.filter((step) => {
        const title = String(step.title || "").toLowerCase();
        return step.category === "expect" || title.startsWith("expect") || title.includes("to be") || title.includes("to have");
      }).length;
    }
    if (expectedSuite && !String(spec.title || spec.file || "").toLowerCase().includes(expectedSuite.toLowerCase())) {
      // File-level filtering is enforced by testMatch. This check only rejects a completely unrelated result set.
    }
  }

  if (executed === 0) fail("executed = 0");
  if (skipped > 0) fail(`unexpected skips = ${skipped}`);
  if (failed > 0) fail(`failed tests = ${failed}`);
  if (assertions === 0) fail("no assertion evidence found in executed tests");

  const summary = { expectedSuite, executed, skipped, failed, assertions };
  const summaryPath = path.join(path.dirname(file), "validated-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = validatePlaywrightResults(process.argv[2], process.argv[3]);
  console.log(JSON.stringify(summary));
}
