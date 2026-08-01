import { test, expect } from "@playwright/test";
import { action, annotate, cleanupFixture, evidence, initializeFixture } from "./pr99-fixture.mjs";

test("business events create notifications and mark-all-read clears them", async ({ page, request }, testInfo) => {
  await initializeFixture(request);
  await action(request, "submit", { kind: "application", key: "application-1" });
  expect((await action(request, "publish")).body.state.page.notifications).toBe(2);
  const cleared = await action(request, "mark_all_read");
  expect(cleared.body.state.page.notifications).toBe(0);
  expect(cleared.body.state.activity).toContain("notifications_marked_read");
  await page.goto("/pr99-e2e", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: evidence(testInfo, "notifications", "events-read-all"), fullPage: true, animations: "disabled" });
  await cleanupFixture(request);
  await annotate(testInfo, 6);
});
