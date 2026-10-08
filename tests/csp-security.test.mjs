import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const config = fs.readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

test("production CSP blocks JavaScript eval while retaining critical restrictions", () => {
  assert.match(config, /script-src 'self'/);
  assert.doesNotMatch(config, /unsafe-eval/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /base-uri 'self'/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Strict-Transport-Security/);
});
