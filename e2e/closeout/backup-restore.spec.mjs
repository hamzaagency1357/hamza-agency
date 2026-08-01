import { test, expect } from "@playwright/test";
import { annotate, evidence, openFixture, resetFixture } from "./pr99-fixture.mjs";

test("backup dry-run rejects invalid checksum and limited restore completes", async ({ page }, testInfo) => {
  await openFixture(page);
  await page.getByTestId("backup").click();
  await expect(page.getByTestId("state")).toContainText('"backups": 1');
  await page.getByTestId("dry-invalid").click();
  await expect(page.getByTestId("error")).toHaveText("invalid_checksum");
  await page.getByTestId("dry-valid").click();
  await expect(page.getByTestId("state")).toContainText("backup_dry_run_valid");
  await page.getByTestId("fixture_restore").click();
  await expect(page.getByTestId("state")).toContainText("fixture_restore_completed");
  await page.screenshot({ path: evidence(testInfo, "backup-restore", "dry-run-limited-restore"), fullPage: true, animations: "disabled" });
  await resetFixture(page);
  await annotate(testInfo, 7);
});
