import path from "node:path";
import { test, expect } from "@playwright/test";
import { buildUrlGuard, parseAllowedHosts } from "../../scripts/closeout/url-guard.mjs";
import { assertPreviewReadonlyRequest, previewRequestHeaders } from "./preview-bypass.mjs";

const targetUrl = new URL(process.env.CLOSEOUT_TARGET_URL);
const targetOrigin = targetUrl.origin;
const expectedHost = targetUrl.hostname.toLowerCase();
const shortSha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);
const allowedExternalHosts = parseAllowedHosts(process.env.CLOSEOUT_ALLOWED_EXTERNAL_HOSTS);
const assertSafeUrl = buildUrlGuard({ expectedHost, allowedExternalHosts });
const supabaseHost = "fvaurkfnsvsfohpzguho.supabase.co";
const languageCookieName = "hamza-agency-language";

async function installReadonlyGuards(page) {
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) assertSafeUrl(frame.url(), "main document");
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    assertPreviewReadonlyRequest({
      method,
      rawUrl: url.href,
      isNavigationRequest: request.isNavigationRequest(),
      expectedHost,
      supabaseHost,
      postData: request.postData() || "",
    });
    if (request.isNavigationRequest()) assertSafeUrl(url.href, "navigation request");
    if (url.hostname.toLowerCase() !== expectedHost && !allowedExternalHosts.includes(url.hostname.toLowerCase())) {
      throw new Error(`Network request reached a host outside the allowlist: ${url.href}`);
    }
    const headers = previewRequestHeaders({
      headers: request.headers(),
      host: url.hostname.toLowerCase(),
      expectedHost,
      bypassSecret: process.env.CLOSEOUT_VERCEL_BYPASS_SECRET,
    });
    await route.continue({ headers });
  });
}

const BLOCKED_VERCEL_TOOLBAR_URL = "https://vercel.live/_next-live/feedback/feedback.js";

function isIgnorableBlockedVercelToolbarFailure(request) {
  return request.method() === "GET"
    && !request.isNavigationRequest()
    && request.url() === BLOCKED_VERCEL_TOOLBAR_URL;
}

function isIgnorableRscPrefetchFailure(request) {
  const url = new URL(request.url());
  return request.method() === "GET"
    && !request.isNavigationRequest()
    && url.hostname.toLowerCase() === expectedHost
    && url.searchParams.has("_rsc");
}

function recordAssertions(testInfo, count) {
  testInfo.annotations.push({ type: "closeout-assertions", description: String(count) });
}

function screenshotName(locale, projectName) {
  const device = projectName.startsWith("mobile") ? "mobile" : "desktop";
  return path.join("artifacts", "safe", "screenshots", `public-${locale}-${device}-${shortSha}.png`);
}

async function setExplicitLanguage(context, language) {
  await context.addCookies([{
    name: languageCookieName,
    value: language,
    url: targetOrigin,
  }]);
}

function collectRuntimeFailures(page) {
  const errors = [];
  const failed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    if (!isIgnorableRscPrefetchFailure(request) && !isIgnorableBlockedVercelToolbarFailure(request)) {
      failed.push(`${request.method()} ${request.url()}`);
    }
  });
  return { errors, failed };
}

test("the blocked Vercel Toolbar request is ignored exactly, while every other vercel.live path remains a failure", ({}, testInfo) => {
  const request = (url) => ({
    method: () => "GET",
    isNavigationRequest: () => false,
    url: () => url,
  });

  expect(() => assertSafeUrl(BLOCKED_VERCEL_TOOLBAR_URL, "Toolbar request")).toThrow(/outside the allowlist/);
  expect(isIgnorableBlockedVercelToolbarFailure(request(BLOCKED_VERCEL_TOOLBAR_URL))).toBe(true);

  const otherVercelLiveUrl = "https://vercel.live/_next-live/feedback/other.js";
  expect(() => assertSafeUrl(otherVercelLiveUrl, "other vercel.live request")).toThrow(/outside the allowlist/);
  expect(isIgnorableBlockedVercelToolbarFailure(request(otherVercelLiveUrl))).toBe(false);
  recordAssertions(testInfo, 4);
});

for (const [route, locale] of [["/", "ar"], ["/en", "en"], ["/tr", "tr"]]) {
  test(`${locale} public runtime remains on the exact Preview host`, async ({ context, page }, testInfo) => {
    await setExplicitLanguage(context, locale);
    await installReadonlyGuards(page);
    const { errors, failed } = collectRuntimeFailures(page);

    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} HTTP status`).toBeTruthy();
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
    recordAssertions(testInfo, 6);

    await page.screenshot({ path: screenshotName(locale, testInfo.project.name), fullPage: true, animations: "disabled" });
  });
}

for (const { label, acceptLanguage, expectedPath, expectedLocale } of [
  { label: "EN", acceptLanguage: "en-US,en;q=0.9", expectedPath: "/en", expectedLocale: "en" },
  { label: "TR", acceptLanguage: "tr-TR,tr;q=0.9", expectedPath: "/tr", expectedLocale: "tr" },
  { label: "AR", acceptLanguage: "ar-SY,ar;q=0.9", expectedPath: "/", expectedLocale: "ar" },
]) {
  test(`${label} first visit resolves from Accept-Language`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: targetOrigin,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { "Accept-Language": acceptLanguage },
    });

    try {
      await context.clearCookies();
      const page = await context.newPage();
      await installReadonlyGuards(page);
      const { errors, failed } = collectRuntimeFailures(page);

      const response = await page.goto("/", { waitUntil: "networkidle" });
      expect(response?.ok(), `${label} first-visit HTTP status`).toBeTruthy();
      const resolvedUrl = new URL(page.url());
      expect(resolvedUrl.hostname.toLowerCase()).toBe(expectedHost);
      expect(resolvedUrl.pathname).toBe(expectedPath);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", expectedLocale);
      expect(errors).toEqual([]);
      expect(failed).toEqual([]);
      recordAssertions(testInfo, 7);
    } finally {
      await context.close();
    }
  });
}

test("public marketplace and status routes render read-only", async ({ page }, testInfo) => {
  await installReadonlyGuards(page);
  for (const route of ["/marketplace", "/status"]) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} HTTP status`).toBeTruthy();
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    await expect(page.locator("body")).toBeVisible();
  }
  recordAssertions(testInfo, 6);
});
