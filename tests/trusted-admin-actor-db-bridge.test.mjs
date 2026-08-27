import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260827090000_pr99_trusted_admin_actor_db_bridge.sql");
const gateway = read("supabase/functions/pr116-admin-oidc-gateway/trusted-rpc-dispatch.ts");
const edge = read("supabase/functions/pr116-admin-oidc-gateway/index.ts");
const route = read("app/api/admin/mutations/entities/route.ts");
const backupContract = read("lib/adminBackupPayloadContract.js");
const backupMigration = read("supabase/migrations/20260728210000_pr99_backup_restore_operations.sql");

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

const normalizedMigration = compact(migration);

test("trusted actor headers are consumed only behind a service_role request gate", () => {
  assert.match(migration, /v_request_role\s+<>\s+'service_role'/i);
  assert.match(migration, /current_setting\('request\.headers',\s*true\)/i);
  assert.match(migration, /raise exception 'pr116_untrusted_actor_headers'/i);
  assert.match(migration, /raise exception 'pr116_actor_context_rpc_not_allowed'/i);
  assert.ok(
    normalizedMigration.indexOf("v_request_role <> 'service_role'") <
      normalizedMigration.indexOf("select * into v_admin"),
    "service_role gate must precede trusted actor resolution",
  );
});

test("gateway-owned RPC path parsing accepts only the two explicit PostgREST path forms", () => {
  assert.match(migration, /v_path like '\/rpc\/%'/i);
  assert.match(migration, /v_path like '\/rest\/v1\/rpc\/%'/i);
  assert.match(migration, /else ''/i);
  assert.match(migration, /'pr99_backup_dry_run'/i);
});

test("service_role gateway path requires a forwarded UUID user id", () => {
  assert.match(migration, /if v_user_id_text is null then\s+raise exception 'pr116_missing_actor_user_id'/i);
  assert.match(migration, /v_user_id := v_user_id_text::uuid/i);
  assert.match(migration, /exception when invalid_text_representation then\s+raise exception 'pr116_invalid_actor_user_id'/i);
});

test("trusted actor resolution is user_id authoritative, active, and role bounded", () => {
  assert.match(migration, /where user_id = v_user_id\s+and is_active is true\s+and role in \('super_admin', 'deputy_super_admin', 'program_admin'\)/i);
  assert.doesNotMatch(migration, /user_id\s+is\s+null/i);
  assert.match(migration, /raise exception 'pr116_unverified_actor_user_id'/i);
});

test("forwarded email is corroboration only and mismatch fails closed", () => {
  assert.match(migration, /if v_email is not null and v_email <> lower\(v_admin\.email\) then\s+raise exception 'pr116_actor_email_mismatch'/i);
  assert.doesNotMatch(migration, /where[\s\S]{0,220}lower\(email\)\s*=\s*v_email[\s\S]{0,220}user_id\s+is\s+null/i);
});

test("pr99_require_admin keeps direct authenticated admin behavior but removes legacy email-only authority", () => {
  const functionBlock = migration.match(/create or replace function public\.pr99_require_admin\(\)[\s\S]*?\$pr99_admin\$;/i)?.[0] ?? "";
  assert.ok(functionBlock);
  assert.match(functionBlock, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(functionBlock, /admin_user\.user_id = v_user_id/i);
  assert.match(functionBlock, /admin_user\.is_active is true/i);
  assert.doesNotMatch(functionBlock, /auth\.jwt\(\)/i);
  assert.doesNotMatch(functionBlock, /user_id\s+is\s+null/i);
});

test("authenticated or anon spoofed actor headers cannot become authority", () => {
  assert.match(migration, /if v_request_role <> 'service_role' then[\s\S]*?if v_user_id_text is not null or v_email is not null then[\s\S]*?pr116_untrusted_actor_headers/i);
  assert.doesNotMatch(migration, /v_request_role\s+in\s*\([^)]*authenticated/i);
  assert.doesNotMatch(migration, /v_request_role\s+in\s*\([^)]*anon/i);
});

test("trusted gateway still forwards the authoritative user id and corroborating email", () => {
  assert.match(gateway, /Authorization:\s*`Bearer \$\{input\.serviceRole\}`/);
  assert.match(gateway, /"x-pr116-admin-user-id": input\.user\.id/);
  assert.match(gateway, /"x-pr116-admin-email": actorEmail/);
  assert.match(edge, /resolveUser\(supabaseUrl, anonKey, userToken\)/);
  assert.match(edge, /resolveAdmin\(supabaseUrl, serviceRole, user\)/);
});

test("hotfix preserves SECURITY DEFINER, fixed search_path, and does not change grants", () => {
  const functionDefs = migration.match(/create or replace function[\s\S]*?\$pr(?:116_actor|99_admin)\$;/gi) ?? [];
  assert.equal(functionDefs.length, 2);
  for (const definition of functionDefs) {
    assert.match(definition, /security definer/i);
    assert.match(definition, /set search_path = pg_catalog, public/i);
  }
  assert.doesNotMatch(migration, /\bgrant\b/i);
  assert.doesNotMatch(migration, /\brevoke\b/i);
  assert.doesNotMatch(migration, /insert\s+into|update\s+public\.|delete\s+from|truncate\s+/i);
});

test("migration asserts backup/support RPC ACLs remain gateway-only", () => {
  assert.match(migration, /has_function_privilege\('anon', dry_run_oid, 'EXECUTE'\)/i);
  assert.match(migration, /has_function_privilege\('authenticated', dry_run_oid, 'EXECUTE'\)/i);
  assert.match(migration, /has_function_privilege\('service_role', dry_run_oid, 'EXECUTE'\)/i);
  assert.match(migration, /has_function_privilege\('anon', support_oid, 'EXECUTE'\)/i);
  assert.match(migration, /has_function_privilege\('authenticated', support_oid, 'EXECUTE'\)/i);
  assert.match(migration, /has_function_privilege\('service_role', support_oid, 'EXECUTE'\)/i);
});

test("backup validation contract and PR134 12MB transport exception remain unchanged", () => {
  assert.match(backupContract, /BACKUP_FORMAT = "hamza-agency-private-backup"/);
  assert.match(backupContract, /BACKUP_SCHEMA_VERSION = 1/);
  assert.match(backupContract, /BACKUP_PROJECT_REF = "fvaurkfnsvsfohpzguho"/);
  assert.match(backupContract, /BACKUP_UPLOAD_MAX_BYTES = 12_000_000/);
  assert.match(edge, /BACKUP_DRY_RUN_BODY_MAX_BYTES = 12_000_000/);
  assert.match(edge, /DEFAULT_ADMIN_BODY_MAX_BYTES = 50_000/);
  assert.match(route, /normalizeBackupDryRunPayload/);
});

test("backup validator still rejects wrong scope and tampered checksum after actor resolution", () => {
  assert.match(backupMigration, /raise exception 'Backup checksum is invalid'/i);
  assert.match(backupMigration, /raise exception 'Unsupported restore scope'/i);
  assert.match(backupMigration, /public\.pr99_operations_allowlist\(\)/i);
  assert.match(backupMigration, /digest\(convert_to\(v_payload::text,'UTF8'\),'sha256'\)/i);
});

test("valid current AUTO backup shape remains represented by the canonical contract", () => {
  for (const key of ["settings", "pages", "sections", "content_translations"]) {
    assert.ok(backupContract.includes(`"${key}"`), `${key} must remain allowlisted`);
  }
  assert.match(backupContract, /backupScopeMatchesPayload/);
  assert.match(backupContract, /normalizeBackupPayload/);
});
