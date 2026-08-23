import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const PRODUCTION_REF = "fvaurkfnsvsfohpzguho";
export const ANCHOR = Object.freeze({
  version: "20260810203000",
  name: "pr116_admin_oidc_boundary_lockdown",
});
export const PREPARATION = Object.freeze({
  key: "pr120_support_gateway_preparation",
  version: "20260823084000",
  name: "pr100_support_request_trusted_gateway_preparation",
  path: "supabase/migrations/20260823084000_pr100_support_request_trusted_gateway_preparation.sql",
  sha256: "778ef1eef0cf61d3ab4092d711c005a8a6031b6002e491519878627498f40b95",
  approval: "APPROVE_HAMZA_PR120_SUPPORT_GATEWAY_PREPARATION",
});
export const MODES = new Set(["forward_preflight", "forward_apply"]);

function fail(message) {
  throw new Error(`[forward production contract] ${message}`);
}

export function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export async function sha256File(path = PREPARATION.path) {
  return sha256Text(await readFile(path, "utf8"));
}

function asBoolean(value) {
  return value === true || value === "true" || value === "t" || value === 1 || value === "1";
}

function normalizeRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.data)) return value.data;
  fail("database query output is not a recognized JSON row array");
}

export function parseCliRows(text) {
  const parsed = JSON.parse(text);
  return normalizeRows(parsed);
}

export function parseFunctionList(text) {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.functions)) return parsed.functions;
  if (Array.isArray(parsed?.result)) return parsed.result;
  fail("functions list output is not a recognized JSON array");
}

export function validateInvocation({ mode, target, projectRef, expectedMainSha, actualMainSha, approval = "" }) {
  if (!MODES.has(mode)) fail(`unsupported mode: ${mode || "missing"}`);
  if (target !== PREPARATION.key) fail(`unauthorized target: ${target || "missing"}`);
  if (projectRef !== PRODUCTION_REF) fail(`wrong Production project ref: ${projectRef || "missing"}`);
  if (!/^[0-9a-f]{40}$/i.test(expectedMainSha || "")) fail("expected main SHA must be a full commit SHA");
  if (!/^[0-9a-f]{40}$/i.test(actualMainSha || "")) fail("actual main SHA must be a full commit SHA");
  if (expectedMainSha.toLowerCase() !== actualMainSha.toLowerCase()) fail("expected main SHA does not match checked-out main");
  if (mode === "forward_apply" && approval !== PREPARATION.approval) fail("Preparation approval token mismatch");
  return true;
}

export function validatePreparationHash(actualHash) {
  if (!/^[0-9a-f]{64}$/i.test(PREPARATION.sha256)) {
    fail(`Preparation SHA-256 is not locked; actual=${actualHash}`);
  }
  if ((actualHash || "").toLowerCase() !== PREPARATION.sha256.toLowerCase()) {
    fail(`Preparation SHA-256 mismatch: expected ${PREPARATION.sha256}, received ${actualHash || "missing"}`);
  }
  return true;
}

export function validateHistory(rows, phase = "preparation_preflight") {
  const normalized = rows.map((row) => ({ version: String(row.version), name: String(row.name || "") }));
  const anchorRows = normalized.filter((row) => row.version === ANCHOR.version);
  if (anchorRows.length !== 1 || anchorRows[0].name !== ANCHOR.name) fail("verified PR116 anchor identity is missing or changed");

  const postAnchor = normalized.filter((row) => row.version > ANCHOR.version);
  const prepRows = postAnchor.filter((row) => row.version === PREPARATION.version && row.name === PREPARATION.name);
  const unknown = postAnchor.filter((row) => !(row.version === PREPARATION.version && row.name === PREPARATION.name));
  if (unknown.length) fail(`unexpected post-anchor migration: ${unknown.map((row) => `${row.version}/${row.name}`).join(", ")}`);

  if (phase === "preparation_preflight") {
    if (prepRows.length) fail("Preparation target is already applied");
    if (postAnchor.length !== 0) fail("post-anchor history must be empty before Preparation");
  } else if (phase === "preparation_post_apply") {
    if (prepRows.length !== 1 || postAnchor.length !== 1) fail("Preparation is not the exact sole post-anchor migration");
  } else {
    fail(`unsupported history phase: ${phase}`);
  }
  return true;
}

export function validateAnchorEffects(row) {
  const requiredTrue = [
    "anchor_history_exact",
    "admin_permissions_browser_dml_denied",
    "admin_permissions_service_contract_ok",
    "gateway_exists",
    "gateway_service_execute",
    "sensitive_rpc_acl_ok",
    "trusted_actor_exists",
    "trusted_actor_security_definer",
    "trusted_actor_search_path_ok",
    "authenticator_pre_request_ok",
    "support_rpc_exists",
  ];
  for (const key of requiredTrue) if (!asBoolean(row?.[key])) fail(`anchor/prerequisite effect failed: ${key}`);
  if (asBoolean(row?.gateway_anon_execute) || asBoolean(row?.gateway_authenticated_execute)) fail("trusted DB gateway is browser-executable");
  return true;
}

