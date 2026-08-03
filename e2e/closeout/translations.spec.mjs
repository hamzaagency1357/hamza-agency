import path from "node:path";
import { test, expect } from "@playwright/test";
import { resolveNecessaryCookieConsent } from "./cookie-consent-helper.mjs";
import { installPreviewBypass } from "./preview-bypass.mjs";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const shortSha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);
const storageKey = "hamza_agency_cookie_consent";
const cases = {
  ar: {
    route: "/",
    dir: "rtl",
    title: "إعدادات الخصوصية وملفات الارتباط",
    lead: "نساعد صناع المحتوى على تطوير حضورهم وتحسين فرص النجاح على منصات البث والتواصل.",
    programs: "البرامج المتاحة",
    join: "انضم الآن",
    labels: ["ضرورية", "تحليلات", "تفضيلات", "تسويق", "قبول الكل", "قبول المحدد", "الضرورية فقط", "إعدادات ملفات الارتباط", "سياسة ملفات الارتباط"],
    forbidden: ["Privacy and cookie settings", "Gizlilik ve çerez ayarları"],
  },
  en: {
    route: "/en",
    dir: "ltr",
    title: "Privacy and cookie settings",
    lead: "We help creators grow their presence and opportunities across live-streaming and social platforms.",
    programs: "Available programs",
    join: "Join now",
    labels: ["Necessary", "Analytics", "Preferences", "Marketing", "Accept all", "Accept selected", "Necessary only", "Cookie settings", "Cookie policy"],
    forbidden: ["إعدادات الخصوصية وملفات الارتباط", "Gizlilik ve çerez ayarları"],
  },
  tr: {
    route: "/tr",
    dir: "ltr",
    title: "Gizlilik ve çerez ayarları",
    lead: "İçerik üreticilerinin canlı yayın ve sosyal platformlarda büyümesine destek oluyoruz.",
    programs: "Mevcut programlar",
    join: "Şimdi katıl",
    labels: ["Gerekli", "Analiz", "Tercihler", "Pazarlama", "Tümünü kabul et", "Seçilenleri kabul et", "Yalnızca gerekli", "Çerez ayarları", "Çerez politikası"],
    forbidden: ["إعدادات الخصوصية وملفات الارتباط", "Privacy and cookie settings"],
  },
};

const mobileProfiles = [
  { name: "android-360x640", width: 360, height: 640, locale: "ar" },
  { name: "android-360x740", width: 360, height: 740, locale: "tr" },
  { name: "android-390x700", width: 390, height: 700, locale: "ar" },
  { name: "android-390x780", width: 390, height: 780, locale: "tr" },
  { name: "android-412x732", width: 412, height: 732, locale: "ar" },
  { name: "chrome-custom-tab-390x520", width: 390, height: 520, locale: "tr", customTab: true },
];

function recordAssertions(testInfo, count) { testInfo.annotations.push({ type: "closeout-assertions", description: String(count) }); }
function screenshotName(prefix, locale, projectName, suffix = "") { const device = projectName.startsWith("mobile") ? "mobile" : "desktop"; return path.join("artifacts", "safe", "screenshots", `${prefix}-${locale}-${device}-${shortSha}${suffix ? `-${suffix}` : ""}.png`); }
async function freshConsent(page, route) { await page.goto(route, { waitUntil: "networkidle" }); await page.evaluate((key) => localStorage.removeItem(key), storageKey); await page.reload({ waitUntil: "networkidle" }); await expect(page.getByTestId("cookie-dialog")).toBeVisible(); }
function settingsButton(page, testInfo) { return page.getByTestId(testInfo.project.name.startsWith("mobile") ? "mobile-cookie-settings" : "cookie-settings-desktop"); }
function inside(box, viewport, tolerance = 1) { expect(box).toBeTruthy(); expect(box.x).toBeGreaterThanOrEqual(-tolerance); expect(box.y).toBeGreaterThanOrEqual(-tolerance); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + tolerance); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + tolerance); }
function intersects(a, b) { return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y); }
async function horizontalOverflow(page) { return page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })); }
async function settleLayout(page) { await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }

