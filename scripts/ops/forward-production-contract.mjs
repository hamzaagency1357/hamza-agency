import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateProductionDeploymentEvidence } from "./vercel-production-attestation.mjs";

export const PRODUCTION_REF = "fvaurkfnsvsfohpzguho";
export const ANCHOR = Object.freeze({
  version: "20260810203000",
  name: "pr116_admin_oidc_boundary_lockdown",
});
export const BASELINE_POST_ANCHOR = Object.freeze([
  Object.freeze({ version: "20260825141930", name: "pr120_support_request_trusted_gateway_preparation" }),
  Object.freeze({ version: "20260826003518", name: "final_security_acl_lockdown" }),
]);
export const TARGET = Object.freeze({
  key: "pr99_trusted_admin_actor_db_bridge",
  version: "20260827090000",
  name: "pr99_trusted_admin_actor_db_bridge",
  filename: "20260827090000_pr99_trusted_admin_actor_db_bridge.sql",
  path: "supabase/migrations/20260827090000_pr99_trusted_admin_actor_db_bridge.sql",
  sha256: "52dc558d547d4978d60dc5e32562fc528fd867e58a88ccfba3082bb6e940db83",
  approval: "APPROVE_HAMZA_PR99_TRUSTED_ADMIN_ACTOR_DB_BRIDGE",
});
export const MODES = new Set(["forward_preflight", "forward_apply"]);

function fail(message) { throw new Error(`[forward production contract] ${message}`); }
export function sha256Text(text) { return createHash("sha256").update(text, "utf8").digest("hex"); }
export async function sha256File(path = TARGET.path) { return sha256Text(await readFile(path, "utf8")); }
function asBoolean(value) { return value === true || value === "true" || value === "t" || value === 1 || value === "1"; }
function normalizeRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.data)) return value.data;
  fail("database query output is not a recognized JSON row array");
}
export function parseCliRows(text) { return normalizeRows(JSON.parse(text)); }
export function parseFunctionList(text) {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.functions)) return parsed.functions;
  if (Array.isArray(parsed?.result)) return parsed.result;
  fail("functions list output is not a recognized JSON array");
}

