import { test, expect } from "@playwright/test";
import { action, annotate, cleanupFixture, evidence, initializeFixture } from "./pr99-fixture.mjs";

test("backup dry-run rejects invalid checksum and limited restore completes", async ({ page, request }, testInfo) => {
  await initializeFixture(request);
  expect((await action(request, "backup")).body.state.page.backups).toBe(1);
  const invalid = await action(request, "dry_run", { checksum: "invalid" });
  expect(invalid.response.status()).toBe(422);
  expect(invalid.body.code).toBe("invalid_checksum");
  expect((await action(request, "dry_run", { checksum: "valid-fixture-checksum" })).body.state.activity).toContain("backup_dry_run_valid");
  expect((await action(request, "fixture_restore")).body.state.activity).toContain("fixture_restore_completed");
  await page.goto("/pr99-e2e", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: evidence(testInfo, "backup-restore", "dry-run-limited-restore"), fullPage: true, animations: "disabled" });
  await cleanupFixture(request);
  await annotate(testInfo, 7);
});