async function dispatchInstallPrompt(page) {
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt");
    Object.defineProperty(event, "prompt", { value: async () => undefined });
    Object.defineProperty(event, "userChoice", { value: Promise.resolve({ outcome: "accepted", platform: "web" }) });
    window.dispatchEvent(event);
  });
  await expect(page.getByTestId("pwa-install-card")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await installPreviewBypass(page, expectedHost);
  await page.route("**/api/product-expansion/consent", (route) => route.fulfill({ status: 204, body: "" }));
});

for (const [locale, data] of Object.entries(cases)) {
  test(`${locale} owns document metadata and language runtime`, async ({ page }, testInfo) => {
    const response = await page.goto(data.route, { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    await resolveNecessaryCookieConsent(page);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical).pathname).toBe(new URL(page.url()).pathname);
    recordAssertions(testInfo, 8);
    await page.screenshot({ path: screenshotName("translations", locale, testInfo.project.name), fullPage: true, animations: "disabled" });
  });

  test(`${locale} privacy settings use URL locale without language leakage`, async ({ page }, testInfo) => {
    await freshConsent(page, data.route);
    await page.getByTestId("cookie-settings-toggle").click();
    const dialog = page.getByTestId("cookie-dialog");
    const scroll = page.getByTestId("cookie-dialog-scroll");
    await expect(dialog).toHaveAttribute("dir", data.dir);
    await expect(dialog).toHaveAttribute("data-cookie-locale", locale);
    await expect(dialog.getByRole("heading", { name: data.title })).toBeVisible();
    for (const label of data.labels) await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible();
    const text = await dialog.innerText();
    for (const forbidden of data.forbidden) expect(text).not.toContain(forbidden);
    await scroll.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    const next = locale === "ar" ? "en" : locale === "en" ? "tr" : "ar";
    await page.evaluate(() => { window.cookieClientNavigationProof = "preserved"; });
    const localeLink = dialog.getByTestId(`cookie-locale-${next}`);
    await localeLink.focus();
    await expect(localeLink).toBeFocused();
    await localeLink.press("Enter");
    await page.waitForURL((url) => url.pathname === cases[next].route);
    expect(await page.evaluate(() => window.cookieClientNavigationProof)).toBe("preserved");
    await expect(dialog).toHaveAttribute("data-cookie-locale", next);
    await expect(dialog.getByRole("heading", { name: cases[next].title })).toBeVisible();
    await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBe(0);
    recordAssertions(testInfo, 20);
    await page.screenshot({ path: screenshotName("privacy-localization", next, testInfo.project.name), fullPage: false, animations: "disabled" });
  });
}

test("privacy decisions persist and localized policy remains reachable", async ({ page }, testInfo) => {
  await freshConsent(page, "/tr");
  await page.getByTestId("cookie-necessary-only").click();
  await expect(page.getByTestId("cookie-dialog")).toBeHidden();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("cookie-dialog")).toBeHidden();
  await settingsButton(page, testInfo).click();
  await page.getByTestId("cookie-choice-analytics").check();
  await page.getByTestId("cookie-accept-selected").click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({ analytics: true, preferences: false, marketing: false });
  await settingsButton(page, testInfo).click();
  await page.getByTestId("cookie-accept-all").click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)).toMatchObject({ analytics: true, preferences: true, marketing: true });
  await settingsButton(page, testInfo).click();
  await page.getByTestId("cookie-policy-link").click();
  await page.waitForURL((url) => url.pathname === "/tr/cookie-policy");
  await expect(page.getByRole("heading", { name: "Çerez politikası" })).toBeVisible();
  recordAssertions(testInfo, 12);
});

