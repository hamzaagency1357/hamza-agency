import { test, expect } from "@playwright/test";
import { annotations, fixture, rpc, token } from "./real-runtime-helper.mjs";

test("real backup payload validates checksum, performs dry run, and limited restore", async ({ request }, testInfo) => {
  const f = fixture();
  const admin = await token(request, f.accounts.employee);
  const scope = ["pages", "sections"];

  const payload = await rpc(request, admin, "pr99_build_backup_payload", { p_scope: scope });
  expect(payload.project_ref).toBe("fvaurkfnsvsfohpzguho");
  expect(payload.backup_code).toBeTruthy();
  expect(payload.checksum).toMatch(/^[a-f0-9]{64}$/i);
  expect(payload.entities.pages).toBeTruthy();

  const dryRun = await rpc(request, admin, "pr99_backup_dry_run", { p_backup: payload, p_scope: scope });
  expect(dryRun.valid).toBe(true);

  const invalid = { ...payload, checksum: "0".repeat(64) };
  await rpc(request, admin, "pr99_backup_dry_run", { p_backup: invalid, p_scope: scope }, [400, 409]);

  const restored = await rpc(request, admin, "pr99_restore_backup", { p_backup: payload, p_scope: scope });
  expect(restored).toBeTruthy();
  expect(JSON.stringify(restored)).toMatch(/completed|results|validation/i);
  annotations(testInfo, 11);
});
