import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("localized unknown public paths are allowed to reach App Router not-found", () => {
  const middleware = read("middleware.ts");

  assert.ok(middleware.includes("localizedReservedPathPattern"));
  assert.ok(
    middleware.includes("localizedReservedPathPattern.test(publicPath)"),
  );
  assert.equal(
    middleware.includes(
      'if (hasLocalePrefix && !isSupportedPublicPath(publicPath)) {\n    const fallbackUrl',
    ),
    false,
  );
});

test("localized reserved paths keep the existing safe locale-root fallback", () => {
  const middleware = read("middleware.ts");

  for (const reserved of [
    "admin",
    "api",
    "_next",
    "login",
    "portal",
    "reset-password",
    "robots\\.txt",
    "sitemap\\.xml",
    "manifest\\.webmanifest",
    "opengraph-image",
  ]) {
    assert.ok(middleware.includes(reserved), reserved);
  }
  assert.ok(
    middleware.includes(
      "fallbackUrl.pathname = `/${localizedPath.language}`;",
    ),
  );
});

test("localized not-found UI preserves AR EN TR copy and direction contract", () => {
  const notFound = read("app/not-found.tsx");
  const layout = read("app/layout.tsx");

  assert.ok(notFound.includes('title: "الصفحة غير موجودة"'));
  assert.ok(notFound.includes('title: "Page not found"'));
  assert.ok(notFound.includes('title: "Sayfa bulunamadı"'));
  assert.ok(notFound.includes("getRequestSiteContext"));
  assert.ok(layout.includes("lang={siteContext.language}"));
  assert.ok(layout.includes("dir={siteContext.direction}"));
});

test("representative valid localized routes remain supported", () => {
  const locales = read("lib/i18n/publicLocales.ts");

  assert.ok(locales.includes('"/about"'));
  assert.ok(locales.includes('const localizedPrefixPattern = /^\\/(en|tr)'));
});
