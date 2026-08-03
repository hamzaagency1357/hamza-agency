import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test("real private backup persists checksum, dry run, authorization denial, and limited restore", async ({ request }, testInfo) => {
  const f = fixture();
  const admin = await token(request, f.accounts.employee);
  const client = await token(request, f.accounts.client);
  const scope = ["pages", "sections"];

  await rpc(request, client, "pr99_create_private_backup", { p_scope: scope, p_mode: "manual", p_notes: "denied" }, [400, 403]);

  const created = await rpc(request, admin, "pr99_create_private_backup", {
    p_scope: scope,
    p_mode: "manual",
    p_notes: `closeout-${testInfo.project.name}`,
  });
  expect(created.id).toBeTruthy();
  expect(created.backup_code).toBeTruthy();
  expect(created.checksum).toMatch(/^[a-f0-9]{64}$/i);
  expect(created.payload.project_ref).toBe("fvaurkfnsvsfohpzguho");
  expect(created.payload.schema_version).toBeTruthy();
  expect(created.payload.checksum).toBe(created.checksum);
  expect(created.payload.entities.pages).toBeTruthy();

  const persistedBackup = await rest(request, admin, `backups?id=eq.${created.id}&select=id`);
  expect(persistedBackup).toHaveLength(1);

  const dryRun = await rpc(request, admin, "pr99_backup_dry_run", { p_backup: created.payload, p_scope: scope });
  expect(dryRun.valid).toBe(true);
  expect(dryRun.operation_id).toBeTruthy();
  expect(dryRun.checksum).toBe(created.checksum);
  const invalid = { ...created.payload, checksum: "0".repeat(64) };
  await rpc(request, admin, "pr99_backup_dry_run", { p_backup: invalid, p_scope: scope }, [400, 409]);
  await rpc(request, client, "pr99_restore_backup", { p_backup: created.payload, p_scope: scope }, [400, 403]);

  const restored = await rpc(request, admin, "pr99_restore_backup", { p_backup: created.payload, p_scope: scope });
  expect(restored).toBeTruthy();
  expect(JSON.stringify(restored)).toMatch(/completed|results|validation/i);
  expect(restored.completed).toBe(true);
  expect(restored.operation_id).toBeTruthy();
  expect(restored.pre_restore_backup).toBeTruthy();
  const preRestoreBackup = await rest(request, admin, `backups?backup_code=eq.${restored.pre_restore_backup}&select=id`);
  expect(preRestoreBackup).toHaveLength(1);
  annotations(testInfo, 22);
});
