import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { annotate, browserPortalCredentials, evidence, login, portalFixture } from "./portal-fixture.mjs";

const fixture = portalFixture();
const portalAlert = (page) => page.locator("form p[role='alert']");
for (const role of ["creator", "client", "employee", "partner"]) {
  test(`${role} reaches only the matching portal`, async ({ page }, testInfo) => {
    await login(page, fixture.accounts[role]);
    await expect(page).toHaveURL(new RegExp(`/portal/${role}(?:$|/)`));
    await page.goto(`/portal/${role === "creator" ? "client" : "creator"}`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(new RegExp(`/portal/${role}(?:$|/)`));
    await expect(page.locator("body")).not.toContainText(/service_role|refresh_token|authorization:/i);
    await page.screenshot({ path: evidence(testInfo, "permissions", role), fullPage: true, animations: "disabled" });
    await annotate(testInfo, 3);
  });
}

const denialCases = [
  ["pending membership", "pending", /بانتظار|awaiting|bekliyor/i],
  ["suspended membership", "suspended", /تعليق العضوية|membership is suspended|üyelik askıya/i],
  ["revoked membership", "revoked", /إلغاء العضوية|revoked|iptal edildi/i],
  ["suspended account", "accountSuspended", /تعليق الحساب|temporarily suspended|hesap geçici/i],
  ["disabled account", "disabled", /الحساب معط|disabled|devre dışı/i],
];
for (const [label, accountKey, message] of denialCases) {
  test(`${label} is denied fail closed`, async ({ page }, testInfo) => {
    await login(page, fixture.accounts[accountKey]);
    await expect(page).toHaveURL(/\/portal\/login/);
    await expect(portalAlert(page)).toContainText(message);
    await page.screenshot({ path: evidence(testInfo, "permissions", accountKey), fullPage: true, animations: "disabled" });
    await annotate(testInfo, 2);
  });
}

test("tenant B membership cannot enter tenant A host", async ({ page }, testInfo) => {
  await login(page, fixture.accounts.otherTenant);
  await expect(page).toHaveURL(/\/portal\/login/);
  await expect(portalAlert(page)).toBeVisible();
  await page.screenshot({ path: evidence(testInfo, "permissions", "tenant-b-to-a"), fullPage: true, animations: "disabled" });
  await annotate(testInfo, 2);
});

test("tenant A membership cannot authorize against tenant B host", async ({ page }, testInfo) => {
  await login(page, fixture.accounts.creator);
  await expect(page).toHaveURL(/\/portal\/creator/);
  const credentials = await browserPortalCredentials(page);
  expect(credentials.accessToken).not.toBe("");
  const result = await page.evaluate(async ({ accessToken }) => {
    const response = await fetch("/api/product-expansion/portal?role=creator&section=profile", {
      headers: { Authorization: `Bearer ${accessToken}`, "x-forwarded-host": "tenant-b.closeout.test" },
      cache: "no-store",
    });
    return { status: response.status, body: await response.json() };
  }, credentials);
  expect(result.status).toBe(403);
  expect(result.body.code).toBe("active_membership_required");
  await annotate(testInfo, 4);
});

test("user ownership hides foreign alerts and IDOR write fails closed", async ({ page }, testInfo) => {
  await login(page, fixture.accounts.client);
  await expect(page).toHaveURL(/\/portal\/client/);
  await page.goto("/portal/client/sessions", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/portal\/client\/sessions/);
  await expect(page.locator("body")).toContainText("client_owned");
  await expect(page.locator("body")).not.toContainText("employee_private");
  const credentials = await browserPortalCredentials(page);
  expect(credentials.accessToken).not.toBe("");
  expect(credentials.platformSessionId).not.toBe("");
  const result = await page.evaluate(async ({ accessToken, platformSessionId, alertId }) => {
    const response = await fetch("/api/product-expansion/portal?role=client&section=alert", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-platform-session-id": platformSessionId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: alertId }),
    });
    return { status: response.status, body: await response.json() };
  }, { ...credentials, alertId: fixture.records.employeeAlert });
  expect(result.status).toBe(404);
  expect(result.body.code).toBe("owned_resource_not_found");
  const untouched = execFileSync("psql", [process.env.DB_URL, "-Atqc", `select acknowledged_at is null from public.security_alerts where id='${fixture.records.employeeAlert}'::uuid`], { encoding: "utf8" }).trim();
  expect(untouched).toBe("t");
  await page.screenshot({ path: evidence(testInfo, "permissions", "ownership-idor"), fullPage: true, animations: "disabled" });
  await annotate(testInfo, 9);
});