export function validateInvocation({ mode, target, projectRef, expectedMainSha, actualMainSha, approval = "" }) {
  if (!MODES.has(mode)) fail(`unsupported mode: ${mode || "missing"}`);
  if (target !== TARGET.key) fail(`unauthorized target: ${target || "missing"}`);
  if (projectRef !== PRODUCTION_REF) fail(`wrong Production project ref: ${projectRef || "missing"}`);
  if (!/^[0-9a-f]{40}$/i.test(expectedMainSha || "")) fail("expected main SHA must be a full commit SHA");
  if (!/^[0-9a-f]{40}$/i.test(actualMainSha || "")) fail("actual main SHA must be a full commit SHA");
  if (expectedMainSha.toLowerCase() !== actualMainSha.toLowerCase()) fail("expected main SHA does not match checked-out main");
  if (mode === "forward_apply" && approval !== TARGET.approval) fail("target approval token mismatch");
  return true;
}
export function validateTargetHash(actualHash) {
  if (!/^[0-9a-f]{64}$/i.test(TARGET.sha256)) fail(`target SHA-256 is not locked; actual=${actualHash}`);
  if ((actualHash || "").toLowerCase() !== TARGET.sha256.toLowerCase()) fail(`target SHA-256 mismatch: expected ${TARGET.sha256}, received ${actualHash || "missing"}`);
  return true;
}
function expectedHistory(phase) {
  const baseline = [ANCHOR, ...BASELINE_POST_ANCHOR];
  if (phase === "target_preflight") return baseline;
  if (phase === "target_post_apply") return [...baseline, TARGET];
  fail(`unsupported history phase: ${phase}`);
}
export function validateHistory(rows, phase = "target_preflight") {
  const normalized = rows.map((row) => ({ version: String(row.version), name: String(row.name || "") }));
  const expected = expectedHistory(phase).map(({ version, name }) => ({ version, name }));
  if (normalized.length !== expected.length) fail(`unexpected post-anchor history length: expected ${expected.length}, received ${normalized.length}`);
  for (let index = 0; index < expected.length; index += 1) {
    const actual = normalized[index], wanted = expected[index];
    if (actual.version !== wanted.version || actual.name !== wanted.name) fail(`unexpected post-anchor migration at index ${index}: ${actual.version}/${actual.name}`);
  }
  return true;
}
export function validateAnchorEffects(row) {
  const requiredTrue = [
    "anchor_history_exact", "admin_permissions_browser_dml_denied", "admin_permissions_service_contract_ok",
    "gateway_exists", "gateway_service_execute", "sensitive_rpc_acl_ok", "trusted_actor_exists",
    "trusted_actor_security_definer", "trusted_actor_search_path_ok", "authenticator_pre_request_ok",
    "support_rpc_exists", "support_service_execute", "backup_dry_run_exists", "backup_dry_run_service_execute",
  ];
  for (const key of requiredTrue) if (!asBoolean(row?.[key])) fail(`anchor/prerequisite effect failed: ${key}`);
  for (const key of ["gateway_anon_execute", "gateway_authenticated_execute", "support_anon_execute", "support_authenticated_execute", "backup_dry_run_anon_execute", "backup_dry_run_authenticated_execute"]) {
    if (asBoolean(row?.[key])) fail(`browser execute boundary failed: ${key}`);
  }
  return true;
}
export function validateTargetEffects(row, phase = "target_preflight") {
  const keys = ["trusted_actor_user_id_authoritative", "trusted_actor_rpc_allowlist_guard", "require_admin_uid_only"];
  if (phase === "target_preflight") {
    for (const key of keys) if (asBoolean(row?.[key])) fail(`target effect is already present before migration: ${key}`);
  } else if (phase === "target_post_apply") {
    for (const key of keys) if (!asBoolean(row?.[key])) fail(`target effect is missing after apply: ${key}`);
  } else fail(`unsupported target effect phase: ${phase}`);
  return true;
}

function exactFunction(functions, name, label) {
  const matches = functions.filter((fn) => (fn.slug || fn.name) === name);
  if (matches.length !== 1) fail(`${label} identity is missing or ambiguous`);
  return matches[0];
}
export function validateGatewayControlPlane(functions) {
  const legacy = exactFunction(functions, "pr100-vercel-oidc-gateway", "Production trusted gateway control-plane");
  if (Number(legacy.version) !== 6 || String(legacy.status).toUpperCase() !== "ACTIVE") {
    fail(`unexpected trusted gateway state: version=${legacy.version} status=${legacy.status}`);
  }
  const admin = exactFunction(functions, "pr116-admin-oidc-gateway", "Production PR116 Admin gateway");
  if (!Number.isSafeInteger(Number(admin.version)) || Number(admin.version) < 1 || String(admin.status).toUpperCase() !== "ACTIVE") {
    fail(`unexpected PR116 Admin gateway state: version=${admin.version} status=${admin.status}`);
  }
  if (admin.verify_jwt !== false) fail("Production PR116 Admin gateway must use verify_jwt=false because it performs its own Vercel OIDC and user-session verification");
  return true;
}
export function validateProductionHealth(health) {
  if (health?.status !== "ok") fail("Production /api/health is not ok");
  return true;
}
export function validateTargetSql(sql) {
  const lower = sql.toLowerCase();
  const required = [
    "public.pr116_apply_trusted_admin_actor_context()", "public.pr99_require_admin()", "v_request_role <> 'service_role'",
    "pr116_actor_context_rpc_not_allowed", "pr116_missing_actor_user_id", "where user_id = v_user_id",
    "admin_user.user_id = v_user_id", "auth.uid()", "trusted_actor_hotfix_backup_acl_regression",
    "trusted_actor_hotfix_support_acl_regression",
  ];
  for (const marker of required) if (!lower.includes(marker.toLowerCase())) fail(`target SQL missing required marker: ${marker}`);
  const actor = sql.match(/create or replace function public\.pr116_apply_trusted_admin_actor_context\(\)[\s\S]*?\$pr116_actor\$;/i)?.[0] || "";
  if (!actor) fail("target SQL trusted actor bridge definition is missing");
  if (/or\s+user_id\s+is\s+null/i.test(actor)) fail("target SQL restores nullable user_id authority");
  const requireAdmin = sql.match(/create or replace function public\.pr99_require_admin\(\)[\s\S]*?\$pr99_admin\$;/i)?.[0] || "";
  if (!requireAdmin) fail("target SQL pr99_require_admin definition is missing");
  if (/auth\.jwt\(\)/i.test(requireAdmin) || /admin_user\.user_id\s+is\s+null/i.test(requireAdmin)) fail("target SQL restores legacy email-only Admin authority");
  const executableStart = sql.replace(/^(?:\s*--[^\n]*(?:\n|$))*/g, "").trimStart();
  if (/^begin\s*;/i.test(executableStart) || /\bcommit\s*;\s*$/i.test(sql)) {
    fail("target migration must rely on the Supabase CLI implicit transaction and must not contain an outer BEGIN/COMMIT wrapper");
  }
  return true;
}
export function validateDryRunOutput(text) {
  const filenames = [...String(text || "").matchAll(/\b\d{14}_[A-Za-z0-9._-]+\.sql\b/g)].map((match) => match[0]);
  if (filenames.length !== 1) fail(`dry-run must plan exactly one migration; received ${filenames.length}`);
  if (filenames[0] !== TARGET.filename) fail(`dry-run planned unauthorized migration: ${filenames[0]}`);
  return true;
}
async function loadJson(path) { return JSON.parse(await readFile(path, "utf8")); }

