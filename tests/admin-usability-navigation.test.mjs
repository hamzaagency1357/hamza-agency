import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedAdminLinks = [
  "/admin",
  "/admin/requests",
  "/admin/applications",
  "/admin/service-requests",
  "/admin/reviews",
  "/admin/contact",
  "/admin/notifications",
  "/admin/jobs",
  "/admin/programs",
  "/admin/blog",
  "/admin/pages",
  "/admin/sections",
  "/admin/page-builder",
  "/admin/media",
  "/admin/gallery",
  "/admin/announcements",
  "/admin/faqs",
  "/admin/success-stories",
  "/admin/translations",
  "/admin/translations/coverage",
  "/admin/translations/revisions",
  "/admin/translations/program-details",
  "/admin/translations/automation",
  "/admin/partners",
  "/admin/product-operations",
  "/admin/analytics",
  "/admin/product-expansion",
  "/admin/product-expansion/invitations",
  "/admin/permissions",
  "/admin/settings",
  "/admin/settings/homepage",
  "/admin/knowledge-base",
  "/admin/ai-support",
  "/admin/ai-settings",
  "/admin/ai-copilot",
  "/admin/product-analytics",
  "/admin/system-health",
  "/admin/activity-logs",
  "/admin/backups",
  "/admin/version-history",
  "/admin/export-center",
  "/admin/trash",
  "/admin/visual-experience",
  "/admin/white-label",
  "/admin/audit-mode",
  "/admin/launch-checklist",
];

const expectedGroups = ["العمل اليومي", "المحتوى", "الإدارة", "الإعدادات", "متقدم"];

async function readNavigationSource() {
  return readFile(new URL("../components/AdminQuickNav.tsx", import.meta.url), "utf8");
}

test("admin navigation preserves every existing capability route", async () => {
  const source = await readNavigationSource();
  const adminHrefs = [...source.matchAll(/href:\s*"(\/admin(?:\/[^\"]*)?)"/g)].map((match) => match[1]);

  assert.equal(adminHrefs.length, 46, "Admin navigation must keep exactly the 46 existing navigation entries");
  assert.deepEqual(new Set(adminHrefs), new Set(expectedAdminLinks));
});

test("admin navigation uses the five owner-approved usability groups", async () => {
  const source = await readNavigationSource();
  for (const group of expectedGroups) {
    assert.match(source, new RegExp(`title:\\s*"${group}"`));
  }
});

test("sensitive owner tools remain role-aware in navigation", async () => {
  const source = await readNavigationSource();
  for (const href of [
    "/admin/permissions",
    "/admin/system-health",
    "/admin/activity-logs",
    "/admin/backups",
    "/admin/trash",
    "/admin/visual-experience",
    "/admin/white-label",
    "/admin/audit-mode",
    "/admin/launch-checklist",
  ]) {
    const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(source, new RegExp(`href:\\s*"${escaped}"[^\\n]*superAdminOnly:\\s*true`));
  }
});