test("Android and Chrome Custom Tab geometry isolates consent and keeps PWA and final content clear of the Dock", async ({ page }, testInfo) => {
  for (const profile of mobileProfiles) {
    const viewport = { width: profile.width, height: profile.height };
    await page.setViewportSize(viewport);
    const data = cases[profile.locale];
    await freshConsent(page, data.route);
    await page.getByTestId("cookie-settings-toggle").click();
    await settleLayout(page);

    const backdrop = page.getByTestId("cookie-backdrop");
    const dialog = page.getByTestId("cookie-dialog");
    const scroll = page.getByTestId("cookie-dialog-scroll");
    const title = dialog.getByRole("heading", { name: data.title });
    const lastAction = page.getByTestId("cookie-settings-toggle");
    const backdropBox = await backdrop.boundingBox();
    const visualViewport = await page.evaluate(() => ({
      top: Math.round(window.visualViewport?.offsetTop ?? 0),
      left: Math.round(window.visualViewport?.offsetLeft ?? 0),
      width: Math.round(window.visualViewport?.width ?? window.innerWidth),
      height: Math.round(window.visualViewport?.height ?? window.innerHeight),
    }));

    expect(backdropBox).toBeTruthy();
    expect(Math.abs(backdropBox.x - visualViewport.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.y - visualViewport.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.width - visualViewport.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.height - visualViewport.height)).toBeLessThanOrEqual(1);
    inside(await dialog.boundingBox(), viewport);
    inside(await title.boundingBox(), viewport);
    inside(await lastAction.boundingBox(), viewport);

    const localeBoxes = await Promise.all(["ar", "en", "tr"].map((locale) => page.getByTestId(`cookie-locale-${locale}`).boundingBox()));
    expect(localeBoxes.every(Boolean)).toBe(true);
    expect(Math.max(...localeBoxes.map((box) => box.y)) - Math.min(...localeBoxes.map((box) => box.y))).toBeLessThanOrEqual(2);

    const topLayer = await page.evaluate(() => {
      const viewport = window.visualViewport;
      const x = Math.max(1, Math.min(window.innerWidth - 1, Math.round((viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) / 2)));
      const y = Math.max(1, Math.round((viewport?.offsetTop ?? 0) + 1));
      return document.elementFromPoint(x, y)?.closest('[data-testid="cookie-backdrop"],[data-testid="cookie-dialog"]')?.getAttribute("data-testid") || null;
    });
    expect(["cookie-backdrop", "cookie-dialog"]).toContain(topLayer);

    const backgroundIsolation = await page.locator(".hamza-global-header").evaluate((header) => {
      const owner = Array.from(document.body.children).find((child) => child === header || child.contains(header));
      return owner instanceof HTMLElement
        ? { inert: owner.inert, ariaHidden: owner.getAttribute("aria-hidden"), pointerEvents: getComputedStyle(owner).pointerEvents }
        : null;
    });
    expect(backgroundIsolation).toEqual({ inert: true, ariaHidden: "true", pointerEvents: "none" });
    expect(await scroll.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");

    const scrollGeometry = await scroll.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
    if (profile.customTab) {
      expect(scrollGeometry.scrollHeight).toBeGreaterThan(scrollGeometry.clientHeight);
      await scroll.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
      expect(await scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    }

    const overflowWithDialog = await horizontalOverflow(page);
    expect(overflowWithDialog.width).toBeLessThanOrEqual(overflowWithDialog.client + 1);
    if (profile.customTab && testInfo.project.name.startsWith("mobile")) {
      await page.screenshot({ path: screenshotName("privacy-custom-tab-geometry", profile.locale, testInfo.project.name, `${profile.width}x${profile.height}`), fullPage: false, animations: "disabled" });
    }

    await page.getByTestId("cookie-necessary-only").click();
    await dispatchInstallPrompt(page);
    await settleLayout(page);

    const card = page.getByTestId("pwa-install-card");
    const copy = page.getByTestId("pwa-install-copy");
    const action = page.getByTestId("pwa-install-action");
    const dock = page.getByTestId("public-mobile-dock");
    const hero = page.locator("main section").first();
    const heroDescription = hero.getByText(data.lead, { exact: true });
    const heroCta = hero.getByRole("button", { name: data.join }).first();
    const cardBox = await card.boundingBox();
    const copyBox = await copy.boundingBox();
    const actionBox = await action.boundingBox();
    const dockBox = await dock.boundingBox();
    const heroDescriptionBox = await heroDescription.boundingBox();
    const heroCtaBox = await heroCta.boundingBox();

    inside(cardBox, viewport);
    expect(copyBox && actionBox && dockBox && heroDescriptionBox && heroCtaBox).toBeTruthy();
    expect(await card.evaluate((element) => getComputedStyle(element).position)).toBe("relative");
    expect(intersects(copyBox, actionBox)).toBe(false);
    expect(intersects(cardBox, heroDescriptionBox)).toBe(false);
    expect(intersects(cardBox, heroCtaBox)).toBe(false);
    expect(intersects(cardBox, dockBox)).toBe(false);
    const copyClipping = await copy.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
    expect(copyClipping.scrollHeight).toBeLessThanOrEqual(copyClipping.clientHeight + 1);
    expect(copyClipping.scrollWidth).toBeLessThanOrEqual(copyClipping.clientWidth + 1);

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await settleLayout(page);
    const finalDockBox = await dock.boundingBox();
    const semanticFooter = page.locator("footer").last();
    const contentEnd = await semanticFooter.count() ? semanticFooter : page.locator('[data-support-availability="approved"]').last();
    const contentEndBox = await contentEnd.boundingBox();
    const programsHeading = page.getByRole("heading", { name: data.programs }).first();
    const programsBox = await programsHeading.boundingBox();
    const clearance = await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="public-mobile-dock"]');
      const spacer = document.querySelector('[data-testid="public-mobile-dock-clearance"]');
      if (!(dock instanceof HTMLElement) || !(spacer instanceof HTMLElement)) return null;
      return {
        actual: dock.getBoundingClientRect().height,
        measured: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--public-mobile-dock-height")),
        spacer: spacer.getBoundingClientRect().height,
      };
    });

    expect(finalDockBox && contentEndBox && programsBox && clearance).toBeTruthy();
    expect(contentEndBox.y + contentEndBox.height).toBeLessThanOrEqual(finalDockBox.y - 2);
    expect(intersects(programsBox, finalDockBox)).toBe(false);
    expect(Math.abs(clearance.actual - clearance.measured)).toBeLessThanOrEqual(2);
    expect(clearance.spacer).toBeGreaterThan(clearance.actual);
    const overflowAtBottom = await horizontalOverflow(page);
    expect(overflowAtBottom.width).toBeLessThanOrEqual(overflowAtBottom.client + 1);
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  }
  recordAssertions(testInfo, mobileProfiles.length * 31);
});

