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

async function readMobileNavigationSource() {
  return readFile(new URL("../components/AdminMobileNavigation.tsx", import.meta.url), "utf8");
}

async function readDashboardSource() {
  return readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
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

test("mobile drawer preserves all 46 routes and role-aware items", async () => {
  const source = await readMobileNavigationSource();
  const adminHrefs = [...source.matchAll(/href:\s*"(\/admin(?:\/[^\"]*)?)"/g)].map((match) => match[1]);

  assert.equal(adminHrefs.length, 46, "Mobile navigation must keep exactly the same 46 navigation entries");
  assert.deepEqual(new Set(adminHrefs), new Set(expectedAdminLinks));

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

test("mobile drawer groups are collapsible, accessible and active-group aware", async () => {
  const source = await readMobileNavigationSource();

  assert.ok(source.includes('"العمل اليومي": true'), "Daily-work group must be open by default");
  assert.ok(source.includes("activeGroupTitle"), "Current-route group must be detected");
  assert.ok(source.includes("setExpandedGroups"), "Group state must remain presentation-only");
  assert.ok(source.includes("aria-expanded={expanded}"));
  assert.ok(source.includes("aria-controls={panelId}"));
  assert.ok(source.includes('role="region"'));
  assert.ok(source.includes('aria-label="إغلاق قائمة لوحة التحكم"'));
  assert.ok(source.includes('document.body.style.overflow = "hidden"'));
});

test("mobile menu uses in-flow bar and legacy floating trigger is suppressed", async () => {
  const mobileSource = await readMobileNavigationSource();
  const shellSource = await readFile(new URL("../components/AdminShell.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/admin/admin-usability.css", import.meta.url), "utf8");

  assert.ok(mobileSource.includes('data-testid="admin-mobile-bar"'));
  assert.ok(mobileSource.includes('data-testid="admin-mobile-menu-trigger"'));
  assert.ok(!mobileSource.includes("fixed bottom-"));
  assert.ok(shellSource.includes("<AdminMobileNavigation />"));
  assert.ok(shellSource.includes("data-admin-workspace"));
  assert.ok(cssSource.includes('button[aria-controls="admin-mobile-navigation"]'));
  assert.ok(cssSource.includes("display: none !important"));
});

test("owner dashboard keeps the approved operations-center hierarchy and guidance", async () => {
  const source = await readDashboardSource();

  for (const token of [
    'data-testid="admin-summary-cards"',
    'data-testid="admin-recent-applications"',
    'data-testid="admin-quick-actions"',
    'data-testid="admin-guidance"',
    "مرحبًا، لوحة تحكم",
    "واجهة منظمة لمساعدتك على إدارة أعمالك اليومية بكفاءة وسهولة.",
    "أحدث طلبات الانضمام",
    "إجراءات سريعة",
    "مسار العمل اليومي",
    "ما الذي تريدين إنجازه اليوم؟",
  ]) {
    assert.ok(source.includes(token), token);
  }

  for (const card of [
    "طلبات الانضمام",
    "طلبات الخدمات",
    "التقييمات",
    "البرامج",
    "المحتوى",
    "مهام تحتاج انتباهك",
  ]) {
    assert.ok(source.includes(`title="${card}"`), card);
  }

  assert.ok(source.includes('getCount("blog_posts")') || source.includes('"blog_posts"'));
  assert.ok(source.includes('href="/admin/notifications"'));
  assert.ok(source.includes('href="/admin/contact"'));
  assert.ok(source.includes("بحث في طلبات الانضمام"));
  assert.ok(source.includes('className="divide-y divide-white/[0.06] md:hidden"'));
});

test("mobile summary density stays responsive without changing dashboard data", async () => {
  const cssSource = await readFile(new URL("../app/admin/admin-usability.css", import.meta.url), "utf8");

  assert.ok(cssSource.includes('@media (min-width: 375px) and (max-width: 639px)'));
  assert.ok(cssSource.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
  assert.ok(cssSource.includes("@media (max-width: 374px)"));
  assert.ok(cssSource.includes("grid-template-columns: minmax(0, 1fr)"));
  assert.ok(cssSource.includes('[data-testid="admin-summary-cards"]'));
});

test("public cookie consent never covers admin controls", async () => {
  const source = await readFile(new URL("../components/CookieConsent.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('startsWith("/admin")'));
  assert.ok(source.includes('if(isAdminPath||surface!=="banner")return null'));
});
