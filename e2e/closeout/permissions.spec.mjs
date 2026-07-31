import { test, expect } from "@playwright/test";
import { annotate, evidence, login, portalFixture } from "./portal-fixture.mjs";

const fixture = portalFixture();
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

test("suspended membership is denied without a portal session", async ({ page }, testInfo) => {
  await login(page, fixture.accounts.suspended);
  await expect(page).toHaveURL(/\/portal\/login/);
  await expect(page.getByRole("alert")).toContainText(/تعليق|suspended|askıya/i);
  await page.screenshot({ path: evidence(testInfo, "permissions", "suspended"), fullPage: true, animations: "disabled" });
  await annotate(testInfo, 2);
});

test("membership from another tenant cannot enter the active host tenant", async ({ page }, testInfo) => {
  await login(page, fixture.accounts.otherTenant);
  await expect(page).toHaveURL(/\/portal\/login/);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.screenshot({ path: evidence(testInfo, "permissions", "cross-tenant"), fullPage: true, animations: "disabled" });
  await annotate(testInfo, 2);
});
