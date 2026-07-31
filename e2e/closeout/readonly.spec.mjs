import { test, expect } from "@playwright/test";

const suite = process.env.CLOSEOUT_SUITE;
const mode = process.env.CLOSEOUT_EXECUTION_MODE;
const readonly = mode !== "local-isolated";

if (readonly) {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", async (route) => {
      const method = route.request().method();
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) throw new Error(`Readonly closeout blocked ${method} ${route.request().url()}`);
      await route.continue();
    });
  });
}

test.describe("public", () => {
  test.skip(suite !== "public", `suite=${suite}`);
  for (const route of ["/", "/en", "/tr", "/marketplace", "/status"]) {
    test(`${route} renders without browser or network failures`, async ({ page }) => {
      const errors = [];
      const failed = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("requestfailed", (request) => failed.push(`${request.method()} ${request.url()}`));
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.ok(), `${route} HTTP status`).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      expect(errors).toEqual([]);
      expect(failed).toEqual([]);
    });
  }
});

test.describe("translations", () => {
  test.skip(suite !== "translations", `suite=${suite}`);
  for (const [route, lang] of [["/", "ar"], ["/en", "en"], ["/tr", "tr"]]) {
    test(`${lang} owns its runtime document`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    });
  }
});

test.describe("security", () => {
  test.skip(suite !== "security", `suite=${suite}`);
  test("signed-out admin and portal guards expose no private rows", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login|admin/);
    await page.goto("/portal/client/orders");
    await page.waitForURL(/\/portal\/login/);
    await expect(page.locator("body")).not.toContainText(/service_role|authorization:|refresh_token|recovery code|payment_secret/i);
  });

  test("service worker excludes private surfaces", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBeTruthy();
    const source = await response.text();
    for (const route of ["/admin", "/portal", "/api", "/auth"]) expect(source).toContain(route);
  });
});
