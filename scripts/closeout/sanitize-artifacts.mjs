import fs from "node:fs";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([".json", ".txt", ".log", ".html", ".xml", ".md", ".css", ".js"]);
const FORBIDDEN_EXTENSIONS = new Set([".har", ".zip", ".trace", ".webm", ".mp4", ".bin"]);
const SECRET_PATTERNS = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]"],
  [/(authorization["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, "$1[REDACTED]"],
  [/(access_token|refresh_token|id_token|service_role|anon_key|supabase_key|cookie|set-cookie|recovery_code|mfa_secret)(["']?\s*[:=]\s*["']?)[^"'\n,}]+/gi, "$1$2[REDACTED]"],
  [/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[REDACTED_SUPABASE_KEY]"],
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]"],
  [/(postgres(?:ql)?:\/\/)[^\s"']+/gi, "$1[REDACTED]"],
];

export function sanitizeText(value) {
  return SECRET_PATTERNS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function walk(root) {
  if (!fs.existsSync(root)) throw new Error(`Artifact source is missing: ${root}`);
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

export function sanitizeArtifactTree(sourceRoot, safeRoot) {
  fs.mkdirSync(safeRoot, { recursive: true });
  let copied = 0;
  for (const file of walk(sourceRoot)) {
    const relative = path.relative(sourceRoot, file);
    const extension = path.extname(file).toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      throw new Error(`Forbidden raw artifact type detected: ${relative}`);
    }
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    const source = fs.readFileSync(file, "utf8");
    const sanitized = sanitizeText(source);
    const destination = path.join(safeRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, sanitized);
    copied += 1;
  }
  if (copied === 0) throw new Error("No sanitizable report files were produced");
  return copied;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [sourceRoot, safeRoot] = process.argv.slice(2);
  if (!sourceRoot || !safeRoot) throw new Error("Usage: sanitize-artifacts.mjs <raw-root> <safe-root>");
  const copied = sanitizeArtifactTree(sourceRoot, safeRoot);
  console.log(`Sanitized and copied ${copied} report file(s).`);
}
