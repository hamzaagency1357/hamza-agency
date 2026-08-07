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
  return /^(?:net::ERR_ABORTED|navigation (?:was )?replaced|document replacement|redirect cancellation)$/i.test(errorText?.trim() ?? "");
}

function normalizedNavigationUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.hash = "";
  return url.href;
}

function navigationUrlsMatch(firstUrl, secondUrl) {
  return normalizedNavigationUrl(firstUrl) === normalizedNavigationUrl(secondUrl);
}

function failureCanEnterNavigationReconciliation(failure) {
  const url = new URL(failure.url);
  return failure.inNavigationWindow
    && failure.method === "GET"
    && !failure.hasPostData
    && (failure.resourceType === "fetch" || failure.resourceType === "document")
    && url.origin === targetOrigin
    && !url.searchParams.has("_rsc")
    && isNavigationReplacementError(failure.errorText);
}

function unresolvedNavigationFailures({
  pendingNavigationFailures,
  successfulDocumentUrls,
  gotoResponseUrl,
  gotoResponseOk,
  finalUrl,
  expectedPath,
  expectedLocale,
  actualLocale,
  bodyVisible,
  pageErrors,
}) {
  const final = new URL(finalUrl);
  const expectedUrl = new URL(expectedPath, targetOrigin).href;
  const finalStateMatches = gotoResponseOk
    && bodyVisible
    && pageErrors.length === 0
    && final.origin === targetOrigin
    && final.pathname === expectedPath
    && actualLocale === expectedLocale;

  return pendingNavigationFailures.filter((failure) => {
    if (!finalStateMatches || !failureCanEnterNavigationReconciliation(failure)) return true;

    const matchesNavigationTarget = navigationUrlsMatch(failure.url, final.href)
      || navigationUrlsMatch(failure.url, expectedUrl);
    if (!matchesNavigationTarget) return true;

    const hasMatchingSuccessfulDocument = successfulDocumentUrls.some((successfulUrl) => (
      navigationUrlsMatch(failure.url, successfulUrl)
      && navigationUrlsMatch(successfulUrl, final.href)
    ));
    if (!hasMatchingSuccessfulDocument) return true;

    return !gotoResponseUrl || !navigationUrlsMatch(gotoResponseUrl, final.href);
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
  let navigationTransaction = null;

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    const request = response.request();
    if (response.status() >= 400) {
      failed.push(`${request.method()} ${response.url()} [${request.resourceType()}] HTTP ${response.status()}`);
      return;
    }
    if (response.status() >= 200 && response.status() < 300 && isMainDocumentNavigation(request, page)) {
      successfulDocumentUrls.push(response.url());
    }
  });
  page.on("requestfailed", (request) => {
    if (isIgnorableRscPrefetchFailure(request) || isIgnorableBlockedVercelToolbarFailure(request)) return;

    const headers = request.headers();
    const failure = {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      isNavigationRequest: request.isNavigationRequest(),
      isMainFrame: request.frame() === page.mainFrame(),
      errorText: request.failure()?.errorText ?? null,
      hasPostData: Boolean(request.postData()),
      inNavigationWindow: Boolean(navigationTransaction),
      expectedNavigationUrl: navigationTransaction?.expectedUrl ?? null,
      hasRscQuery: new URL(request.url()).searchParams.has("_rsc"),
      hasNextRouterHeaders: Boolean(headers.rsc || headers["next-router-state-tree"] || headers["next-url"]),
      redirectedFrom: request.redirectedFrom()?.url() ?? null,
      redirectedTo: request.redirectedTo()?.url() ?? null,
    };

    if (failureCanEnterNavigationReconciliation(failure)) {
      pendingNavigationFailures.push(failure);
      return;
    }

    failed.push(formatRequestFailure(failure));
  });

  function beginNavigation(expectedPath) {
    if (navigationTransaction) throw new Error("A navigation evidence transaction is already active.");
    navigationTransaction = { expectedUrl: new URL(expectedPath, targetOrigin).href };
  }

  function finalizeNavigationEvidence({
    response,
    expectedPath,
    expectedLocale,
    actualLocale,
    bodyVisible,
  }) {
    if (!navigationTransaction) throw new Error("No navigation evidence transaction is active.");
    navigationTransaction = null;

    const unresolved = unresolvedNavigationFailures({
      pendingNavigationFailures,
      successfulDocumentUrls,
      gotoResponseUrl: response?.url() ?? null,
      gotoResponseOk: response?.ok() ?? false,
      finalUrl: page.url(),
      expectedPath,
      expectedLocale,
      actualLocale,
      bodyVisible,
      pageErrors: errors,
    });
    failed.push(...unresolved.map(formatRequestFailure));
    pendingNavigationFailures.length = 0;
    successfulDocumentUrls.length = 0;
  }

  return { errors, failed, beginNavigation, finalizeNavigationEvidence };
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

test("aborted navigation fetch evidence reconciles narrowly and every real network failure stays fail-closed", ({}, testInfo) => {
  const expectedUrl = `${targetOrigin}/en`;
  const baseFailure = {
    url: expectedUrl,
    method: "GET",
    resourceType: "fetch",
    errorText: "net::ERR_ABORTED",
    hasPostData: false,
    inNavigationWindow: true,
  };
  const finalState = {
    successfulDocumentUrls: [expectedUrl],
    gotoResponseUrl: expectedUrl,
    gotoResponseOk: true,
    finalUrl: expectedUrl,
    expectedPath: "/en",
    expectedLocale: "en",
    actualLocale: "en",
    bodyVisible: true,
    pageErrors: [],
  };
  const unresolved = (failure, overrides = {}) => unresolvedNavigationFailures({
    pendingNavigationFailures: [failure],
    ...finalState,
    ...overrides,
  });

  expect(unresolved(baseFailure)).toEqual([]);
  expect(unresolved({ ...baseFailure, url: `${targetOrigin}/tr` })).toHaveLength(1);
  expect(unresolved(baseFailure, { successfulDocumentUrls: [] })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, method: "POST", hasPostData: true })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, hasPostData: true })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, url: "https://example.com/en" })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, inNavigationWindow: false })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, resourceType: "script" })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, resourceType: "image" })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, resourceType: "font" })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, url: `${targetOrigin}/api/health` })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, url: `${targetOrigin}/en`, errorText: "net::ERR_NAME_NOT_RESOLVED" })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, errorText: "net::ERR_CERT_AUTHORITY_INVALID" })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, errorText: "net::ERR_CONNECTION_REFUSED" })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, errorText: "net::ERR_CONNECTION_RESET" })).toHaveLength(1);
  expect(unresolved({ ...baseFailure, errorText: "net::ERR_TIMED_OUT" })).toHaveLength(1);
  expect(unresolved(baseFailure, { gotoResponseOk: false })).toHaveLength(1);
  expect(unresolved(baseFailure, { actualLocale: "ar" })).toHaveLength(1);
  expect(unresolved(baseFailure, { bodyVisible: false })).toHaveLength(1);
  expect(unresolved(baseFailure, { pageErrors: ["runtime error"] })).toHaveLength(1);
  recordAssertions(testInfo, 20);
});

