import { test, expect } from "@playwright/test";

test.describe("PR101 public product expansion", () => {
  test("cookie consent is versioned and reopenable", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: /إعدادات الخصوصية|Privacy and cookie|Gizlilik ve çerez/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /الضرورية فقط|Necessary only|Yalnızca gerekli/i }).click();
    await expect(dialog).toBeHidden();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("hamza_agency_cookie_consent") || "null"));
    expect(stored).toMatchObject({ version: "1.0", necessary: true, analytics: false, preferences: false, marketing: false });
    await page.getByRole("button", { name: /إعدادات ملفات الارتباط|Cookie settings|Çerez ayarları/i }).click();
    await expect(dialog).toBeVisible();
  });

  test("marketplace and status routes render without leaking private data", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { name: /سوق HAMZA AGENCY|HAMZA AGENCY Marketplace|HAMZA AGENCY Pazaryeri/i })).toBeVisible();
    await page.goto("/status");
    await expect(page.getByRole("heading", { name: /حالة المنصة والخدمات/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/service_role|oidc token|webhook secret|authorization:/i);
    expect(errors).toEqual([]);
  });

  test("offline shell explicitly excludes authenticated data", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: /غير متصل/i })).toBeVisible();
    await expect(page.locator("main")).toContainText(/لا تُخزّن|never cached|önbelleğe alınmaz/i);
  });

  test("service worker excludes private routes", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBeTruthy();
    const source = await response.text();
    for (const route of ["/admin", "/portal", "/api", "/auth", "/application-status", "/service-status"]) expect(source).toContain(route);
  });
});

test.describe("PR101 portal isolation", () => {
  test("signed-out creator profile redirects to shared login", async ({ page }) => {
    await page.goto("/portal/creator/profile");
    await page.waitForURL(/\/portal\/login/);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/portal/creator/profile");
  });

  test("signed-out portals do not expose module rows", async ({ page }) => {
    await page.goto("/portal/client/orders");
    await page.waitForURL(/\/portal\/login/);
    await expect(page.locator("body")).not.toContainText(/order_code|client_user_id|payment_status/i);
  });
});
