import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "supabase", "migrations");
const forbidden = [/\bdrop\s+table\b/i, /\btruncate\b/i, /\bdrop\s+column\b/i, /\balter\s+table\b[^;]*\brename\s+column\b/i];
const secrets = [/service[_-]?role/i, /eyJ[a-zA-Z0-9_-]{20,}/, /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i];

export function extractPermanentDeleteFunction(sql) {
  const match = sql.match(/create\s+or\s+replace\s+function\s+public\.pr99_permanent_delete_trash\b[\s\S]*?\$\$\s*;/i);
  return match?.[0] || "";
}

export function validateProtectedPermanentDelete(sql) {
  const fn = extractPermanentDeleteFunction(sql);
  const errors = [];
  if (!fn) return ["protected permanent-delete function is missing"];
  const requirements = [
    [/public\.pr99_require_admin\s*\(/i, "pr99_require_admin"],
    [/v_role\s+not\s+in\s*\(\s*'super_admin'\s*,\s*'deputy_super_admin'\s*\)/i, "role restriction"],
    [/v_item\.item_type\s*=\s*any\s*\(\s*public\.pr99_operations_allowlist\s*\(\s*\)\s*\)/i, "operations allowlist"],
    [/restore_status\s*=\s*'restorable'/i, "restorable status"],
    [/for\s+update/i, "FOR UPDATE"],
    [/p_confirmation\s*<>\s*'DELETE PERMANENTLY'/i, "exact second confirmation"],
    [/format\s*\(\s*'delete\s+from\s+public\.%I\s+where\s+id::text=\$1'/i, "escaped dynamic identifier"],
    [/insert\s+into\s+public\.activity_logs/i, "activity log"],
  ];
  for (const [pattern, label] of requirements) if (!pattern.test(fn)) errors.push(`protected permanent delete lacks ${label}`);
  return errors;
}

export function validateMigrationText(file, sql) {
  const errors = [];
  for (const pattern of forbidden) if (pattern.test(sql)) errors.push(`${file}: forbidden destructive SQL ${pattern}`);
  for (const pattern of secrets) if (pattern.test(sql)) errors.push(`${file}: possible secret ${pattern}`);
  if (!/\bbegin\s*;/i.test(sql) || !/\bcommit\s*;/i.test(sql)) errors.push(`${file}: migration should be transactional`);

  const permanentFn = extractPermanentDeleteFunction(sql);
  const withoutPermanentFn = permanentFn ? sql.replace(permanentFn, "") : sql;
  const deleteMatches = withoutPermanentFn.match(/\bdelete\s+from\b/gi) || [];
  const retentionDeletes = withoutPermanentFn.match(/delete\s+from\s+public\.version_history[\s\S]*?offset\s+30/gi) || [];
  if (deleteMatches.length > retentionDeletes.length) errors.push(`${file}: hard delete outside documented version retention or protected trash function`);

  if (/\bdelete\s+from\b/i.test(permanentFn)) {
    for (const error of validateProtectedPermanentDelete(sql)) errors.push(`${file}: ${error}`);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = (await readdir(root)).filter((name) => /pr(?:99|100)/i.test(name) && name.endsWith(".sql"));
  const errors = [];
  for (const file of files) {
    const sql = await readFile(path.join(root, file), "utf8");
    errors.push(...validateMigrationText(file, sql));
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Verified ${files.length} PR99/PR100 migrations: transactional, protected, non-destructive, and secret-free.`);
}
