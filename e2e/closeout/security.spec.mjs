import path from "node:path";
import { test, expect } from "@playwright/test";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const shortSha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);

function recordAssertions(testInfo, count) {
  testInfo.annotations.push({ type: "closeout-assertions", description: String(count) });
}

function screenshotName(name, projectName) {
  const device = projectName.startsWith("mobile") ? "mobile" : "desktop";
  return path.join("artifacts", "safe", "screenshots", `security-${name}-${device}-${shortSha}.png`);
}

test("signed-out admin and portal guards expose no private data", async ({ page }, testInfo) => {
  await page.goto("/admin", { waitUntil: "networkidle" });
  expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
  await expect(page.locator("body")).not.toContainText(/service_role|authorization:|refresh_token|recovery code|payment_secret|mfa_secret/i);

  await page.goto("/portal/client/orders", { waitUntil: "networkidle" });
  expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
  await expect(page).toHaveURL(/\/portal\/login/);
  await expect(page.locator("body")).not.toContainText(/order_code|client_user_id|service_role|authorization:|refresh_token|recovery code/i);
  recordAssertions(testInfo, 5);
  await page.screenshot({ path: screenshotName("signed-out-guards", testInfo.project.name), fullPage: true, animations: "disabled" });
});

test("service worker excludes private surfaces", async ({ request }, testInfo) => {
  const response = await request.get("/sw.js");
  expect(response.ok()).toBeTruthy();
  const source = await response.text();
  for (const route of ["/admin", "/portal", "/api", "/auth", "/application-status", "/service-status"]) {
    expect(source).toContain(route);
  }
  expect(source).not.toMatch(/service_role|refresh_token|authorization:/i);
  recordAssertions(testInfo, 8);
});
