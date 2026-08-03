import { test, expect } from "@playwright/test";
import { annotations, fixture, projectFixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test.describe.configure({ mode: "serial" });

function paths(project) {
  return [
    { language: "ar", url: `/${project.slug}`, copy: project.copies.ar },
    { language: "en", url: `/en/${project.slug}`, copy: project.copies.en },
    { language: "tr", url: `/tr/${project.slug}`, copy: project.copies.tr },
  ];
}

async function expectPublicState(request, project, status) {
  for (const route of paths(project)) {
    const response = await request.get(route.url);
    expect(response.status(), `${route.language}:${route.url}`).toBe(status);
    if (status === 200) expect(await response.text()).toContain(route.copy);
  }
}

test("real page builder persists draft, AR EN TR publish, version, restore, republish, unpublish, and final 404", async ({ request }, testInfo) => {
  const f = fixture();
  const project = projectFixture(f, testInfo);
  const admin = await token(request, f.accounts.employee);
  const versions = [];

  const initial = await rest(request, admin, `pages?id=eq.${project.page}&select=id,is_published,publishing_status`);
  expect(initial).toHaveLength(1);
  expect(initial[0].is_published).toBe(false);
  expect(initial[0].publishing_status).toBe("draft");
  await expectPublicState(request, project, 404);

  for (const route of paths(project)) {
    const result = await rpc(request, admin, "publish_page_builder_page", {
      p_page_id: project.page,
      p_language: route.language,
      p_notes: `closeout-${testInfo.project.name}-${route.language}`,
    });
    expect(result.sections).toBe(1);
    expect(result.version_id).toBeTruthy();
    versions.push(result.version_id);
  }

  const persistedVersions = await rest(request, admin, `version_history?id=in.(${versions.join(",")})&select=id,page_id,locale`);
  expect(persistedVersions).toHaveLength(3);
  expect(new Set(persistedVersions.map((row) => row.locale))).toEqual(new Set(["ar", "en", "tr"]));
  await expectPublicState(request, project, 200);

  const restored = await rpc(request, admin, "restore_page_version", { p_version_id: versions[0] });
  expect(restored.status).toBe("draft");
  const draftAfterRestore = await rest(request, admin, `pages?id=eq.${project.page}&select=is_published,publishing_status`);
  expect(draftAfterRestore[0]).toEqual({ is_published: false, publishing_status: "draft" });
  await expectPublicState(request, project, 404);

  for (const route of paths(project)) {
    const republished = await rpc(request, admin, "publish_page_builder_page", {
      p_page_id: project.page,
      p_language: route.language,
      p_notes: `republish-after-restore-${route.language}`,
    });
    expect(republished.sections).toBe(1);
  }
  await expectPublicState(request, project, 200);

  for (const route of paths(project)) {
    const result = await rpc(request, admin, "pr99_unpublish_page", {
      p_page_id: project.page,
      p_language: route.language,
    });
    expect(result.status).toBe("unpublished");
  }
  await expectPublicState(request, project, 404);
  const finalPage = await rest(request, admin, `pages?id=eq.${project.page}&select=is_published,publishing_status`);
  expect(finalPage[0].is_published).toBe(false);
  annotations(testInfo, 36);
});
