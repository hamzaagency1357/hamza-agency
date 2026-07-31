import path from "node:path";
import { test, expect } from "@playwright/test";
import { PRODUCTION_HOSTS } from "../../scripts/closeout/environment-guard.mjs";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const shortSha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);
const allowedExternalHosts = new Set(
  String(process.env.CLOSEOUT_ALLOWED_EXTERNAL_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const blockedActionPath = /\/(?:logout|accept-invitation|invite|auth\/callback)(?:\/|$)|[?&](?:token|code)=/i;

function assertSafeUrl(raw, context) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error(`${context} left HTTPS: ${url.href}`);
  if (PRODUCTION_HOSTS.has(url.hostname.toLowerCase())) throw new Error(`${context} reached Production: ${url.href}`);
  if (url.hostname.toLowerCase() !== expectedHost && !allowedExternalHosts.has(url.hostname.toLowerCase())) {
    throw new Error(`${context} reached a host outside the allowlist: ${url.href}`);
  }
  if (blockedActionPath.test(`${url.pathname}${url.search}`)) throw new Error(`${context} reached a state-changing action URL: ${url.href}`);
}

async function installReadonlyGuards(page) {
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) assertSafeUrl(frame.url(), "main document");
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) throw new Error(`Readonly closeout blocked ${method} ${url.href}`);
    if (request.isNavigationRequest()) assertSafeUrl(url.href, "navigation request");
    if (url.hostname.toLowerCase() !== expectedHost && !allowedExternalHosts.has(url.hostname.toLowerCase())) {
      throw new Error(`Network request reached a host outside the allowlist: ${url.href}`);
    }
    await route.continue();
  });
}

function screenshotName(locale, projectName) {
  const device = projectName.startsWith("mobile") ? "mobile" : "desktop";
  return path.join("artifacts", "safe", "screenshots", `public-${locale}-${device}-${shortSha}.png`);
}

for (const [route, locale] of [["/", "ar"], ["/en", "en"], ["/tr", "tr"]]) {
  test(`${locale} public runtime remains on the exact Preview host`, async ({ page }, testInfo) => {
    await installReadonlyGuards(page);
    const errors = [];
    const failed = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => failed.push(`${request.method()} ${request.url()}`));

    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} HTTP status`).toBeTruthy();
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);

    await page.screenshot({ path: screenshotName(locale, testInfo.project.name), fullPage: true, animations: "disabled" });
  });
}

test("public marketplace and status routes render read-only", async ({ page }) => {
  await installReadonlyGuards(page);
  for (const route of ["/marketplace", "/status"]) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} HTTP status`).toBeTruthy();
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    await expect(page.locator("body")).toBeVisible();
  }
});
