import { test, expect } from "@playwright/test";
import { adminAction, annotations, fixture, projectFixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test.describe.configure({ mode: "serial" });

const stateByProject = new Map();

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

function projectState(testInfo) {
  return stateByProject.get(testInfo.project.name);
}

test("draft, localized publish, version persistence, and public rendering", async ({ request }, testInfo) => {
  const f = fixture();
  const project = projectFixture(f, testInfo);
  const admin = await token(request, f.accounts.employee);
  const versions = [];

  await test.step("prove initial draft and public 404 for AR EN TR", async () => {
    const initial = await rest(request, admin, `pages?id=eq.${project.page}&select=id,is_published,publishing_status`);
    expect(initial).toHaveLength(1);
    expect(initial[0].is_published).toBe(false);
    expect(initial[0].publishing_status).toBe("draft");
    await expectPublicState(request, project, 404);
  });

  await test.step("publish AR EN TR through the trusted Admin boundary and capture all version IDs", async () => {
    for (const route of paths(project)) {
      const result = await adminAction(request, admin, "pr116_admin_page_builder_publish", {
        args: {
          p_page_id: project.page,
          p_language: route.language,
          p_notes: `closeout-${testInfo.project.name}-${route.language}`,
        },
      });
      expect(result.sections).toBe(1);
      expect(result.version_id).toBeTruthy();
      versions.push(result.version_id);
    }
    expect(versions).toHaveLength(3);
  });

  await test.step("prove the three localized versions persisted", async () => {
    const persistedVersions = await rest(request, admin, `version_history?id=in.(${versions.join(",")})&select=id,page_id,locale`);
    expect(persistedVersions).toHaveLength(3);
    expect(new Set(persistedVersions.map((row) => row.locale))).toEqual(new Set(["ar", "en", "tr"]));
    expect(new Set(persistedVersions.map((row) => row.page_id))).toEqual(new Set([project.page]));
  });

  await test.step("prove public 200 and localized copy for AR EN TR", async () => {
    await expectPublicState(request, project, 200);
  });

  stateByProject.set(testInfo.project.name, { versions });
  annotations(testInfo, 18);
});

test("restore Arabic version, return to draft, republish, and render again", async ({ request }, testInfo) => {
  const f = fixture();
  const project = projectFixture(f, testInfo);
  const admin = await token(request, f.accounts.employee);
  const state = projectState(testInfo);
  expect(state?.versions).toHaveLength(3);

  await test.step("restore the Arabic version through its retained local database lifecycle contract", async () => {
    const restored = await rpc(request, admin, "restore_page_version", { p_version_id: state.versions[0] });
    expect(restored.status).toBe("draft");
  });

  await test.step("prove restore returned the page to draft and public 404", async () => {
    const draftAfterRestore = await rest(request, admin, `pages?id=eq.${project.page}&select=is_published,publishing_status`);
    expect(draftAfterRestore).toHaveLength(1);
    expect(draftAfterRestore[0]).toEqual({ is_published: false, publishing_status: "draft" });
    await expectPublicState(request, project, 404);
  });

  await test.step("republish AR EN TR through the trusted Admin boundary after restore", async () => {
    for (const route of paths(project)) {
      const republished = await adminAction(request, admin, "pr116_admin_page_builder_publish", {
        args: {
          p_page_id: project.page,
          p_language: route.language,
          p_notes: `republish-after-restore-${testInfo.project.name}-${route.language}`,
        },
      });
      expect(republished.sections).toBe(1);
      expect(republished.version_id).toBeTruthy();
    }
  });

  await test.step("prove republished public 200 for AR EN TR", async () => {
    await expectPublicState(request, project, 200);
  });

  annotations(testInfo, 14);
});

test("unpublish all locales and prove final database and public state", async ({ request }, testInfo) => {
  const f = fixture();
  const project = projectFixture(f, testInfo);
  const admin = await token(request, f.accounts.employee);

  await test.step("unpublish AR EN TR through the trusted Admin boundary", async () => {
    for (const route of paths(project)) {
      const result = await adminAction(request, admin, "pr116_admin_page_builder_unpublish", {
        args: {
          p_page_id: project.page,
          p_language: route.language,
        },
      });
      expect(result.status).toBe("unpublished");
    }
  });

  await test.step("prove final public 404 for AR EN TR", async () => {
    await expectPublicState(request, project, 404);
  });

  await test.step("prove final unpublished database state", async () => {
    const finalPage = await rest(request, admin, `pages?id=eq.${project.page}&select=is_published,publishing_status`);
    expect(finalPage).toHaveLength(1);
    expect(finalPage[0]).toEqual({ is_published: false, publishing_status: "unpublished" });
  });

  annotations(testInfo, 10);
});
