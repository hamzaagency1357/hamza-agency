import { test, expect } from "@playwright/test";
import { action, annotate, cleanupFixture, evidence, initializeFixture } from "./pr99-fixture.mjs";

test("trash supports restore and requires exact permanent-delete confirmation", async ({ page, request }, testInfo) => {
  await initializeFixture(request);
  await action(request, "trash");
  const protectedDelete = await action(request, "permanent_delete", { confirmation: "WRONG" });
  expect(protectedDelete.response.status()).toBe(409);
  expect(protectedDelete.body.code).toBe("protected");
  expect((await action(request, "restore_trash")).body.state.page.trash).toBe("restored");
  await action(request, "trash");
  expect((await action(request, "permanent_delete", { confirmation: "DELETE PERMANENTLY" })).body.state.page.trash).toBe("deleted");
  await page.goto("/pr99-e2e", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: evidence(testInfo, "trash", "restore-delete"), fullPage: true, animations: "disabled" });
  await cleanupFixture(request);
  await annotate(testInfo, 7);
});
