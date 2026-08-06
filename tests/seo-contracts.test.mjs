import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public SEO includes canonical, hreflang, Open Graph, and Twitter contracts", async () => {
  const [metadata, locales, sitemap, robots] = await Promise.all([read("lib/i18n/serverPublicMetadata.ts"), read("lib/i18n/publicLocales.ts"), read("app/sitemap.ts"), read("app/robots.ts")]);
  for (const token of ["canonical", "languages", "openGraph", "twitter", "googleBot"]) assert.ok(metadata.includes(token), `missing metadata token: ${token}`);
  for (const token of ['"x-default"', "getLanguageAlternates", '"/blog"', "getBlogSlugFromPath"]) assert.ok(locales.includes(token), `missing locale token: ${token}`);
  assert.ok(sitemap.includes("getServerBlogFeed"));
  assert.ok(sitemap.includes("PROGRAM_SLUGS"));
  assert.ok(robots.includes("/sitemap.xml"));
  assert.ok(robots.includes('"/admin/"'));
});

test("blog articles provide Article and Breadcrumb structured data", async () => {
  const [articlePage, structuredData] = await Promise.all([read("app/blog/[slug]/page.tsx"), read("components/StructuredData.tsx")]);
  assert.ok(articlePage.includes('"@type": "Article"'));
  assert.ok(articlePage.includes("generateMetadata"));
  assert.ok(articlePage.includes("getLanguageAlternates"));
  assert.ok(structuredData.includes('"@type": "BreadcrumbList"'));
  assert.ok(structuredData.includes('"@type": "Organization"'));
});

test("approved agent identity is separated between public display and SEO", async () => {
  const [header, metadata, structuredData] = await Promise.all([read("components/PublicGlobalHeader.tsx"), read("lib/i18n/serverPublicMetadata.ts"), read("components/StructuredData.tsx")]);
  assert.ok(header.includes("⚔عܓོراب✴سܓོوريا⚔"));
  assert.ok(header.includes("بإدارة الوكيل عراب سوريا"));
  assert.ok(metadata.includes('"عراب سوريا"'));
  assert.ok(structuredData.includes('"HAMZA AGENCY"'));
});
