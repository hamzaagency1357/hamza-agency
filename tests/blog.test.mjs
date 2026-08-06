import test from "node:test";
import assert from "node:assert/strict";
import { getBlogPosts, getBlogPostBySlug } from "../lib/blog/posts.mjs";
import { getPreferredSiteLanguage } from "../lib/i18n/locale.ts";
import { normalizePublicPathname, stripLocalePrefix } from "../lib/i18n/publicLocales.ts";

test("returns published posts with pagination and search", () => {
  const result = getBlogPosts({ language: "ar", page: 1, perPage: 2 });
  assert.ok(result.posts.length <= 2);
  assert.ok(result.posts.every((post) => post.status === "published"));
  assert.equal(result.totalPages, 2);
});

test("allows previewing draft content", () => {
  const post = getBlogPostBySlug("plan-2026", { language: "ar", preview: true });
  assert.ok(post);
  assert.equal(post?.slug, "plan-2026");
});

test("prefers the stored language over browser preference", () => {
  const language = getPreferredSiteLanguage({ storedLanguage: "tr", acceptLanguage: "en-US,en;q=0.9" });
  assert.equal(language, "tr");
});

test("normalizes public paths and strips locale prefixes", () => {
  assert.equal(normalizePublicPathname("/blog//"), "/blog");
  assert.equal(stripLocalePrefix("/en/blog"), "/blog");
});
