import { test, expect } from "@playwright/test";
import { annotations, fixture } from "./real-runtime-helper.mjs";

test("authenticated super admin opens real operational pages without fallback or fixture routes", async ({ page }, testInfo) => {
  const f = fixture();
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("البريد الإلكتروني").fill(f.accounts.employee.email);
  await page.getByLabel("كلمة المرور").fill(f.accounts.employee.password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL(/\/admin(?:\/)?$/, { timeout: 20_000 });

  for (const route of ["/admin", "/admin/page-builder", "/admin/backups", "/admin/trash", "/admin/notifications"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain(route);
    await expect(page.locator("body")).not.toContainText(/pr99-e2e|fixture-only|Supabase غير متصل/);
    await expect(page.locator("main, body")).toBeVisible();
  }
  annotations(testInfo, 15);
});
