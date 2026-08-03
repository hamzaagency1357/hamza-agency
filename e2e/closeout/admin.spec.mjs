import { test, expect } from "@playwright/test";
import { annotations, fixture, projectFixture } from "./real-runtime-helper.mjs";

test("authenticated super admin opens real operational pages and persists a database change after reload", async ({ page }, testInfo) => {
  const f = fixture();
  const project = projectFixture(f, testInfo);

  const response = await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/admin/login");
  await expect(page.locator('main[dir="rtl"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "تسجيل دخول الإدارة" })).toBeVisible();

  const email = page.locator('input[type="email"][name="email"]');
  const password = page.locator('input[type="password"][name="password"]');
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await email.fill(f.accounts.employee.email);
  await password.fill(f.accounts.employee.password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL((url) => url.pathname === "/admin");

  for (const route of ["/admin", "/admin/page-builder", "/admin/backups", "/admin/trash", "/admin/notifications"]) {
    const routeResponse = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(routeResponse?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText(/جارٍ التحقق|جاري التحقق/);
    expect(new URL(page.url()).pathname).toBe(route);
    await expect(page.locator("body")).not.toContainText(/pr99-e2e|fixture-only|Supabase غير متصل|Application error|Internal Server Error/);
    const main = page.locator("main");
    await expect(main).toHaveCount(1);
    await expect(main).toBeVisible();
  }

  await page.getByPlaceholder("بحث").fill(project.notificationTitle);
  const notification = page.locator("article").filter({ hasText: project.notificationTitle });
  await expect(notification).toBeVisible();
  await notification.getByRole("button", { name: "مقروء" }).click();
  await expect(page.getByText("تم تعليم الإشعار كمقروء.")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "الإشعارات" })).toBeVisible();
  await page.getByPlaceholder("بحث").fill(project.notificationTitle);
  const persisted = page.locator("article").filter({ hasText: project.notificationTitle });
  await expect(persisted).toBeVisible();
  await expect(persisted.getByRole("button", { name: "مقروء" })).toHaveCount(0);
  annotations(testInfo, 24);
});
