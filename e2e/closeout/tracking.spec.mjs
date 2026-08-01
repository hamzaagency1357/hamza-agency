import { test, expect } from "@playwright/test";
import { annotate, evidence, openFixture, resetFixture } from "./pr99-fixture.mjs";

test("application and service submissions are isolated, deduplicated, and cleaned", async ({ page }, testInfo) => {
  await openFixture(page);
  await page.getByTestId("application").click();
  await page.getByTestId("service").click();
  await expect(page.getByTestId("state")).toContainText("application");
  await expect(page.getByTestId("state")).toContainText("service_request");
  await page.getByTestId("duplicate").click();
  await expect(page.getByTestId("error")).toHaveText("duplicate");
  await expect(page.locator("body")).not.toContainText(/whatsapp|authorization:|service_role/i);
  await page.screenshot({ path: evidence(testInfo, "tracking", "submit-dedupe"), fullPage: true, animations: "disabled" });
  await resetFixture(page);
  await annotate(testInfo, 7);
});

test("public tracking endpoints reject malformed codes without exposing lookup details", async ({ request }, testInfo) => {
  for (const endpoint of ["/api/application-status", "/api/service-status", "/api/track"]) {
    const response = await request.post(endpoint, { data: { trackingCode: "invalid", code: "invalid" } });
    expect([400, 404, 405, 429]).toContain(response.status());
    expect(await response.text()).not.toMatch(/whatsapp|email|stack|service_role|authorization/i);
  }
  await annotate(testInfo, 6);
});
