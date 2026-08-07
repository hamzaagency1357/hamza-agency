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

test.describe.configure({ mode: "default" });

async function installReadonlyGuards(page, { onNavigationRequestHeaders } = {}) {
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
    const requestHeaders = await request.allHeaders();
    const headers = previewRequestHeaders({
      headers: requestHeaders,
      host: url.hostname.toLowerCase(),
      expectedHost,
      bypassSecret: process.env.CLOSEOUT_VERCEL_BYPASS_SECRET,
    });
    if (request.isNavigationRequest()) onNavigationRequestHeaders?.(headers);
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

function primaryLanguageTag(value) {
  return value?.split(",")[0]?.trim().toLowerCase() ?? null;
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

function isMainDocumentNavigation(request, page) {
  return request.isNavigationRequest()
    && request.resourceType() === "document"
    && request.frame() === page.mainFrame();
}

function isNavigationReplacementError(errorText) {
  return /net::ERR_ABORTED|navigation (?:was )?replaced|document replacement|redirect cancellation/i.test(errorText ?? "");
}

function navigationUrlsMatch(failedUrl, successfulUrl) {
  const failed = new URL(failedUrl);
  const successful = new URL(successfulUrl);
  return failed.href === successful.href
    || (failed.origin === successful.origin && failed.pathname === successful.pathname && failed.search === successful.search);
}

function unresolvedNavigationFailures({
  pendingNavigationFailures,
  successfulDocumentUrls,
  finalUrl,
  expectedPath,
  expectedLocale,
  actualLocale,
}) {
  const final = new URL(finalUrl);
  const finalStateMatches = final.hostname.toLowerCase() === expectedHost
    && final.pathname === expectedPath
    && actualLocale === expectedLocale;

  return pendingNavigationFailures.filter((failure) => {
    if (!finalStateMatches || !isNavigationReplacementError(failure.errorText)) return true;
    return !successfulDocumentUrls.some((successfulUrl) => navigationUrlsMatch(failure.url, successfulUrl));
  });
}

function formatRequestFailure({ method, url, resourceType, errorText }) {
  return `${method} ${url} [${resourceType}]${errorText ? ` ${errorText}` : ""}`;
}

function collectRuntimeFailures(page) {
  const errors = [];
  const failed = [];
  const pendingNavigationFailures = [];
  const successfulDocumentUrls = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    const request = response.request();
    if (response.ok() && isMainDocumentNavigation(request, page)) {
      successfulDocumentUrls.push(response.url());
    }
  });
  page.on("requestfailed", (request) => {
    if (isIgnorableRscPrefetchFailure(request) || isIgnorableBlockedVercelToolbarFailure(request)) return;

    const failure = {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText ?? null,
    };

    if (isMainDocumentNavigation(request, page) && isNavigationReplacementError(failure.errorText)) {
      pendingNavigationFailures.push(failure);
      return;
    }

    failed.push(formatRequestFailure(failure));
  });

  function finalizeNavigationFailures({ expectedPath, expectedLocale, actualLocale }) {
    const unresolved = unresolvedNavigationFailures({
      pendingNavigationFailures,
      successfulDocumentUrls,
      finalUrl: page.url(),
      expectedPath,
      expectedLocale,
      actualLocale,
    });
    failed.push(...unresolved.map(formatRequestFailure));
    pendingNavigationFailures.length = 0;
  }

  return { errors, failed, finalizeNavigationFailures };
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

test("replaced document navigation failures resolve only after a matching successful document response", ({}, testInfo) => {
  const abortedDocument = {
    url: `${targetOrigin}/en`,
    method: "GET",
    resourceType: "document",
    errorText: "net::ERR_ABORTED",
  };
  const finalState = {
    finalUrl: `${targetOrigin}/en`,
    expectedPath: "/en",
    expectedLocale: "en",
    actualLocale: "en",
  };

  expect(unresolvedNavigationFailures({
    pendingNavigationFailures: [abortedDocument],
    successfulDocumentUrls: [`${targetOrigin}/en`],
    ...finalState,
  })).toEqual([]);

  for (const errorText of ["net::ERR_NAME_NOT_RESOLVED", "net::ERR_CERT_AUTHORITY_INVALID", "net::ERR_CONNECTION_REFUSED"]) {
    expect(unresolvedNavigationFailures({
      pendingNavigationFailures: [{ ...abortedDocument, errorText }],
      successfulDocumentUrls: [`${targetOrigin}/en`],
      ...finalState,
    })).toHaveLength(1);
  }

  expect(unresolvedNavigationFailures({
    pendingNavigationFailures: [abortedDocument],
    successfulDocumentUrls: [],
    ...finalState,
  })).toHaveLength(1);
  recordAssertions(testInfo, 5);
});

for (const [route, locale] of [["/", "ar"], ["/en", "en"], ["/tr", "tr"]]) {
  test(`${locale} public runtime remains on the exact Preview host`, async ({ context, page }, testInfo) => {
    await setExplicitLanguage(context, locale);
    await installReadonlyGuards(page);
    const { errors, failed, finalizeNavigationFailures } = collectRuntimeFailures(page);

    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} HTTP status`).toBeTruthy();
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    finalizeNavigationFailures({
      expectedPath: route,
      expectedLocale: locale,
      actualLocale: await page.locator("html").getAttribute("lang"),
    });
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
    recordAssertions(testInfo, 6);

    await page.screenshot({ path: screenshotName(locale, testInfo.project.name), fullPage: true, animations: "disabled" });
  });
}

for (const { label, locale, acceptLanguage, expectedPath, expectedLocale } of [
  { label: "EN", locale: "en-US", acceptLanguage: "en-US,en;q=0.9", expectedPath: "/en", expectedLocale: "en" },
  { label: "TR", locale: "tr-TR", acceptLanguage: "tr-TR,tr;q=0.9", expectedPath: "/tr", expectedLocale: "tr" },
  { label: "AR", locale: "ar-SY", acceptLanguage: "ar-SY,ar;q=0.9", expectedPath: "/", expectedLocale: "ar" },
]) {
  test(`${label} first visit resolves from Accept-Language`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: targetOrigin,
      ignoreHTTPSErrors: true,
      locale,
      extraHTTPHeaders: { "Accept-Language": acceptLanguage },
    });

    try {
      await context.clearCookies();
      const page = await context.newPage();
      let firstNavigationAcceptLanguage = null;
      await installReadonlyGuards(page, {
        onNavigationRequestHeaders: (headers) => {
          firstNavigationAcceptLanguage ??= headers["accept-language"] ?? null;
        },
      });
      const { errors, failed, finalizeNavigationFailures } = collectRuntimeFailures(page);

      const response = await page.goto("/", { waitUntil: "networkidle" });
      expect(primaryLanguageTag(firstNavigationAcceptLanguage)).toBe(locale.toLowerCase());
      expect(response?.ok(), `${label} first-visit HTTP status`).toBeTruthy();
      const resolvedUrl = new URL(page.url());
      expect(resolvedUrl.hostname.toLowerCase()).toBe(expectedHost);
      expect(resolvedUrl.pathname).toBe(expectedPath);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", expectedLocale);
      finalizeNavigationFailures({
        expectedPath,
        expectedLocale,
        actualLocale: await page.locator("html").getAttribute("lang"),
      });
      expect(errors).toEqual([]);
      expect(failed).toEqual([]);
      recordAssertions(testInfo, 8);
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
