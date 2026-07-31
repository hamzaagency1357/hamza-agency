import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { login, portalFixture } from "./portal-fixture.mjs";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const shortSha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);
const fixturePath = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-portal-fixtures.json";

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
  for (const route of ["/admin", "/portal", "/api", "/auth", "/application-status", "/service-status"]) expect(source).toContain(route);
  expect(source).not.toMatch(/service_role|refresh_token|authorization:/i);
  recordAssertions(testInfo, 8);
});

if (fs.existsSync(fixturePath)) {
  const fixture = portalFixture();
  test("revoked platform session blocks subsequent sensitive writes", async ({ page }, testInfo) => {
    await login(page, fixture.accounts.creator);
    await page.goto("/portal/creator/sessions", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/portal\/creator\/sessions/);
    const revokeAll = page.getByRole("button", { name: /إلغاء جميع الجلسات|Revoke all sessions|Tüm oturumları iptal et/ });
    await expect(revokeAll).toBeVisible();
    await revokeAll.click();
    await expect(page.getByRole("status")).toContainText(/تم تحديث|updated|güncellendi/i);
    await page.goto("/portal/creator/profile", { waitUntil: "networkidle" });
    const save = page.getByRole("button", { name: /حفظ الملف|Save profile|Profili kaydet/ });
    await save.click();
    await expect(page.getByRole("status")).toContainText(/تعذر|could not|tamamlanamadı/i);
    recordAssertions(testInfo, 5);
    await page.screenshot({ path: screenshotName("revoked-session", testInfo.project.name), fullPage: true, animations: "disabled" });
  });
}
