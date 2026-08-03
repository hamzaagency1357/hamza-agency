import { test, expect } from "@playwright/test";
import { resolveNecessaryCookieConsent } from "./cookie-consent-helper.mjs";
import { annotations, fixture, projectFixture } from "./real-runtime-helper.mjs";

test.describe.configure({ mode: "serial" });

async function login(page, account) {
  const response = await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/admin/login");
  await resolveNecessaryCookieConsent(page);

  const main = page.locator('main[dir="rtl"]');
  await expect(main).toHaveCount(1);
  await expect(main).toBeVisible();
  await expect(page.getByRole("heading", { name: "تسجيل دخول الإدارة" })).toBeVisible();

  const email = page.locator('input[type="email"][name="email"]');
  const password = page.locator('input[type="password"][name="password"]');
  const loginButton = page.getByRole("button", { name: "تسجيل الدخول" });
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(loginButton).toBeVisible();
  await email.fill(account.email);
  await password.fill(account.password);
  await loginButton.click();
  await page.waitForURL((url) => url.pathname === "/admin");
}

test("authenticated super admin opens real operational pages with one visible main landmark", async ({ page }, testInfo) => {
  const f = fixture();
  projectFixture(f, testInfo);

  await test.step("log in through the real Arabic admin form", async () => {
    await login(page, f.accounts.employee);
  });

  await test.step("open operational admin routes without runtime errors", async () => {
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
  });

  annotations(testInfo, 16);
});

test("notification read state persists after reload", async ({ page }, testInfo) => {
  const f = fixture();
  const project = projectFixture(f, testInfo);

  await test.step("log in and open real notifications", async () => {
    await login(page, f.accounts.employee);
    const response = await page.goto("/admin/notifications", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/admin/notifications");
    const main = page.locator("main");
    await expect(main).toHaveCount(1);
    await expect(main).toBeVisible();
  });

  await test.step("mark the project notification as read", async () => {
    await page.getByPlaceholder("بحث").fill(project.notificationTitle);
    const notification = page.locator("article").filter({ hasText: project.notificationTitle });
    await expect(notification).toBeVisible();
    await notification.getByRole("button", { name: "مقروء" }).click();
    await expect(page.getByText("تم تعليم الإشعار كمقروء.")).toBeVisible();
  });

  await test.step("reload and prove the database change persisted", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "الإشعارات" })).toBeVisible();
    await page.getByPlaceholder("بحث").fill(project.notificationTitle);
    const persisted = page.locator("article").filter({ hasText: project.notificationTitle });
    await expect(persisted).toBeVisible();
    await expect(persisted.getByRole("button", { name: "مقروء" })).toHaveCount(0);
  });

  annotations(testInfo, 12);
});