async function main() {
  const [command, commandArg] = process.argv.slice(2);
  if (command === "hash") { console.log(await sha256File()); return; }
  if (command === "verify-dry-run") {
    if (!commandArg) fail("dry-run output path is required");
    validateDryRunOutput(await readFile(commandArg, "utf8"));
    console.log(JSON.stringify({ ok: true, target: TARGET.filename, planned: 1 }));
    return;
  }
  if (command !== "verify-live") fail(`unsupported command: ${command || "missing"}`);
  const mode = process.env.FORWARD_MODE;
  const phase = process.env.FORWARD_PHASE || "target_preflight";
  validateInvocation({ mode, target: process.env.FORWARD_TARGET, projectRef: process.env.FORWARD_PROJECT_REF, expectedMainSha: process.env.FORWARD_EXPECTED_MAIN_SHA, actualMainSha: process.env.FORWARD_ACTUAL_MAIN_SHA, approval: process.env.FORWARD_APPROVAL || "" });
  validateTargetHash(await sha256File());
  validateTargetSql(await readFile(TARGET.path, "utf8"));
  const historyRows = parseCliRows(await readFile(process.env.FORWARD_HISTORY_JSON, "utf8"));
  const effectsRows = parseCliRows(await readFile(process.env.FORWARD_EFFECTS_JSON, "utf8"));
  const functions = parseFunctionList(await readFile(process.env.FORWARD_FUNCTIONS_JSON, "utf8"));
  const vercel = await loadJson(process.env.FORWARD_VERCEL_JSON);
  const health = await loadJson(process.env.FORWARD_HEALTH_JSON);
  if (effectsRows.length !== 1) fail("expected exactly one effects row");
  validateHistory(historyRows, phase);
  validateAnchorEffects(effectsRows[0]);
  validateTargetEffects(effectsRows[0], phase);
  validateGatewayControlPlane(functions);
  validateProductionDeploymentEvidence(vercel, process.env.FORWARD_EXPECTED_MAIN_SHA);
  validateProductionHealth(health);
  console.log(JSON.stringify({ ok: true, mode, phase, target: TARGET.key, anchor: ANCHOR.version }));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exit(1); });
