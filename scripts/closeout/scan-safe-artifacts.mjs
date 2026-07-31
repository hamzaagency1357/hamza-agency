import fs from "node:fs";
import path from "node:path";

const FORBIDDEN_NAMES = [/\.har$/i, /trace/i, /storage-state/i, /session/i, /cookie/i, /token/i];
const SECRET_PATTERNS = [
  /\bBearer\s+(?!\[REDACTED\])(?:[A-Za-z0-9._~+/=-]+)/i,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /sb_(?:publishable|secret)_[A-Za-z0-9_-]+/,
  /(?:access_token|refresh_token|service_role|mfa_secret|recovery_code)["']?\s*[:=]\s*["']?(?!\[REDACTED\])[^"'\s,}]+/i,
  /authorization["']?\s*[:=]\s*["']?(?!Bearer\s+\[REDACTED\]|\[REDACTED\])[^"'\n,}]+/i,
];

function walk(root) {
  if (!fs.existsSync(root)) throw new Error(`Safe artifact directory missing: ${root}`);
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

export function scanSafeArtifacts(root) {
  const files = walk(root);
  if (files.length === 0) throw new Error("Safe artifact directory is empty");
  const violations = [];
  for (const file of files) {
    const relative = path.relative(root, file);
    if (FORBIDDEN_NAMES.some((pattern) => pattern.test(relative))) {
      violations.push(`${relative}: forbidden artifact name`);
      continue;
    }
    const extension = path.extname(file).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) violations.push(`${relative}: secret pattern ${pattern}`);
    }
  }
  if (violations.length) throw new Error(`Safe artifact scan failed:\n${violations.join("\n")}`);
  return files.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const count = scanSafeArtifacts(process.argv[2]);
  console.log(`Safe artifact scan passed for ${count} file(s).`);
}
