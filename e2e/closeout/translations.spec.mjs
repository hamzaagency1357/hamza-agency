import { test, expect } from "@playwright/test";
import { installPreviewBypass } from "./preview-bypass.mjs";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const storageKey = "hamza_agency_cookie_consent";
test.describe.configure({ retries: 0 });

const cases = {
  ar: { route: "/", installRoute: "/install-app", dir: "rtl", title: "الخصوصية وملفات الارتباط", installTitle: "ثبّت الموقع كتطبيق", accept: "قبول الكل", necessary: "الضرورية فقط", manage: "إدارة التفضيلات" },
  en: { route: "/en", installRoute: "/en/install-app", dir: "ltr", title: "Privacy and cookies", installTitle: "Install the website as an app", accept: "Accept all", necessary: "Necessary only", manage: "Manage preferences" },
  tr: { route: "/tr", installRoute: "/tr/install-app", dir: "ltr", title: "Gizlilik ve çerezler", installTitle: "Web sitesini uygulama olarak yükleyin", accept: "Tümünü kabul et", necessary: "Yalnızca gerekli", manage: "Tercihleri yönet" },
};

function recordAssertions(testInfo, count) {
  testInfo.annotations.push({ type: "closeout-assertions", description: String(count) });
}

async function freshConsent(page, route) {
  await page.goto(route, { waitUntil: "networkidle" });
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("cookie-banner")).toBeVisible();
}

async function dispatchInstallPrompt(page) {
  await page.evaluate(() => {
    window.installPromptCalls = 0;
    const event = new Event("beforeinstallprompt");
    Object.defineProperty(event, "prompt", { value: async () => { window.installPromptCalls += 1; } });
    Object.defineProperty(event, "userChoice", { value: Promise.resolve({ outcome: "accepted", platform: "web" }) });
    window.dispatchEvent(event);
  });
}

test.beforeEach(async ({ page }) => {
  await installPreviewBypass(page, expectedHost);
  await page.route("**/api/product-expansion/consent", (route) => route.fulfill({ status: 204, body: "" }));
});

