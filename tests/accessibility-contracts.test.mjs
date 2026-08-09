import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public navigation and language dropdown expose accessible labels, state and targets", async () => {
  const [header, switcher, footer, breadcrumbs] = await Promise.all([read("components/PublicGlobalHeader.tsx"), read("components/LanguageSwitcher.tsx"), read("components/PublicFooterLinks.tsx"), read("components/PublicBreadcrumbs.tsx")]);
  assert.ok(header.includes("aria-label={t.navLabel}"));
  assert.ok(header.includes("aria-current"));
  assert.ok(header.includes("focus-visible:ring-2"));
  assert.ok(switcher.includes('aria-haspopup="menu"'));
  assert.ok(switcher.includes("aria-expanded={open}"));
  assert.ok(switcher.includes('role="menu"'));
  assert.ok(switcher.includes('role="menuitemradio"'));
  assert.ok(switcher.includes("aria-checked={code===activeLanguage}"));
  assert.ok(switcher.includes("aria-label={ariaLabels[activeLanguage]}"));
  assert.ok(switcher.includes("min-h-10"));
  assert.ok(switcher.includes("min-h-11"));
  assert.ok(switcher.includes("focus-visible:ring-2"));
  assert.ok(footer.includes("<footer"));
  assert.ok(footer.includes('data-testid="public-footer-links"'));
  assert.ok(breadcrumbs.includes('aria-label="Breadcrumb"'));
});

test("blog includes labeled search, status messaging, loading, empty, and error states", async () => {
  const [blog, loading, error, manager] = await Promise.all([read("app/blog/page.tsx"), read("app/blog/loading.tsx"), read("app/blog/error.tsx"), read("components/AdminBlogManager.tsx")]);
  assert.ok(blog.includes('role="search"'));
  assert.ok(blog.includes('type="search"'));
  assert.ok(blog.includes("result.labels.noResults"));
  assert.ok(loading.includes('aria-busy="true"'));
  assert.ok(error.includes("reset"));
  assert.ok(manager.includes('role="status"'));
  assert.ok(manager.includes('role="tablist"'));
});
