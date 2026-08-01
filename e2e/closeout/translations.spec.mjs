import path from "node:path";
import { test, expect } from "@playwright/test";
import { installPreviewBypass } from "./preview-bypass.mjs";

const expectedHost = new URL(process.env.CLOSEOUT_TARGET_URL).hostname.toLowerCase();
const shortSha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);

test.beforeEach(async ({ page }) => installPreviewBypass(page, expectedHost));

function recordAssertions(testInfo, count) {
  testInfo.annotations.push({ type: "closeout-assertions", description: String(count) });
}

function screenshotName(locale, projectName) {
  const device = projectName.startsWith("mobile") ? "mobile" : "desktop";
  return path.join("artifacts", "safe", "screenshots", `translations-${locale}-${device}-${shortSha}.png`);
}

for (const [route, locale] of [["/", "ar"], ["/en", "en"], ["/tr", "tr"]]) {
  test(`${locale} owns document metadata and language runtime`, async ({ page }, testInfo) => {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();
    expect(new URL(page.url()).hostname.toLowerCase()).toBe(expectedHost);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(new URL(canonical).pathname).toBe(new URL(page.url()).pathname);
    recordAssertions(testInfo, 8);
    await page.screenshot({ path: screenshotName(locale, testInfo.project.name), fullPage: true, animations: "disabled" });
  });
}
