import { test, expect } from "@playwright/test";
import { annotate, evidence, openFixture, resetFixture } from "./pr99-fixture.mjs";

test("multilingual page lifecycle publishes, versions, restores, and unpublishes", async ({ page, request }, testInfo) => {
  await openFixture(page);
  for (const action of ["draft", "translations", "sections", "publish"]) await page.getByTestId(action).click();
  await expect(page.getByTestId("state")).toContainText('"status": "published"');
  await expect(page.getByTestId("state")).toContainText('"visible": false');
  for (const [url, copy] of [["/fixture-page", "محتوى عربي تجريبي"], ["/en/fixture-page", "Isolated English fixture content"], ["/tr/fixture-page", "Yalıtılmış Türkçe test içeriği"]]) {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(copy);
  }
  await page.getByTestId("restore").click();
  await expect(page.getByTestId("state")).toContainText('"status": "draft"');
  await page.getByTestId("publish").click();
  await page.getByTestId("unpublish").click();
  for (const url of ["/fixture-page", "/en/fixture-page", "/tr/fixture-page"]) expect((await request.get(url)).status()).toBe(404);
  await page.screenshot({ path: evidence(testInfo, "page-builder", "lifecycle"), fullPage: true, animations: "disabled" });
  await resetFixture(page);
  await annotate(testInfo, 15);
});