export function validatePreparationPrerequisites(row, phase = "preparation_preflight") {
  if (!asBoolean(row?.support_anon_execute) || !asBoolean(row?.support_authenticated_execute)) {
    fail("legacy Support ACL compatibility is not present");
  }
  if (phase === "preparation_preflight") {
    if (asBoolean(row?.support_service_execute)) fail("unexpected pre-Preparation service_role Support RPC execute privilege");
    if (asBoolean(row?.gateway_has_support_request_create)) fail("support_request_create is already present before Preparation");
  } else if (phase === "preparation_post_apply") {
    if (!asBoolean(row?.gateway_has_support_request_create)) fail("Preparation did not add support_request_create to the trusted gateway");
  } else {
    fail(`unsupported prerequisite phase: ${phase}`);
  }
  return true;
}

export function validateGatewayControlPlane(functions) {
  const matches = functions.filter((fn) => (fn.slug || fn.name) === "pr100-vercel-oidc-gateway");
  if (matches.length !== 1) fail("Production trusted gateway control-plane identity is missing or ambiguous");
  const gateway = matches[0];
  if (Number(gateway.version) !== 6 || String(gateway.status).toUpperCase() !== "ACTIVE") {
    fail(`unexpected trusted gateway state: version=${gateway.version} status=${gateway.status}`);
  }
  return true;
}

export function validateProductionHealth(health, expectedProductionSha) {
  if (!/^[0-9a-f]{40}$/i.test(expectedProductionSha || "")) fail("expected Production application SHA must be a full commit SHA");
  if (health?.status !== "ok") fail("Production /api/health is not ok");
  if (String(health?.commitSha || "").toLowerCase() !== expectedProductionSha.toLowerCase()) fail("Production application SHA mismatch");
  return true;
}

export function validatePreparationSql(sql) {
  const lower = sql.toLowerCase();
  const required = [
    "support_request_create",
    "public.pr100_guard_ai_answer",
    "public.pr4_create_support_request",
    "pr_a_preparation_old_support_acl_not_preserved",
    "pr_a_preparation_gateway_acl_invalid",
  ];
  for (const marker of required) if (!lower.includes(marker.toLowerCase())) fail(`Preparation SQL missing required marker: ${marker}`);
  const forbiddenSupportAcl = /(?:revoke|grant)\s+[^;]*on\s+function\s+public\.pr4_create_support_request\b/i;
  if (forbiddenSupportAcl.test(sql)) fail("Preparation migration must not change direct Support RPC ACL");
  if (!/\bbegin\s*;/i.test(sql) || !/\bcommit\s*;/i.test(sql)) fail("Preparation migration must remain transactional");
  return true;
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const [command] = process.argv.slice(2);
  if (command === "hash") {
    console.log(await sha256File());
    return;
  }
  if (command !== "verify-live") fail(`unsupported command: ${command || "missing"}`);

  const mode = process.env.FORWARD_MODE;
  const phase = process.env.FORWARD_PHASE || "preparation_preflight";
  validateInvocation({
    mode,
    target: process.env.FORWARD_TARGET,
    projectRef: process.env.FORWARD_PROJECT_REF,
    expectedMainSha: process.env.FORWARD_EXPECTED_MAIN_SHA,
    actualMainSha: process.env.FORWARD_ACTUAL_MAIN_SHA,
    approval: process.env.FORWARD_APPROVAL || "",
  });
  const actualHash = await sha256File();
  validatePreparationHash(actualHash);
  validatePreparationSql(await readFile(PREPARATION.path, "utf8"));

  const historyRows = parseCliRows(await readFile(process.env.FORWARD_HISTORY_JSON, "utf8"));
  const effectsRows = parseCliRows(await readFile(process.env.FORWARD_EFFECTS_JSON, "utf8"));
  const functions = parseFunctionList(await readFile(process.env.FORWARD_FUNCTIONS_JSON, "utf8"));
  const health = await loadJson(process.env.FORWARD_HEALTH_JSON);
  if (effectsRows.length !== 1) fail("expected exactly one effects row");

  validateHistory(historyRows, phase);
  validateAnchorEffects(effectsRows[0]);
  validatePreparationPrerequisites(effectsRows[0], phase);
  validateGatewayControlPlane(functions);
  validateProductionHealth(health, process.env.FORWARD_EXPECTED_PRODUCTION_SHA);
  console.log(JSON.stringify({ ok: true, mode, phase, target: PREPARATION.key, anchor: ANCHOR.version }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
