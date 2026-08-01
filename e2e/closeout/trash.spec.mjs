import { test, expect } from "@playwright/test";
import { annotate, evidence, openFixture, resetFixture } from "./pr99-fixture.mjs";

test("trash supports restore and requires exact permanent-delete confirmation", async ({ page }, testInfo) => {
  await openFixture(page);
  await page.getByTestId("trash").click();
  await page.getByTestId("delete-protected").click();
  await expect(page.getByTestId("error")).toHaveText("protected");
  await page.getByTestId("restore_trash").click();
  await expect(page.getByTestId("state")).toContainText('"trash": "restored"');
  await page.getByTestId("trash").click();
  await page.getByTestId("delete-confirmed").click();
  await expect(page.getByTestId("state")).toContainText('"trash": "deleted"');
  await page.screenshot({ path: evidence(testInfo, "trash", "restore-delete"), fullPage: true, animations: "disabled" });
  await resetFixture(page);
  await annotate(testInfo, 7);
});
