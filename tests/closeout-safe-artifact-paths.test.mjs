import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { sanitizeArtifactTree } from "../scripts/closeout/sanitize-artifacts.mjs";
import { scanSafeArtifacts } from "../scripts/closeout/scan-safe-artifacts.mjs";

test("safe artifact names do not expose cookie test titles", () => {
  const base = mkdtempSync(path.join(tmpdir(), "hamza-artifact-test-"));
  try {
    const raw = path.join(base, "raw");
    const safe = path.join(base, "safe");
    const folder = path.join(raw, "translations-en-cookie-action");
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, "error-context.md"), "Harmless diagnostic");
    assert.equal(sanitizeArtifactTree(raw, safe), 1);
    assert.equal(scanSafeArtifacts(safe), 1);
    const [sanitizedFolder] = readdirSync(safe);
    assert.match(sanitizedFolder, /^report-[a-f0-9]{16}$/);
    assert.equal(readFileSync(path.join(safe, sanitizedFolder, "error-context.md"), "utf8"), "Harmless diagnostic");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("artifact sanitizer still redacts credentials and scanner rejects raw secrets", () => {
  const base = mkdtempSync(path.join(tmpdir(), "hamza-artifact-test-"));
  try {
    const raw = path.join(base, "raw");
    const safe = path.join(base, "safe");
    mkdirSync(raw);
    writeFileSync(path.join(raw, "diagnostic.md"), "Bearer abcdefghijklmnopqrstuvwxyz");
    sanitizeArtifactTree(raw, safe);
    assert.equal(scanSafeArtifacts(safe), 1);
    assert.match(readFileSync(path.join(safe, "diagnostic.md"), "utf8"), /Bearer \[REDACTED\]/);
    assert.throws(() => scanSafeArtifacts(raw), /secret pattern/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