test("desktop consent and install prompt retain non-overlapping geometry", async ({ page }, testInfo) => {
  const viewport = { width: 1280, height: 800 };
  await page.setViewportSize(viewport);
  await freshConsent(page, cases.en.route);
  await page.getByTestId("cookie-settings-toggle").click();
  inside(await page.getByTestId("cookie-backdrop").boundingBox(), viewport);
  inside(await page.getByTestId("cookie-dialog").boundingBox(), viewport);
  const topLayer = await page.evaluate(() => document.elementFromPoint(window.innerWidth / 2, 1)?.closest('[data-testid="cookie-backdrop"],[data-testid="cookie-dialog"]')?.getAttribute("data-testid") || null);
  expect(["cookie-backdrop", "cookie-dialog"]).toContain(topLayer);
  await page.getByTestId("cookie-necessary-only").click();
  await dispatchInstallPrompt(page);
  const card = page.getByTestId("pwa-install-card");
  const copy = await page.getByTestId("pwa-install-copy").boundingBox();
  const action = await page.getByTestId("pwa-install-action").boundingBox();
  expect(await card.evaluate((element) => getComputedStyle(element).position)).toBe("relative");
  expect(copy && action).toBeTruthy();
  expect(intersects(copy, action)).toBe(false);
  const desktopCardBox = await card.boundingBox();
  inside(desktopCardBox, viewport);
  const hero = page.locator("main section").first();
  const heroDescription = await hero.getByText(cases.en.lead, { exact: true }).boundingBox();
  const heroCta = await hero.getByRole("button", { name: cases.en.join }).first().boundingBox();
  expect(heroDescription && heroCta).toBeTruthy();
  expect(intersects(desktopCardBox, heroDescription)).toBe(false);
  expect(intersects(desktopCardBox, heroCta)).toBe(false);
  const overflow = await horizontalOverflow(page);
  expect(overflow.width).toBeLessThanOrEqual(overflow.client + 1);
  recordAssertions(testInfo, 12);
});
