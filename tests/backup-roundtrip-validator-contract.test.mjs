import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BACKUP_FORMAT,
  BACKUP_PROJECT_REF,
  BACKUP_SCHEMA_VERSION,
  BACKUP_UPLOAD_MAX_BYTES,
  backupScopeMatchesPayload,
  normalizeBackupPayload,
} from "../lib/adminBackupPayloadContract.js";

const ROOT = process.cwd();
const VALID_CHECKSUM = "a".repeat(64);

function canonicalPayload(overrides = {}) {
  return {
    format: BACKUP_FORMAT,
    schema_version: BACKUP_SCHEMA_VERSION,
    project_ref: BACKUP_PROJECT_REF,
    created_at: "2026-08-23T02:17:00.000Z",
    created_by: "system",
    scope: ["settings", "pages", "sections", "content_translations"],
    entities: {
      settings: [{ id: 1, setting_key: "site_name", setting_value: "HAMZA AGENCY" }],
      pages: [{ id: 1, slug: "/" }],
      sections: [{ id: 1, page_id: 1 }],
      content_translations: [{ id: 1, language: "ar" }],
    },
    checksum: VALID_CHECKSUM,
    ...overrides,
  };
}

test("canonical stored payload is accepted without changing object identity or checksum", () => {
  const payload = canonicalPayload();
  const normalized = normalizeBackupPayload(payload);
  assert.equal(normalized, payload);
  assert.equal(normalized.checksum, VALID_CHECKSUM);
});

test("download JSON -> parse -> normalize round-trip preserves the canonical payload", () => {
  const payload = canonicalPayload();
  const downloaded = JSON.stringify(payload, null, 2);
  const uploaded = JSON.parse(downloaded);
  const normalized = normalizeBackupPayload(uploaded);
  assert.deepEqual(normalized, payload);
  assert.equal(normalized.checksum, payload.checksum);
});

test("wrong project_ref and unsupported schema_version fail closed", () => {
  assert.equal(normalizeBackupPayload(canonicalPayload({ project_ref: "wrong-project" })), null);
  assert.equal(normalizeBackupPayload(canonicalPayload({ schema_version: 2 })), null);
});

test("malformed or arbitrary wrapper shapes fail closed", () => {
  const payload = canonicalPayload();
  assert.equal(normalizeBackupPayload({ details: payload }), null);
  assert.equal(normalizeBackupPayload({ backup: payload }), null);
  assert.equal(normalizeBackupPayload({ payload }), null);
  assert.equal(normalizeBackupPayload([]), null);
  assert.equal(normalizeBackupPayload(null), null);
});

test("missing required metadata and malformed entity contract fail closed", () => {
  const missingChecksum = canonicalPayload();
  delete missingChecksum.checksum;
  assert.equal(normalizeBackupPayload(missingChecksum), null);

  const missingCreatedBy = canonicalPayload();
  delete missingCreatedBy.created_by;
  assert.equal(normalizeBackupPayload(missingCreatedBy), null);

  const invalidEntities = canonicalPayload({ entities: { settings: {} } });
  assert.equal(normalizeBackupPayload(invalidEntities), null);
});

test("selected scope must be present in the backup payload", () => {
  const payload = normalizeBackupPayload(canonicalPayload());
  assert.ok(payload);
  assert.equal(backupScopeMatchesPayload(payload, ["settings", "pages"]), true);
  assert.equal(backupScopeMatchesPayload(payload, ["programs"]), false);
  assert.equal(backupScopeMatchesPayload(payload, ["settings", "settings"]), false);
  assert.equal(backupScopeMatchesPayload(payload, []), false);
});

test("gateway keeps the 50KB default and raises transport only for backup dry-run", () => {
  const source = fs.readFileSync(path.join(ROOT, "supabase/functions/pr116-admin-oidc-gateway/index.ts"), "utf8");
  assert.match(source, /const DEFAULT_ADMIN_BODY_MAX_BYTES = 50_000;/);
  assert.match(source, /const BACKUP_DRY_RUN_BODY_MAX_BYTES = 12_000_000;/);
  assert.match(source, /action === "pr116_admin_backup_dry_run" \? BACKUP_DRY_RUN_BODY_MAX_BYTES : DEFAULT_ADMIN_BODY_MAX_BYTES/);
  assert.match(source, /encoder\.encode\(body\)\.byteLength > maxBodyBytes\(action\)/);
  assert.equal(BACKUP_UPLOAD_MAX_BYTES, 12_000_000);
  assert.ok(BACKUP_UPLOAD_MAX_BYTES > 140_828, "Known AUTO-20260823-021700 payload must fit the dry-run transport contract");
});

test("server boundary canonicalizes dry-run input and rejects scope mismatch before gateway dispatch", () => {
  const source = fs.readFileSync(path.join(ROOT, "app/api/admin/mutations/entities/route.ts"), "utf8");
  assert.match(source, /normalizeBackupPayload\(payload\.args\.p_backup\)/);
  assert.match(source, /backupScopeMatchesPayload\(backup, scope\)/);
  assert.match(source, /action !== "pr116_admin_backup_dry_run"/);
});

test("database validator still enforces identity, schema and checksum over canonical payload", () => {
  const source = fs.readFileSync(path.join(ROOT, "supabase/migrations/20260728210000_pr99_backup_restore_operations.sql"), "utf8");
  assert.match(source, /p_backup->>'format'<>'hamza-agency-private-backup'/);
  assert.match(source, /p_backup->>'project_ref'<>'fvaurkfnsvsfohpzguho'/);
  assert.match(source, /coalesce\(\(p_backup->>'schema_version'\)::integer,0\)<>1/);
  assert.match(source, /v_payload jsonb:=p_backup-'checksum'/);
  assert.match(source, /v_expected text:=coalesce\(p_backup->>'checksum',''\)/);
  assert.match(source, /v_expected='' or v_expected<>v_actual then raise exception 'Backup checksum is invalid'/);
});

test("tampering is not normalized away and remains subject to the original checksum", () => {
  const payload = canonicalPayload();
  const tampered = structuredClone(payload);
  tampered.entities.pages[0].slug = "/tampered";
  const normalized = normalizeBackupPayload(tampered);
  assert.ok(normalized);
  assert.equal(normalized.checksum, VALID_CHECKSUM, "normalization must never rewrite or regenerate integrity metadata");
  assert.notDeepEqual(normalized.entities, payload.entities);
});
