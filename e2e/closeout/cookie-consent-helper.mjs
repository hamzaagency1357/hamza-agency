import { expect } from "@playwright/test";

async function waitForConsentHydration(page) {
  const banner = page.getByTestId("cookie-banner");
  await expect
    .poll(async () => {
      if (await banner.isVisible().catch(() => false)) return "banner";
      return page.evaluate(() => {
        const root = document.documentElement;
        const hydratedFromStoredDecision =
          root.dataset.consentAnalytics !== undefined &&
          root.dataset.consentPreferences !== undefined &&
          root.dataset.consentMarketing !== undefined;
        return hydratedFromStoredDecision ? "stored" : "pending";
      });
    })
    .not.toBe("pending");
}

async function expectBodyScrollAvailable(page) {
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .not.toBe("hidden");
}

export async function resolveNecessaryCookieConsent(
  page,
  { verifyPersistence = false } = {}
) {
  const banner = page.getByTestId("cookie-banner");

  await waitForConsentHydration(page);
  const bannerWasVisible = await banner.isVisible().catch(() => false);

  if (bannerWasVisible) {
    await expectBodyScrollAvailable(page);
    await page.getByTestId("cookie-necessary-only").click();
    await expect(banner).toBeHidden();
  }

  await expectBodyScrollAvailable(page);

  if (verifyPersistence) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForConsentHydration(page);
    await expect(banner).toBeHidden();
    await expectBodyScrollAvailable(page);
  }

  return bannerWasVisible;
}
