import { expect } from "@playwright/test";

async function waitForConsentHydration(page) {
  const banner = page.getByTestId("cookie-banner");
  const dialog = page.getByTestId("cookie-dialog");
  await expect.poll(async () => {
    if (await banner.isVisible().catch(() => false)) return "banner";
    if (await dialog.isVisible().catch(() => false)) return "dialog";
    return page.evaluate(() => {
      const root = document.documentElement;
      const hydratedFromStoredDecision =
        root.dataset.consentAnalytics !== undefined &&
        root.dataset.consentPreferences !== undefined &&
        root.dataset.consentMarketing !== undefined;
      return hydratedFromStoredDecision ? "stored" : "pending";
    });
  }).not.toBe("pending");
}

async function expectBodyScrollRestored(page) {
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
}

export async function resolveNecessaryCookieConsent(page, { verifyPersistence = false } = {}) {
  const banner = page.getByTestId("cookie-banner");
  const dialog = page.getByTestId("cookie-dialog");
  const backdrop = page.getByTestId("cookie-backdrop");

  await waitForConsentHydration(page);
  const bannerWasVisible = await banner.isVisible().catch(() => false);
  const dialogWasVisible = await dialog.isVisible().catch(() => false);

  if (bannerWasVisible) {
    await expect(backdrop).toHaveCount(0);
    await expectBodyScrollRestored(page);
    await page.getByTestId("cookie-necessary-only").click();
    await expect(banner).toBeHidden();
  } else if (dialogWasVisible) {
    await page.getByTestId("cookie-necessary-only").click();
    await expect(dialog).toBeHidden();
    await expect(backdrop).toBeHidden();
  }

  await expectBodyScrollRestored(page);

  if (verifyPersistence) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForConsentHydration(page);
    await expect(banner).toBeHidden();
    await expect(dialog).toBeHidden();
    await expect(backdrop).toBeHidden();
    await expectBodyScrollRestored(page);
  }

  return bannerWasVisible || dialogWasVisible;
}
