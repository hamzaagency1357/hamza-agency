import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const SCAN_ROOTS = ["app/admin", "components/admin"];
const EXTRA_FILES = ["lib/adminAccess.ts", "lib/adminActivityLogger.ts"];
const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

// Explicit exceptions must be narrow, public/user-facing gateways only. Admin
// browser mutations are intentionally not allowlisted here.
const ALLOWLIST = new Set([]);

function walk(relative) {
  const absolute = path.join(ROOT, relative);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [relative];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relative, entry.name);
    return entry.isDirectory() ? walk(next) : EXTENSIONS.has(path.extname(entry.name)) ? [next] : [];
  });
}

function compact(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function findings(file, source) {
  const text = compact(source);
  const hits = [];
  const rules = [
    ["database DML", /\.from\s*\([^)]*\)[\s\S]{0,800}?\.(?:insert|update|upsert|delete)\s*\(/g],
    ["RPC", /\.rpc\s*\(/g],
    ["Storage mutation", /\.storage[\s\S]{0,500}?\.(?:upload|update|remove|move|copy)\s*\(/g],
    ["Auth mutation", /\.auth\.(?:updateUser|signUp|resetPasswordForEmail)\s*\(/g],
    ["Admin auth mutation", /\.auth\.admin\.[A-Za-z0-9_]+\s*\(/g],
  ];
  for (const [label, pattern] of rules) {
    if (pattern.test(text)) hits.push(`${file}: ${label}`);
  }
  return hits;
}

test("Admin browser code contains no direct state-changing Supabase path", () => {
  const files = [...new Set([...SCAN_ROOTS.flatMap(walk), ...EXTRA_FILES.filter((file) => fs.existsSync(path.join(ROOT, file)))])]
    .filter((file) => !ALLOWLIST.has(file));
  const violations = files.flatMap((file) => findings(file, fs.readFileSync(path.join(ROOT, file), "utf8")));
  assert.deepEqual(violations, [], `Browser-side Admin mutations must use typed server boundaries:\n${violations.join("\n")}`);
});
