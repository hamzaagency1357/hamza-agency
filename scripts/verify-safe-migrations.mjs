import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "supabase", "migrations");
const forbidden = [/\bdrop\s+table\b/i, /\btruncate\b/i, /\bdrop\s+column\b/i, /\balter\s+table\b[^;]*\brename\s+column\b/i];
const secrets = [
  /\b(?:SUPABASE_SERVICE_ROLE(?:_KEY)?|SERVICE_ROLE_KEY)\b\s*[:=]\s*['"][^'"\n]{12,}['"]/i,
  /eyJ[a-zA-Z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i,
];
const legacyPublicRpcNames = [
  "lookup_public_agency_application",
  "lookup_public_service_request",
  "pr100_lookup_public_agency_application",
  "pr100_lookup_public_agency_application_by_code",
  "pr100_lookup_public_service_request",
  "pr100_guard_password_reset",
  "pr100_guard_ai_answer",
  "pr99_guard_submission",
  "pr99_submit_application",
  "pr99_submit_service_request",
  "pr99_submit_job_application",
  "pr99_submit_contact",
  "pr99_submit_ai_support",
];
const restoredAppliedMigration = "20260729181851_pr100_final_completion.sql";

const atomicMigrationRunnerFiles = new Set([
  "20260730232500_pr101_product_expansion_foundation.sql",
  "20260730233500_pr101_product_expansion_operations.sql",
  "20260730234000_pr101_kpi_schema_guard.sql",
  "20260730234500_pr101_product_expansion_hardening.sql",
]);

export function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ");
}

export function extractPermanentDeleteFunction(sql) {
  const match = sql.match(/create\s+or\s+replace\s+function\s+public\.pr99_permanent_delete_trash\b[\s\S]*?\$\$\s*;/i);
  return match?.[0] || "";
}

export function extractSecurityRetentionFunction(sql) {
  const match = sql.match(/create\s+or\s+replace\s+function\s+public\.pr100_cleanup_security_guards\b[\s\S]*?\$\$\s*;/i);
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

export function validateSecurityRetention(sql) {
  const fn = extractSecurityRetentionFunction(sql);
  if (!fn) return ["security-retention function is missing"];
  const requiredDeletes = [
    /delete\s+from\s+public\.public_submission_guards[\s\S]*?interval\s+'90 days'/i,
    /delete\s+from\s+public\.public_lookup_guards[\s\S]*?interval\s+'90 days'/i,
    /delete\s+from\s+public\.pr100_gateway_nonces[\s\S]*?interval\s+'90 days'[\s\S]*?interval\s+'7 days'/i,
  ];
  return requiredDeletes.every((pattern) => pattern.test(fn)) ? [] : ["security-retention deletes are not bounded by the documented windows"];
}

export function validateDeploymentOrdering(file, sql) {
  const errors = [];
  if (!/pr100/i.test(file)) return errors;
  if (/post[-_]?deploy/i.test(file)) errors.push(`${file}: post-deploy SQL must not live in supabase/migrations`);
  for (const functionName of legacyPublicRpcNames) {
    const prematureRevoke = new RegExp(
      `revoke\\s+all\\s+on\\s+function\\s+public\\.${functionName}\\b[\\s\\S]*?from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`,
      "i",
    );
    if (prematureRevoke.test(sql)) errors.push(`${file}: legacy public RPC ${functionName} may be revoked only by the guarded manual post-deploy runbook`);
  }
  return errors;
}

export function validateMigrationText(file, sql) {
  const errors = [];
  const scanText = stripSqlComments(
    sql.replace(/revoke\s+truncate(?:\s*,\s*(?:trigger|references))*\s+on\s+all\s+tables\s+in\s+schema\s+public\s+from\s+anon\s*,\s*authenticated\s*;/gi, ""),
  );
  for (const pattern of forbidden) if (pattern.test(scanText)) errors.push(`${file}: forbidden destructive SQL ${pattern}`);
  for (const pattern of secrets) if (pattern.test(sql)) errors.push(`${file}: possible secret ${pattern}`);

  if (
    file !== restoredAppliedMigration &&
    !atomicMigrationRunnerFiles.has(file) &&
    (!/\bbegin\s*;/i.test(sql) || !/\bcommit\s*;/i.test(sql))
  ) errors.push(`${file}: migration should be transactional`);

  errors.push(...validateDeploymentOrdering(file, sql));

  const permanentFn = extractPermanentDeleteFunction(sql);
  const retentionFn = extractSecurityRetentionFunction(sql);
  let withoutProtectedDeletes = permanentFn ? sql.replace(permanentFn, "") : sql;
  withoutProtectedDeletes = retentionFn ? withoutProtectedDeletes.replace(retentionFn, "") : withoutProtectedDeletes;
  withoutProtectedDeletes = stripSqlComments(withoutProtectedDeletes).replace(
    /delete\s+from\s+public\.pr101_gateway_nonces\s+where\s+expires_at\s*<\s*now\(\)(?:\s*-\s*interval\s+'1 day')?\s*;/gi,
    "",
  );
  const deleteMatches = withoutProtectedDeletes.match(/\bdelete\s+from\b/gi) || [];
  const retentionDeletes = withoutProtectedDeletes.match(/delete\s+from\s+public\.version_history[\s\S]*?offset\s+30/gi) || [];
  if (deleteMatches.length > retentionDeletes.length) errors.push(`${file}: hard delete outside documented version retention or protected trash function`);
  if (/\bdelete\s+from\b/i.test(permanentFn)) {
    for (const error of validateProtectedPermanentDelete(sql)) errors.push(`${file}: ${error}`);
  }
  if (/\bdelete\s+from\b/i.test(retentionFn)) {
    for (const error of validateSecurityRetention(sql)) errors.push(`${file}: ${error}`);
  }
  if (/pr101/i.test(file) && /create\s+table\s+(?!if\s+not\s+exists)/i.test(scanText)) errors.push(`${file}: PR101 create-table statements must be additive and idempotent`);
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = (await readdir(root)).filter((name) => /pr(?:99|100|101)/i.test(name) && name.endsWith(".sql"));
  const errors = [];
  for (const file of files) {
    const sql = await readFile(path.join(root, file), "utf8");
    errors.push(...validateMigrationText(file, sql));
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Verified ${files.length} PR99/PR100/PR101 migrations: atomic or explicitly transactional, deployment-ordered, protected, additive, non-destructive, and secret-free.`);
}
