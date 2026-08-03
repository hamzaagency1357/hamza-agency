import { test, expect } from "@playwright/test";
import { installPreviewBypass } from "./preview-bypass.mjs";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const storageKey = "hamza_agency_cookie_consent";
const arabicPattern = /[\u0600-\u06ff]/;
test.describe.configure({ retries: 0 });

const cases = {
  ar: {
    route: "/",
    settingsRoute: "/cookie-settings",
    installRoute: "/install-app",
    dir: "rtl",
    cookieTitle: "الخصوصية وملفات الارتباط",
    settingsTitle: "إعدادات ملفات الارتباط",
    acceptAll: "قبول الكل",
    necessaryOnly: "الضرورية فقط",
    manage: "إدارة التفضيلات",
    saveSelected: "حفظ الاختيارات",
    backWebsite: "العودة إلى الموقع",
    install: {
      eyebrow: "تطبيق HAMZA AGENCY",
      title: "ثبّت الموقع كتطبيق",
      description: "صفحة تثبيت واضحة داخل الموقع، دون نوافذ عائمة أو طلبات تلقائية.",
      statusTitle: "التثبيت جاهز",
      statusDescription: "اضغط الزر أدناه لفتح طلب التثبيت الرسمي في المتصفح.",
      button: "تثبيت التطبيق",
      back: "العودة إلى الرئيسية",
    },
  },
  en: {
    route: "/en",
    settingsRoute: "/en/cookie-settings",
    installRoute: "/en/install-app",
    dir: "ltr",
    cookieTitle: "Privacy and cookies",
    settingsTitle: "Cookie settings",
    acceptAll: "Accept all",
    necessaryOnly: "Necessary only",
    manage: "Manage preferences",
    saveSelected: "Save selected",
    backWebsite: "Back to website",
    install: {
      eyebrow: "HAMZA AGENCY app",
      title: "Install the website as an app",
      description: "A clear installation page inside the website, without floating cards or automatic prompts.",
      statusTitle: "Installation is ready",
      statusDescription: "Press the button below to open the browser's official installation prompt.",
      button: "Install app",
      back: "Back to home",
    },
  },
  tr: {
    route: "/tr",
    settingsRoute: "/tr/cookie-settings",
    installRoute: "/tr/install-app",
    dir: "ltr",
    cookieTitle: "Gizlilik ve çerezler",
    settingsTitle: "Çerez ayarları",
    acceptAll: "Tümünü kabul et",
    necessaryOnly: "Yalnızca gerekli",
    manage: "Tercihleri yönet",
    saveSelected: "Seçimleri kaydet",
    backWebsite: "Siteye dön",
    install: {
      eyebrow: "HAMZA AGENCY uygulaması",
      title: "Web sitesini uygulama olarak yükleyin",
      description: "Yüzen kartlar veya otomatik istemler olmadan, web sitesi içindeki açık bir yükleme sayfası.",
      statusTitle: "Yükleme hazır",
      statusDescription: "Tarayıcının resmi yükleme istemini açmak için aşağıdaki düğmeye basın.",
      button: "Uygulamayı yükle",
      back: "Ana sayfaya dön",
    },
  },
};

function recordAssertions(testInfo, count) {
  testInfo.annotations.push({
    type: "closeout-assertions",
    description: String(count),
  });
}

async function freshConsent(page, route) {
  await page.goto(route, { waitUntil: "networkidle" });
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: "networkidle" });
}

async function dispatchInstallPrompt(page) {
  await page.evaluate(() => {
    window.installPromptCalls = 0;
    const event = new Event("beforeinstallprompt");
    Object.defineProperty(event, "prompt", {
      value: async () => {
        window.installPromptCalls += 1;
      },
    });
    Object.defineProperty(event, "userChoice", {
      value: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });
    window.dispatchEvent(event);
  });
}

async function dismissCookieBanner(page) {
  const banner = page.getByTestId("cookie-banner");
  if (await banner.isVisible().catch(() => false)) {
    await page.getByTestId("cookie-necessary-only").click();
  }
}

async function expectInstallCopy(page, locale, data) {
  const installPage = page.getByTestId("install-app-page");
  await expect(page).toHaveURL(new RegExp(`${data.installRoute.replaceAll("/", "\\/")}$`));
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.locator("html")).toHaveAttribute("dir", data.dir);
  await expect(installPage).toHaveAttribute("data-install-locale", locale);
  await expect(installPage.getByText(data.install.eyebrow, { exact: true })).toBeVisible();
  await expect(installPage.getByRole("heading", { level: 1, name: data.install.title })).toBeVisible();
  await expect(installPage.getByText(data.install.description, { exact: true })).toBeVisible();
  await expect(page.getByTestId("install-app-status").getByRole("heading", { level: 2, name: data.install.statusTitle })).toBeVisible();
  await expect(page.getByTestId("install-app-status").getByText(data.install.statusDescription, { exact: true })).toBeVisible();
  await expect(page.getByTestId("install-app-action")).toHaveText(data.install.button);
  await expect(page.getByTestId("install-app-back-home")).toHaveText(data.install.back);
  if (locale !== "ar") {
    expect(await installPage.innerText()).not.toMatch(arabicPattern);
  }
}

