import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const SCAN_ROOTS = ["app/admin", "components/admin"];
const SHARED_ADMIN_ROOT = "components";
const EXTRA_FILES = ["lib/adminAccess.ts", "lib/adminActivityLogger.ts", "lib/adminTrash.ts"];
const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

// Only RPCs proven to be read-only may execute directly in Admin browser code.
// Keep this name-level allowlist narrow; state-changing RPCs must use the server boundary.
const READONLY_BROWSER_RPCS = new Map([
  ["app/admin/requests/page.tsx", new Set(["pr100_admin_requests_index"])],
  ["app/admin/system-health/page.tsx", new Set(["pr99_backup_schedule_status"])],
]);

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

function rpcViolations(file, text) {
  const allowed = READONLY_BROWSER_RPCS.get(file) || new Set();
  const names = [...text.matchAll(/\.rpc\s*\(\s*["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
  const violations = names.filter((name) => !allowed.has(name)).map((name) => `${file}: stateful/unclassified RPC ${name}`);
  if (/\.rpc\s*\(\s*(?!["'`])/.test(text)) violations.push(`${file}: dynamic/unclassified RPC`);
  return violations;
}

function findings(file, source) {
  const text = compact(source);
  const hits = [];
  const rules = [
    ["database DML", /\.from\s*\([^)]*\)[\s\S]{0,800}?\.(?:insert|update|upsert|delete)\s*\(/g],
    ["Storage mutation", /\.storage[\s\S]{0,500}?\.(?:upload|update|remove|move|copy)\s*\(/g],
    ["Auth mutation", /\.auth\.(?:updateUser|signUp|resetPasswordForEmail)\s*\(/g],
    ["Admin auth mutation", /\.auth\.admin\.[A-Za-z0-9_]+\s*\(/g],
  ];
  for (const [label, pattern] of rules) {
    if (pattern.test(text)) hits.push(`${file}: ${label}`);
  }
  hits.push(...rpcViolations(file, text));
  return hits;
}

test("Admin browser code contains no direct state-changing Supabase path", () => {
  const sharedAdminFiles = walk(SHARED_ADMIN_ROOT).filter((file) => { const source = fs.readFileSync(path.join(ROOT, file), "utf8"); return /^Admin[A-Z0-9_].*\.(?:js|jsx|ts|tsx)$/.test(path.basename(file)) || source.includes("requireAdminModuleAccess(") || source.includes("@/lib/adminAccess"); });
  const files = [...new Set([...SCAN_ROOTS.flatMap(walk), ...sharedAdminFiles, ...EXTRA_FILES.filter((file) => fs.existsSync(path.join(ROOT, file)))])];
  const violations = files.flatMap((file) => findings(file, fs.readFileSync(path.join(ROOT, file), "utf8")));
  assert.deepEqual(violations, [], `Browser-side Admin mutations must use typed server boundaries:\n${violations.join("\n")}`);
});
