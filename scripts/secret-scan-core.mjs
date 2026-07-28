import path from "node:path";

const ALLOWED_ENV_SUFFIXES = new Set(["example", "template", "sample"]);
const DOCUMENTATION_PATH = /^(?:docs\/|README(?:\.|$))/i;
const NON_RUNTIME_REFERENCE_PATH = /^(?:docs\/|tests\/|scripts\/|\.github\/workflows\/)/i;

export function isCommittedRuntimeEnvFile(relativePath) {
  const base = path.basename(relativePath).toLowerCase();
  if (base === ".env") return true;
  if (!base.startsWith(".env.")) return false;
  return !ALLOWED_ENV_SUFFIXES.has(base.slice(5));
}

function isPlaceholder(value) {
  const normalized = value.trim().replace(/^['"`]|['"`]$/g, "");
  return (
    !normalized ||
    /^\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}$/i.test(normalized) ||
    /^\$\{?[A-Z0-9_]+\}?$/i.test(normalized) ||
    /^(?:<[^>]+>|\*{3,}|x{6,})$/i.test(normalized) ||
    /^(?:YOUR|REPLACE|EXAMPLE|SAMPLE|TEST|FAKE|DUMMY|PLACEHOLDER)(?:[_-][A-Z0-9]+)+$/i.test(normalized)
  );
}

function hasConcreteServiceRoleAssignment(text) {
  const assignment = /\b(?:SUPABASE_SERVICE_ROLE(?:_KEY)?|SERVICE_ROLE_KEY)\b\s*[:=]\s*([^\n,]+)/gi;
  for (const match of text.matchAll(assignment)) {
    if (!isPlaceholder(match[1] || "")) return true;
  }
  return false;
}

function hasJwtLikeValue(text) {
  return /(?:^|[\s='"`:(,])eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?=$|[\s'"`),;])/m.test(text);
}

function hasClientSecretViolation(relativePath, text) {
  if (NON_RUNTIME_REFERENCE_PATH.test(relativePath)) return false;
  if (!/^\s*["']use client["'];?/m.test(text)) return false;
  if (/process\.env\.(?!NEXT_PUBLIC_)[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE|TOKEN|PASSWORD|DATABASE_URL)/.test(text)) return true;
  if (/process\.env\.NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE|PASSWORD)/.test(text)) return true;
  return /import\s+[^;]+\s+from\s+["'][^"']*(?:service[-_]?role|server[-_]?secret|admin[-_]?supabase|supabase[-_]?admin)[^"']*["']/.test(text);
}

export function scanText(relativePath, text) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  const errors = [];

  if (isCommittedRuntimeEnvFile(normalizedPath)) errors.push(`${normalizedPath}: runtime env file must not be committed`);
  if (hasJwtLikeValue(text)) errors.push(`${normalizedPath}: JWT-like secret value detected`);
  if (hasConcreteServiceRoleAssignment(text)) errors.push(`${normalizedPath}: concrete service-role secret assignment detected`);

  if (!NON_RUNTIME_REFERENCE_PATH.test(normalizedPath) && /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE|PASSWORD)\b/.test(text)) {
    errors.push(`${normalizedPath}: privileged secret must never use NEXT_PUBLIC`);
  }

  if (hasClientSecretViolation(normalizedPath, text)) errors.push(`${normalizedPath}: client module references or imports a server-only secret`);
  if (DOCUMENTATION_PATH.test(normalizedPath)) return errors.filter((error) => error.includes("JWT-like") || error.includes("concrete service-role"));
  return errors;
}
