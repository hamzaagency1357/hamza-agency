import { test, expect } from "@playwright/test";
import { annotate, evidence, openFixture, resetFixture } from "./pr99-fixture.mjs";

test("business events create notifications and mark-all-read clears them", async ({ page }, testInfo) => {
  await openFixture(page);
  await page.getByTestId("application").click();
  await page.getByTestId("publish").click();
  await expect(page.getByTestId("state")).toContainText('"notifications": 2');
  await page.getByTestId("mark_all_read").click();
  await expect(page.getByTestId("state")).toContainText('"notifications": 0');
  await expect(page.getByTestId("state")).toContainText("notifications_marked_read");
  await page.screenshot({ path: evidence(testInfo, "notifications", "events-read-all"), fullPage: true, animations: "disabled" });
  await resetFixture(page);
  await annotate(testInfo, 6);
});
