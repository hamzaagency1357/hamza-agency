import { test, expect } from "@playwright/test";
import { action, annotate, cleanupFixture, evidence, initializeFixture } from "./pr99-fixture.mjs";

test("multilingual page lifecycle publishes, versions, restores, and unpublishes", async ({ page, request }, testInfo) => {
  await initializeFixture(request);
  let state;
  for (const actionName of ["draft", "translations", "sections", "publish"]) state = (await action(request, actionName)).body.state;
  expect(state.page.status).toBe("published");
  expect(state.page.sections.some((section) => section.visible === false)).toBe(true);
  for (const [url, copy] of [["/fixture-page", "محتوى عربي تجريبي"], ["/en/fixture-page", "Isolated English fixture content"], ["/tr/fixture-page", "Yalıtılmış Türkçe test içeriği"]]) {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(copy);
  }
  expect((await action(request, "restore")).body.state.page.status).toBe("draft");
  await action(request, "publish");
  expect((await action(request, "unpublish")).body.state.page.status).toBe("unpublished");
  for (const url of ["/fixture-page", "/en/fixture-page", "/tr/fixture-page"]) expect((await request.get(url)).status()).toBe(404);
  await page.goto("/pr99-e2e", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: evidence(testInfo, "page-builder", "lifecycle"), fullPage: true, animations: "disabled" });
  await cleanupFixture(request);
  await annotate(testInfo, 15);
});
