import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { BACKUP_UPLOAD_MAX_BYTES } from "../lib/adminBackupPayloadContract.js";

const ROOT = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("admin gateway reads a fresh request-scoped Vercel OIDC token", () => {
  const gateway = read("lib/server/pr116AdminOidcGateway.ts");
  const requestContext = read("lib/server/vercelOidcRequestContext.ts");

  assert.match(gateway, /getRequestScopedVercelOidcToken\(\)/);
  assert.doesNotMatch(gateway, /process\.env\.VERCEL_OIDC_TOKEN/);
  assert.match(requestContext, /Symbol\.for\("@vercel\/request-context"\)/);
  assert.match(requestContext, /x-vercel-oidc-token/);
  assert.doesNotMatch(requestContext, /process\.env\.VERCEL_OIDC_TOKEN\s*(?:\|\||\?\?)/);
});

test("backup upload and server transport share the canonical 12 MB byte contract", () => {
  const component = read("components/AdminBackupRestoreOperations.tsx");
  const route = read("app/api/admin/mutations/entities/route.ts");

  assert.equal(BACKUP_UPLOAD_MAX_BYTES, 12_000_000);
  assert.match(component, /file\.size > BACKUP_UPLOAD_MAX_BYTES/);
  assert.doesNotMatch(component, /25\s*\*\s*1024\s*\*\s*1024/);
  assert.match(route, /textEncoder\.encode\(serializedPayload\)\.byteLength > BACKUP_UPLOAD_MAX_BYTES/);
  assert.doesNotMatch(route, /JSON\.stringify\(payload\)\.length > 12_000_000/);
});

test("backup validation keeps integrity failures distinct from gateway availability failures", () => {
  const component = read("components/AdminBackupRestoreOperations.tsx");
  const route = read("app/api/admin/mutations/entities/route.ts");

  assert.match(component, /setMessage\(result\.error\.message \|\| "تعذر تشغيل فحص سلامة النسخة حاليًا\."\)/);
  assert.doesNotMatch(component, /لم يجتز ملف النسخة فحص السلامة/);
  assert.match(route, /body\.action === "pr116_admin_backup_dry_run"/);
  assert.match(route, /code: "backup_validation_unavailable"/);
  assert.match(route, /لم يثبت وجود مشكلة في ملف النسخة/);
});

test("dry-run copy states that site data is unchanged while audit metadata is recorded", () => {
  const component = read("components/AdminBackupRestoreOperations.tsx");

  assert.match(component, /لم تتغير بيانات الموقع؛ سُجّل الفحص فقط في سجل العمليات/);
  assert.match(component, /لا تتم استعادة أو استبدال بيانات الموقع؛ يُسجّل الفحص فقط في سجل العمليات/);
  assert.doesNotMatch(component, /هذه الخطوة لا تغيّر البيانات/);
});

test("backup closeout does not weaken restore confirmation or change the Edge dry-run byte gate", () => {
  const component = read("components/AdminBackupRestoreOperations.tsx");
  const edge = read("supabase/functions/pr116-admin-oidc-gateway/index.ts");

  assert.match(component, /const restoreConfirmation = "استعادة العناصر المحددة"/);
  assert.match(component, /confirmText\.trim\(\) !== restoreConfirmation/);
  assert.match(edge, /const DEFAULT_ADMIN_BODY_MAX_BYTES = 50_000;/);
  assert.match(edge, /const BACKUP_DRY_RUN_BODY_MAX_BYTES = 12_000_000;/);
  assert.match(edge, /encoder\.encode\(body\)\.byteLength > maxBodyBytes\(action\)/);
});
