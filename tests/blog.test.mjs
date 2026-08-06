import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getBlogPosts, getBlogPostBySlug, getBlogFeed } from "../lib/blog/posts.mjs";

test("does not expose editorial templates as published content", () => {
  const result = getBlogPosts({ language: "ar", page: 1, perPage: 6 });
  assert.equal(result.posts.length, 0);
  assert.equal(result.total, 0);
  assert.equal(getBlogFeed("ar").length, 0);
});

test("allows administrators to preview draft templates", () => {
  const post = getBlogPostBySlug("editorial-plan", { language: "ar", preview: true });
  assert.ok(post);
  assert.equal(post?.slug, "editorial-plan");
  assert.equal(post?.status, "draft");
});

test("supports preview search, taxonomy filters, and pagination", () => {
  const searched = getBlogPosts({ language: "en", search: "operations", preview: true });
  assert.ok(searched.posts.length >= 1);
  const filtered = getBlogPosts({ language: "tr", category: "planning", preview: true });
  assert.equal(filtered.posts.length, 1);
  const paged = getBlogPosts({ language: "ar", page: 2, perPage: 1, preview: true });
  assert.equal(paged.page, 2);
  assert.equal(paged.posts.length, 1);
});

test("blog route registry includes localized index, articles, and RSS", async () => {
  const source = await readFile(new URL("../lib/i18n/publicLocales.ts", import.meta.url), "utf8");
  assert.ok(source.includes('"/blog"'));
  assert.ok(source.includes("blogArticlePathPattern"));
  assert.ok(source.includes('publicPath === "/blog/rss"'));
  assert.ok(source.includes("getBlogSlugFromPath"));
});
