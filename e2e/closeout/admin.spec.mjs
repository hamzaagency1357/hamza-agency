import { test, expect } from "@playwright/test";
import { annotate, evidence, login, portalFixture } from "./portal-fixture.mjs";

const fixture = portalFixture();

test("creator updates an owned profile through the protected portal API", async ({ page }, testInfo) => {
  await login(page, fixture.accounts.creator);
  await page.goto("/portal/creator/profile", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/portal\/creator\/profile/);
  const name = `Closeout Creator ${process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 6)}`;
  const displayName = page.getByLabel(/الاسم المعروض|Display name|Görünen ad/);
  await expect(displayName).toBeVisible();
  await displayName.fill(name);
  await page.getByRole("button", { name: /حفظ الملف|Save profile|Profili kaydet/ }).click();
  await expect(page.getByRole("status")).toContainText(/تم حفظ|saved|kaydedildi/i);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/الاسم المعروض|Display name|Görünen ad/)).toHaveValue(name);
  await page.screenshot({ path: evidence(testInfo, "admin", "creator-profile"), fullPage: true, animations: "disabled" });
  await annotate(testInfo, 5);
});

test("client submits and reads only an owned privacy request", async ({ page }, testInfo) => {
  await login(page, fixture.accounts.client);
  await page.goto("/portal/client/privacy", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/portal\/client\/privacy/);
  const submit = page.getByRole("button", { name: "access", exact: true });
  await expect(submit).toBeVisible();
  await submit.click();
  await expect(page.getByRole("status")).toContainText(/تم إرسال|submitted|gönderildi/i);
  await expect(page.getByText("access", { exact: true }).last()).toBeVisible();
  await page.screenshot({ path: evidence(testInfo, "admin", "client-privacy"), fullPage: true, animations: "disabled" });
  await annotate(testInfo, 4);
});
