import { test, expect } from "@playwright/test";

async function resolveCookieConsent(page) {
  const banner = page.getByTestId("cookie-banner");
  if (await banner.isVisible().catch(() => false)) {
    await page.getByTestId("cookie-necessary-only").click();
    await expect(banner).toBeHidden();
  }
}

test.describe("PR101 public product expansion", () => {
  test("cookie consent is versioned and reopenable", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByTestId("cookie-banner");
    const dialog = page.getByRole("dialog", { name: /إعدادات ملفات الارتباط|Cookie settings|Çerez ayarları/i });
    await expect(banner).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await page.getByTestId("cookie-necessary-only").click();
    await expect(banner).toBeHidden();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("hamza_agency_cookie_consent") || "null"));
    expect(stored).toMatchObject({ version: "1.0", necessary: true, analytics: false, preferences: false, marketing: false });
    await page.getByTestId("footer-cookie-settings").click();
    await expect(dialog).toBeVisible();
  });

  test("marketplace and status routes render without leaking private data", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/marketplace");
    await resolveCookieConsent(page);
    await expect(page.getByRole("heading", { name: /سوق HAMZA AGENCY|HAMZA AGENCY Marketplace|HAMZA AGENCY Pazaryeri/i })).toBeVisible();
    await page.goto("/status");
    await expect(page.getByRole("heading", { name: /حالة المنصة والخدمات/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/service_role|oidc token|webhook secret|authorization:/i);
    expect(errors).toEqual([]);
  });

  test("offline shell explicitly excludes authenticated data", async ({ page }) => {
    await page.goto("/offline");
    await resolveCookieConsent(page);
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
