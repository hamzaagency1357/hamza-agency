import { expect } from "@playwright/test";

async function waitForConsentHydration(page) {
  const backdrop = page.getByTestId("cookie-backdrop");
  await expect.poll(async () => {
    if (await backdrop.isVisible().catch(() => false)) return "dialog";
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
  await expect.poll(() => page.evaluate(() => document.body.style.overscrollBehavior)).not.toBe("none");
}

export async function resolveNecessaryCookieConsent(page, { verifyPersistence = false } = {}) {
  const backdrop = page.getByTestId("cookie-backdrop");
  const dialog = page.getByTestId("cookie-dialog");

  await waitForConsentHydration(page);

  const dialogWasVisible = await backdrop.isVisible().catch(() => false);
  if (dialogWasVisible) {
    await expect(dialog).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.getByTestId("cookie-necessary-only").click();
    await expect(backdrop).toBeHidden();
    await expect(dialog).toBeHidden();
    await expectBodyScrollRestored(page);
  }

  if (verifyPersistence) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForConsentHydration(page);
    await expect(backdrop).toBeHidden();
    await expectBodyScrollRestored(page);
  }

  return dialogWasVisible;
}