for (const [locale, data] of Object.entries(cases)) {
  test(`${locale} first visit uses a compact URL-localized cookie banner`, async ({ page }, testInfo) => {
    await freshConsent(page, data.route);
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    const banner = page.getByTestId("cookie-banner");
    await expect(banner).toHaveAttribute("dir", data.dir);
    await expect(banner).toHaveAttribute("data-cookie-locale", locale);
    await expect(banner.getByRole("heading", { name: data.title })).toBeVisible();
    await expect(banner.getByRole("button", { name: data.accept })).toBeVisible();
    await expect(banner.getByRole("button", { name: data.necessary })).toBeVisible();
    await expect(banner.getByRole("button", { name: data.manage })).toBeVisible();
    await expect(page.getByTestId("cookie-backdrop")).toHaveCount(0);
    await expect(page.getByTestId("cookie-dialog")).toHaveCount(0);
    await expect(banner.locator("nav")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    const position = await banner.evaluate((element) => getComputedStyle(element).position);
    const box = await banner.boundingBox();
    expect(position).toBe("fixed");
    expect(box.height).toBeLessThan((await page.evaluate(() => window.innerHeight)) * 0.75);
    recordAssertions(testInfo, 13);
  });

  test(`${locale} install page is normal-flow and prompts only after its button`, async ({ page }, testInfo) => {
    await page.goto(data.installRoute, { waitUntil: "networkidle" });
    const banner = page.getByTestId("cookie-banner");
    if (await banner.isVisible().catch(() => false)) await page.getByTestId("cookie-necessary-only").click();
    await dispatchInstallPrompt(page);
    const installPage = page.getByTestId("install-app-page");
    await expect(installPage.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByTestId("install-app-action")).toBeVisible();
    expect(await page.evaluate(() => window.installPromptCalls)).toBe(0);
    expect(["fixed", "absolute"]).not.toContain(await installPage.evaluate((element) => getComputedStyle(element).position));
    await page.getByTestId("install-app-action").click();
    await expect.poll(() => page.evaluate(() => window.installPromptCalls)).toBe(1);
    recordAssertions(testInfo, 7);
  });
}

test("cookie decisions persist across reload, navigation, and language changes", async ({ page }, testInfo) => {
  await freshConsent(page, "/");
  await page.getByTestId("cookie-necessary-only").click();
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  await page.goto("/en", { waitUntil: "networkidle" });
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  await page.goto("/tr", { waitUntil: "networkidle" });
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({ analytics: false, preferences: false, marketing: false });

  await page.getByTestId("footer-cookie-settings").click();
  const dialog = page.getByTestId("cookie-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-cookie-locale", "tr");
  await expect(dialog.locator("nav")).toHaveCount(0);
  await page.getByTestId("cookie-choice-analytics").check();
  await page.getByTestId("cookie-accept-selected").click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({ analytics: true, preferences: false, marketing: false });
  recordAssertions(testInfo, 12);
});

test("manage preferences is the only action that opens the preferences dialog", async ({ page }, testInfo) => {
  await freshConsent(page, "/en");
  await expect(page.getByTestId("cookie-dialog")).toHaveCount(0);
  await page.getByTestId("cookie-manage-preferences").click();
  await expect(page.getByTestId("cookie-dialog")).toBeVisible();
  await expect(page.getByTestId("cookie-backdrop")).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.getByTestId("cookie-close").click();
  await expect(page.getByTestId("cookie-dialog")).toBeHidden();
  await expect(page.getByTestId("cookie-banner")).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  recordAssertions(testInfo, 7);
});

test("mobile Dock exposes exactly WhatsApp, AI Support, and Quick Navigation", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByTestId("cookie-banner").isVisible().catch(() => false)) await page.getByTestId("cookie-necessary-only").click();
  const dock = page.getByTestId("public-mobile-dock");
  await expect(dock).toBeVisible();
  await expect(dock.getByTestId("mobile-whatsapp")).toBeVisible();
  await expect(dock.getByTestId("mobile-ai-support")).toBeVisible();
  await expect(dock.getByTestId("mobile-quick-navigation")).toBeVisible();
  await expect(dock.locator("a,button")).toHaveCount(3);
  await expect(page.getByTestId("footer-install-app")).toBeVisible();
  await expect(page.getByTestId("footer-cookie-settings")).toBeVisible();
  recordAssertions(testInfo, 7);
});

test("Quick Navigation and Footer expose the localized install page", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/tr", { waitUntil: "networkidle" });
  if (await page.getByTestId("cookie-banner").isVisible().catch(() => false)) await page.getByTestId("cookie-necessary-only").click();
  await expect(page.getByTestId("footer-install-app")).toHaveAttribute("href", "/tr/install-app");
  await page.getByTestId("mobile-quick-navigation").click();
  const panel = page.locator("#hamza-mobile-quick-nav-panel");
  await expect(panel).toBeVisible();
  await expect(panel.locator('a[href="/tr/install-app"]')).toBeVisible();
  recordAssertions(testInfo, 4);
});

test("Chrome Custom Tab shows full-Chrome instructions without invoking install", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, "referrer", { configurable: true, get: () => "android-app://com.example.host" });
  });
  await page.goto("/en/install-app", { waitUntil: "networkidle" });
  if (await page.getByTestId("cookie-banner").isVisible().catch(() => false)) await page.getByTestId("cookie-necessary-only").click();
  await dispatchInstallPrompt(page);
  await expect(page.getByTestId("install-custom-tab-instructions")).toBeVisible();
  await expect(page.getByTestId("install-open-chrome")).toBeVisible();
  await expect(page.getByTestId("install-app-action")).toHaveCount(0);
  expect(await page.evaluate(() => window.installPromptCalls)).toBe(0);
  recordAssertions(testInfo, 4);
});

test("standalone mode reports the app as installed", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : original(query);
  });
  await page.goto("/install-app", { waitUntil: "networkidle" });
  if (await page.getByTestId("cookie-banner").isVisible().catch(() => false)) await page.getByTestId("cookie-necessary-only").click();
  await expect(page.getByTestId("install-app-status")).toContainText("التطبيق مثبت بالفعل");
  await expect(page.getByTestId("install-app-action")).toHaveCount(0);
  recordAssertions(testInfo, 2);
});
