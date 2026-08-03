import path from "node:path";
import { test, expect } from "@playwright/test";
import { resolveNecessaryCookieConsent } from "./cookie-consent-helper.mjs";
import { installPreviewBypass } from "./preview-bypass.mjs";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const shortSha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);
const storageKey = "hamza_agency_cookie_consent";
const cases = {
  ar: { route: "/", dir: "rtl", title: "إعدادات الخصوصية وملفات الارتباط", labels: ["ضرورية", "تحليلات", "تفضيلات", "تسويق", "قبول الكل", "قبول المحدد", "الضرورية فقط", "إعدادات ملفات الارتباط", "سياسة ملفات الارتباط"], forbidden: ["Privacy and cookie settings", "Gizlilik ve çerez ayarları"] },
  en: { route: "/en", dir: "ltr", title: "Privacy and cookie settings", labels: ["Necessary", "Analytics", "Preferences", "Marketing", "Accept all", "Accept selected", "Necessary only", "Cookie settings", "Cookie policy"], forbidden: ["إعدادات الخصوصية وملفات الارتباط", "Gizlilik ve çerez ayarları"] },
  tr: { route: "/tr", dir: "ltr", title: "Gizlilik ve çerez ayarları", labels: ["Gerekli", "Analiz", "Tercihler", "Pazarlama", "Tümünü kabul et", "Seçilenleri kabul et", "Yalnızca gerekli", "Çerez ayarları", "Çerez politikası"], forbidden: ["إعدادات الخصوصية وملفات الارتباط", "Privacy and cookie settings"] },
};

function recordAssertions(testInfo, count) { testInfo.annotations.push({ type: "closeout-assertions", description: String(count) }); }
function screenshotName(prefix, locale, projectName, suffix = "") { const device = projectName.startsWith("mobile") ? "mobile" : "desktop"; return path.join("artifacts", "safe", "screenshots", `${prefix}-${locale}-${device}-${shortSha}${suffix ? `-${suffix}` : ""}.png`); }
async function freshConsent(page, route) { await page.goto(route, { waitUntil: "networkidle" }); await page.evaluate((key) => localStorage.removeItem(key), storageKey); await page.reload({ waitUntil: "networkidle" }); await expect(page.getByTestId("cookie-dialog")).toBeVisible(); }
function settingsButton(page, testInfo) { return page.getByTestId(testInfo.project.name.startsWith("mobile") ? "mobile-cookie-settings" : "cookie-settings-desktop"); }
function inside(box, viewport) { expect(box).toBeTruthy(); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1); }
function intersects(a, b) { return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y); }

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
    await expect(dialog).toHaveAttribute("dir", data.dir);
    await expect(dialog).toHaveAttribute("data-cookie-locale", locale);
    await expect(dialog.getByRole("heading", { name: data.title })).toBeVisible();
    for (const label of data.labels) await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible();
    const text = await dialog.innerText();
    for (const forbidden of data.forbidden) expect(text).not.toContain(forbidden);
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
    recordAssertions(testInfo, 19);
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

test("Android viewport geometry keeps privacy dialog, install card, and final content above dock", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 700 }, { width: 412, height: 732 }]) {
    await page.setViewportSize(viewport);
    await freshConsent(page, "/tr");
    await page.getByTestId("cookie-settings-toggle").click();
    inside(await page.getByTestId("cookie-dialog").boundingBox(), viewport);
    inside(await page.getByRole("heading", { name: cases.tr.title }).boundingBox(), viewport);
    inside(await page.getByTestId("cookie-necessary-only").boundingBox(), viewport);
    const geometry = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, top: document.querySelector('[data-testid="cookie-dialog-scroll"]')?.scrollTop || 0 }));
    expect(geometry.width).toBeLessThanOrEqual(geometry.client + 1);
    expect(geometry.top).toBe(0);
    await page.screenshot({ path: screenshotName("privacy-mobile-geometry", "tr", testInfo.project.name, String(viewport.width)), fullPage: false, animations: "disabled" });
    await page.getByTestId("cookie-necessary-only").click();
    await page.evaluate(() => { const event = new Event("beforeinstallprompt"); Object.defineProperty(event, "prompt", { value: async () => undefined }); Object.defineProperty(event, "userChoice", { value: Promise.resolve({ outcome: "accepted", platform: "web" }) }); window.dispatchEvent(event); });
    const card = await page.getByTestId("pwa-install-card").boundingBox();
    const copy = await page.getByTestId("pwa-install-copy").boundingBox();
    const action = await page.getByTestId("pwa-install-action").boundingBox();
    const dock = await page.getByTestId("public-mobile-dock").boundingBox();
    inside(card, viewport); expect(copy && action && dock).toBeTruthy(); expect(intersects(copy, action)).toBe(false); expect(card.y + card.height).toBeLessThanOrEqual(dock.y - 2);
    const clearance = await page.evaluate(() => { const dock = document.querySelector('[data-testid="public-mobile-dock"]'); const target = document.querySelector("footer") || document.querySelector("main"); return { actual: dock.getBoundingClientRect().height, measured: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--public-mobile-dock-height")), padding: parseFloat(getComputedStyle(target).paddingBottom) }; });
    expect(Math.abs(clearance.actual - clearance.measured)).toBeLessThanOrEqual(2);
    expect(clearance.padding).toBeGreaterThan(clearance.actual);
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  }
  recordAssertions(testInfo, 36);
});
