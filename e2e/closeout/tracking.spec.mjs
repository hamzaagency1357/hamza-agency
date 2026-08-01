import { test, expect } from "@playwright/test";
import { action, annotate, cleanupFixture, evidence, initializeFixture } from "./pr99-fixture.mjs";

test("application and service submissions are isolated, deduplicated, and cleaned", async ({ page, request }, testInfo) => {
  await initializeFixture(request);
  expect((await action(request, "submit", { kind: "application", key: "application-1" })).response.ok()).toBe(true);
  const service = await action(request, "submit", { kind: "service_request", key: "service-1" });
  expect(service.body.state.submissions).toEqual(["application", "service_request"]);
  const duplicate = await action(request, "submit", { kind: "application", key: "application-1" });
  expect(duplicate.response.status()).toBe(429);
  expect(duplicate.body.code).toBe("duplicate");
  await page.goto("/pr99-e2e", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).not.toContainText(/whatsapp|authorization:|service_role/i);
  await page.screenshot({ path: evidence(testInfo, "tracking", "submit-dedupe"), fullPage: true, animations: "disabled" });
  await cleanupFixture(request);
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