test.beforeEach(async ({ page }) => {
  await installPreviewBypass(page, expectedHost);
  await page.route("**/api/product-expansion/consent", (route) =>
    route.fulfill({ status: 204, body: "" })
  );
});

for (const [locale, data] of Object.entries(cases)) {
  test(`${locale} first visit uses a compact localized banner with page navigation`, async ({ page }, testInfo) => {
    await freshConsent(page, data.route);
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);

    const banner = page.getByTestId("cookie-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("dir", data.dir);
    await expect(banner).toHaveAttribute("data-cookie-locale", locale);
    await expect(banner.getByRole("heading", { name: data.cookieTitle })).toBeVisible();
    await expect(banner.getByRole("button", { name: data.acceptAll })).toBeVisible();
    await expect(banner.getByRole("button", { name: data.necessaryOnly })).toBeVisible();
    await expect(banner.getByRole("link", { name: data.manage })).toHaveAttribute("href", data.settingsRoute);
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
    await expect(page.locator('[data-cookie-portal="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    expect(await banner.evaluate((element) => getComputedStyle(element).position)).toBe("fixed");

    const bannerBox = await banner.boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(bannerBox.height).toBeLessThan(viewportHeight * 0.41);

    const dock = page.getByTestId("public-mobile-dock");
    if (await dock.isVisible().catch(() => false)) {
      const dockBox = await dock.boundingBox();
      expect(bannerBox.y + bannerBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    }

    await page.getByTestId("cookie-manage-preferences").click();
    await expect(page).toHaveURL(new RegExp(`${data.settingsRoute.replaceAll("/", "\\/")}$`));
    await expect(page.getByTestId("cookie-settings-page")).toBeVisible();
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);
    recordAssertions(testInfo, 16);
  });

  test(`${locale} cookie settings page persists all supported decisions`, async ({ page }, testInfo) => {
    await freshConsent(page, data.settingsRoute);
    const settingsPage = page.getByTestId("cookie-settings-page");

    await expect(page).toHaveURL(new RegExp(`${data.settingsRoute.replaceAll("/", "\\/")}$`));
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", data.dir);
    await expect(settingsPage).toHaveAttribute("data-cookie-locale", locale);
    await expect(settingsPage.getByRole("heading", { level: 1, name: data.settingsTitle })).toBeVisible();
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
    await expect(page.locator('[data-cookie-portal="true"]')).toHaveCount(0);

    const necessary = page.getByTestId("cookie-settings-necessary");
    await expect(necessary).toBeChecked();
    await expect(necessary).toBeDisabled();

    const analytics = page.getByTestId("cookie-settings-choice-analytics");
    const preferences = page.getByTestId("cookie-settings-choice-preferences");
    const marketing = page.getByTestId("cookie-settings-choice-marketing");
    await expect(analytics).toBeEnabled();
    await expect(preferences).toBeEnabled();
    await expect(marketing).toBeEnabled();

    await analytics.check();
    await page.getByTestId("cookie-settings-save-selected").click();
    await expect(page.getByTestId("cookie-settings-status")).not.toBeEmpty();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({
      necessary: true,
      analytics: true,
      preferences: false,
      marketing: false,
    });

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("cookie-settings-choice-analytics")).toBeChecked();
    await expect(page.getByTestId("cookie-settings-choice-preferences")).not.toBeChecked();
    await expect(page.getByTestId("cookie-settings-choice-marketing")).not.toBeChecked();

    await page.getByTestId("cookie-settings-accept-all").click();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({
      analytics: true,
      preferences: true,
      marketing: true,
    });

    await page.getByTestId("cookie-settings-necessary-only").click();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({
      analytics: false,
      preferences: false,
      marketing: false,
    });

    await expect(page.getByTestId("footer-cookie-settings")).toHaveAttribute("href", data.settingsRoute);
    await expect(page.getByTestId("cookie-settings-back")).toHaveAttribute("href", data.route);
    expect(["fixed", "absolute"]).not.toContain(
      await settingsPage.evaluate((element) => getComputedStyle(element).position)
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await settingsPage.getByRole("heading", { level: 1 }).evaluate((element) => getComputedStyle(element).wordBreak)).not.toBe("break-all");
    expect(await settingsPage.evaluate((element) => Boolean(element.compareDocumentPosition(document.querySelector('[data-testid="public-footer-links"]')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    recordAssertions(testInfo, 27);
  });

  test(`${locale} install direct navigation is fully localized and user-triggered`, async ({ page }, testInfo) => {
    await page.goto(data.installRoute, { waitUntil: "networkidle" });
    await dismissCookieBanner(page);
    await dispatchInstallPrompt(page);
    await expect(page.getByTestId("install-app-action")).toBeVisible();
    await expectInstallCopy(page, locale, data);

    const installPage = page.getByTestId("install-app-page");
    expect(["fixed", "absolute"]).not.toContain(
      await installPage.evaluate((element) => getComputedStyle(element).position)
    );
    expect(await page.evaluate(() => window.installPromptCalls)).toBe(0);
    await page.getByTestId("install-app-action").click();
    await expect.poll(() => page.evaluate(() => window.installPromptCalls)).toBe(1);
    recordAssertions(testInfo, 14);
  });
}

test("cookie decisions persist across reload and language changes without reopening the banner", async ({ page }, testInfo) => {
  await freshConsent(page, "/");
  await page.getByTestId("cookie-necessary-only").click();
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  await page.goto("/en", { waitUntil: "networkidle" });
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  await page.goto("/tr", { waitUntil: "networkidle" });
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({
    analytics: false,
    preferences: false,
    marketing: false,
  });

  await page.getByTestId("footer-cookie-settings").click();
  await expect(page).toHaveURL(/\/tr\/cookie-settings$/);
  await page.getByTestId("cookie-settings-choice-analytics").check();
  await page.getByTestId("cookie-settings-save-selected").click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({
    analytics: true,
    preferences: false,
    marketing: false,
  });
  recordAssertions(testInfo, 10);
});

test("Install App language switching changes the URL and the complete page together", async ({ page }, testInfo) => {
  await page.goto("/install-app", { waitUntil: "networkidle" });
  await dismissCookieBanner(page);
  await dispatchInstallPrompt(page);
  await expectInstallCopy(page, "ar", cases.ar);

  const switcher = page.locator('[data-language-switcher="segmented"]').first();
  await switcher.getByRole("button", { name: "EN" }).click();
  await expect(page).toHaveURL(/\/en\/install-app$/);
  await expectInstallCopy(page, "en", cases.en);

  await switcher.getByRole("button", { name: "TR" }).click();
  await expect(page).toHaveURL(/\/tr\/install-app$/);
  await expectInstallCopy(page, "tr", cases.tr);

  await switcher.getByRole("button", { name: "AR" }).click();
  await expect(page).toHaveURL(/\/install-app$/);
  await expectInstallCopy(page, "ar", cases.ar);
  expect(await page.evaluate(() => window.installPromptCalls)).toBe(0);
  recordAssertions(testInfo, 40);
});

test("cookie settings mobile layouts remain in flow and clear of the Bottom Dock", async ({ page }, testInfo) => {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 700 },
    { width: 412, height: 732 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/tr/cookie-settings", { waitUntil: "networkidle" });
    const settingsPage = page.getByTestId("cookie-settings-page");
    await expect(settingsPage).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

    const back = page.getByTestId("cookie-settings-back");
    await back.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await expect(back).toBeInViewport();
    const dock = page.getByTestId("public-mobile-dock");
    if (await dock.isVisible().catch(() => false)) {
      const backBox = await back.boundingBox();
      const dockBox = await dock.boundingBox();
      expect(backBox.y + backBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    }
  }
  recordAssertions(testInfo, 12);
});

test("mobile Dock exposes exactly WhatsApp, AI Support, and Quick Navigation", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/", { waitUntil: "networkidle" });
  await dismissCookieBanner(page);
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

test("Chrome Custom Tab shows localized full-Chrome instructions without invoking install", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, "referrer", {
      configurable: true,
      get: () => "android-app://com.example.host",
    });
  });
  await page.goto("/en/install-app", { waitUntil: "networkidle" });
  await dismissCookieBanner(page);
  await dispatchInstallPrompt(page);
  await expect(page.getByTestId("install-custom-tab-instructions")).toContainText("Open this page in full Chrome");
  await expect(page.getByTestId("install-open-chrome")).toHaveText("Open in Chrome");
  await expect(page.getByTestId("install-app-action")).toHaveCount(0);
  expect(await page.getByTestId("install-app-page").innerText()).not.toMatch(arabicPattern);
  expect(await page.evaluate(() => window.installPromptCalls)).toBe(0);
  recordAssertions(testInfo, 5);
});

test("standalone mode reports the app as installed", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) =>
      query === "(display-mode: standalone)"
        ? {
            matches: true,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return true;
            },
          }
        : original(query);
  });
  await page.goto("/install-app", { waitUntil: "networkidle" });
  await dismissCookieBanner(page);
  await expect(page.getByTestId("install-app-status")).toContainText("التطبيق مثبت بالفعل");
  await expect(page.getByTestId("install-app-action")).toHaveCount(0);
  recordAssertions(testInfo, 2);
});
