import fs from "node:fs";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([".json", ".txt", ".log", ".html", ".xml", ".har", ".md"]);
const SECRET_PATTERNS = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]"],
  [/(authorization["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, "$1[REDACTED]"],
  [/(access_token|refresh_token|id_token|service_role|anon_key|supabase_key|cookie|set-cookie|recovery_code|mfa_secret)(["']?\s*[:=]\s*["']?)[^"'\n,}]+/gi, "$1$2[REDACTED]"],
  [/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[REDACTED_SUPABASE_KEY]"],
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]"],
];

export function sanitizeText(value) {
  return SECRET_PATTERNS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const roots = process.argv.slice(2);
if (!roots.length) throw new Error("Provide at least one artifact directory");
for (const root of roots) {
  for (const file of walk(root)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const source = fs.readFileSync(file, "utf8");
    const sanitized = sanitizeText(source);
    if (sanitized !== source) fs.writeFileSync(file, sanitized);
  }
}
console.log(`Sanitized ${roots.length} artifact root(s).`);