for (const [route, locale] of [["/", "ar"], ["/en", "en"], ["/tr", "tr"]]) {
  test(`${locale} public runtime remains on the exact Preview host`, async ({ context, page }, testInfo) => {
    await setExplicitLanguage(context, locale);
    await installReadonlyGuards(page);
    const { errors, failed, beginNavigation, finalizeNavigationEvidence } = collectRuntimeFailures(page);

    beginNavigation(route);
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} HTTP status`).toBeTruthy();
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    finalizeNavigationEvidence({
      response,
      expectedPath: route,
      expectedLocale: locale,
      actualLocale: await page.locator("html").getAttribute("lang"),
      bodyVisible: await page.locator("body").isVisible(),
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
      const { errors, failed, beginNavigation, finalizeNavigationEvidence } = collectRuntimeFailures(page);

      beginNavigation(expectedPath);
      const response = await page.goto("/", { waitUntil: "networkidle" });
      expect(primaryLanguageTag(firstNavigationAcceptLanguage)).toBe(locale.toLowerCase());
      expect(response?.ok(), `${label} first-visit HTTP status`).toBeTruthy();
      const resolvedUrl = new URL(page.url());
      expect(resolvedUrl.hostname.toLowerCase()).toBe(expectedHost);
      expect(resolvedUrl.pathname).toBe(expectedPath);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", expectedLocale);
      finalizeNavigationEvidence({
        response,
        expectedPath,
        expectedLocale,
        actualLocale: await page.locator("html").getAttribute("lang"),
        bodyVisible: await page.locator("body").isVisible(),
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
