import { test, expect } from "@playwright/test";
import { annotations, fixture, rpc, token } from "./real-runtime-helper.mjs";

test.describe.configure({ mode: "serial" });

test("real page builder publishes AR EN TR, versions, restores, republishes, and unpublishes", async ({ request }, testInfo) => {
  const f = fixture();
  const admin = await token(request, f.accounts.employee);
  const versions = [];

  for (const language of ["ar", "en", "tr"]) {
    const result = await rpc(request, admin, "publish_page_builder_page", {
      p_page_id: f.core.page,
      p_language: language,
      p_notes: `closeout-${language}`,
    });
    expect(result.sections).toBe(1);
    expect(result.version_id).toBeTruthy();
    versions.push(result.version_id);
  }

  for (const [url, copy] of [
    ["/fixture-page", "محتوى عربي حقيقي من قاعدة البيانات"],
    ["/en/fixture-page", "Real English database content"],
    ["/tr/fixture-page", "Gerçek Türkçe veritabanı içeriği"],
  ]) {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(copy);
  }

  const restored = await rpc(request, admin, "restore_page_version", { p_version_id: versions[0] });
  expect(restored.status).toBe("draft");
  const republished = await rpc(request, admin, "publish_page_builder_page", {
    p_page_id: f.core.page,
    p_language: "ar",
    p_notes: "republish-after-restore",
  });
  expect(republished.sections).toBe(1);

  for (const language of ["ar", "en", "tr"]) {
    const result = await rpc(request, admin, "pr99_unpublish_page", {
      p_page_id: f.core.page,
      p_language: language,
    });
    expect(result.status).toBe("unpublished");
  }
  annotations(testInfo, 18);
});
