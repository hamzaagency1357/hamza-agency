export const BACKUP_FORMAT = "hamza-agency-private-backup";
export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_PROJECT_REF = "fvaurkfnsvsfohpzguho";
export const BACKUP_UPLOAD_MAX_BYTES = 12_000_000;

export const BACKUP_SCOPE_ALLOWLIST = Object.freeze([
  "settings",
  "pages",
  "sections",
  "page_builder_sections",
  "content_translations",
  "programs",
  "announcements",
  "jobs",
  "reviews",
  "success_stories",
  "partners",
  "gallery_items",
  "faqs",
  "knowledge_base",
  "media",
]);

const scopeAllowlist = new Set(BACKUP_SCOPE_ALLOWLIST);
const checksumPattern = /^[a-f0-9]{64}$/;

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Accept only the canonical HAMZA AGENCY backup payload root.
 *
 * The database stores this object directly in backups.details and the Admin download
 * writes the same object to disk. This function intentionally does not accept generic
 * envelopes or arbitrary nested JSON: a future/legacy wrapper must be explicitly added
 * and tested before it can be normalized.
 */
export function normalizeBackupPayload(input) {
  if (!isRecord(input)) return null;
  if (input.format !== BACKUP_FORMAT) return null;
  if (input.schema_version !== BACKUP_SCHEMA_VERSION) return null;
  if (input.project_ref !== BACKUP_PROJECT_REF) return null;
  if (typeof input.created_at !== "string" || !input.created_at) return null;
  if (typeof input.created_by !== "string" || !input.created_by) return null;
  if (typeof input.checksum !== "string" || !checksumPattern.test(input.checksum)) return null;
  if (!Array.isArray(input.scope) || input.scope.length === 0) return null;
  if (!isRecord(input.entities)) return null;

  const scope = [];
  const seen = new Set();
  for (const value of input.scope) {
    if (typeof value !== "string" || !scopeAllowlist.has(value) || seen.has(value)) return null;
    if (!Array.isArray(input.entities[value])) return null;
    seen.add(value);
    scope.push(value);
  }

  return input;
}

export function backupScopeMatchesPayload(payload, selectedScope) {
  if (!isRecord(payload) || !Array.isArray(payload.scope)) return false;
  if (!Array.isArray(selectedScope) || selectedScope.length === 0) return false;
  const available = new Set(payload.scope);
  const selected = new Set();
  for (const value of selectedScope) {
    if (typeof value !== "string" || !scopeAllowlist.has(value) || selected.has(value) || !available.has(value)) {
      return false;
    }
    selected.add(value);
  }
  return true;
}
