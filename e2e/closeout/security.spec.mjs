import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { browserPortalCredentials, login, portalFixture } from "./portal-fixture.mjs";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const shortSha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);
const fixturePath = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-portal-fixtures.json";

function recordAssertions(testInfo, count) { testInfo.annotations.push({ type: "closeout-assertions", description: String(count) }); }
function screenshotName(name, projectName) {
  const device = projectName.startsWith("mobile") ? "mobile" : "desktop";
  return path.join("artifacts", "safe", "screenshots", `security-${name}-${device}-${shortSha}.png`);
}
async function portalWrite(page, credentials, section, body = {}) {
  return page.evaluate(async ({ accessToken, platformSessionId, sectionName, payload }) => {
    const response = await fetch(`/api/product-expansion/portal?role=creator&section=${encodeURIComponent(sectionName)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "x-platform-session-id": platformSessionId, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { status: response.status, body: await response.json() };
  }, { ...credentials, sectionName: section, payload: body });
}
async function portalPost(page, credentials, section, body = {}) {
  return page.evaluate(async ({ accessToken, platformSessionId, sectionName, payload }) => {
    const response = await fetch(`/api/product-expansion/portal?role=creator&section=${encodeURIComponent(sectionName)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "x-platform-session-id": platformSessionId, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { status: response.status, body: await response.json() };
  }, { ...credentials, sectionName: section, payload: body });
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

  test("revoking one platform session blocks that session sensitive writes", async ({ page }, testInfo) => {
    await login(page, fixture.accounts.revokeOne);
    await expect(page).toHaveURL(/\/portal\/creator/);
    await page.goto("/portal/creator/sessions", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/portal\/creator\/sessions/);
    const credentials = await browserPortalCredentials(page);
    expect(credentials.accessToken).not.toBe("");
    expect(credentials.platformSessionId).not.toBe("");
    const revoked = await portalPost(page, credentials, "revoke-session", { id: credentials.platformSessionId });
    expect(revoked.status).toBe(200);
    expect(revoked.body.ok).toBe(true);
    const denied = await portalWrite(page, credentials, "profile", { display_name: "must-not-write" });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("platform_session_invalid");
    recordAssertions(testInfo, 8);
    await page.screenshot({ path: screenshotName("revoke-one", testInfo.project.name), fullPage: true, animations: "disabled" });
  });

  test("revoking all sessions invalidates every platform session for the user", async ({ browser, page }, testInfo) => {
    await login(page, fixture.accounts.revokeAll);
    await expect(page).toHaveURL(/\/portal\/creator/);
    await page.goto("/portal/creator/sessions", { waitUntil: "networkidle" });
    const first = await browserPortalCredentials(page);

    const secondContext = await browser.newContext({ baseURL: process.env.CLOSEOUT_TARGET_URL, ignoreHTTPSErrors: true, serviceWorkers: "block" });
    const secondPage = await secondContext.newPage();
    await login(secondPage, fixture.accounts.revokeAll);
    await expect(secondPage).toHaveURL(/\/portal\/creator/);
    await secondPage.goto("/portal/creator/sessions", { waitUntil: "networkidle" });
    const second = await browserPortalCredentials(secondPage);
    expect(first.platformSessionId).not.toBe("");
    expect(second.platformSessionId).not.toBe("");
    expect(second.platformSessionId).not.toBe(first.platformSessionId);

    const revoked = await portalPost(page, first, "revoke-all-sessions");
    expect(revoked.status).toBe(200);
    expect(revoked.body.ok).toBe(true);
    const firstDenied = await portalWrite(page, first, "profile", { display_name: "blocked-first" });
    const secondDenied = await portalWrite(secondPage, second, "profile", { display_name: "blocked-second" });
    expect(firstDenied.status).toBe(403);
    expect(firstDenied.body.code).toBe("platform_session_invalid");
    expect(secondDenied.status).toBe(403);
    expect(secondDenied.body.code).toBe("platform_session_invalid");
    await secondContext.close();
    recordAssertions(testInfo, 12);
    await page.screenshot({ path: screenshotName("revoke-all", testInfo.project.name), fullPage: true, animations: "disabled" });
  });
}
