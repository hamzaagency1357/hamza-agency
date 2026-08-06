import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { detectDeviceLanguage, isSearchCrawler, languageHomepage, parseAcceptLanguageHeader, resolveFirstVisitLanguage } from "../lib/i18n/firstVisitLanguage.mjs";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("stored selection marks first visit resolved without overriding explicit Arabic root", () => {
  assert.equal(resolveFirstVisitLanguage({ pathname: "/", savedLanguage: "tr", navigatorLanguages: ["en-US"], userAgent: "Mozilla/5.0" }), null);
  assert.equal(resolveFirstVisitLanguage({ pathname: "/", savedLanguage: "ar", navigatorLanguages: ["tr-TR"], userAgent: "Mozilla/5.0" }), null);
});

test("explicit localized URLs and deep links never redirect", () => {
  assert.equal(resolveFirstVisitLanguage({ pathname: "/en", savedLanguage: "tr", navigatorLanguages: ["tr-TR"], userAgent: "Mozilla/5.0" }), null);
  assert.equal(resolveFirstVisitLanguage({ pathname: "/tr/blog", navigatorLanguages: ["en-US"], userAgent: "Mozilla/5.0" }), null);
  assert.equal(resolveFirstVisitLanguage({ pathname: "/contact", navigatorLanguages: ["tr-TR"], userAgent: "Mozilla/5.0" }), null);
});

test("Accept-Language quality order selects a supported language on an unresolved visit", () => {
  const languages = parseAcceptLanguageHeader("de-DE;q=0.7, tr-TR;q=0.8, en-US;q=0.9, ar;q=0.4");
  assert.deepEqual(languages, ["en-US", "tr-TR", "de-DE", "ar"]);
  assert.equal(detectDeviceLanguage(languages), "en");
  assert.equal(resolveFirstVisitLanguage({ pathname: "/", navigatorLanguages: languages, userAgent: "Mozilla/5.0" }), "en");
});

test("unsupported device language defaults to Arabic", () => {
  assert.equal(detectDeviceLanguage(["fr-FR"]), "ar");
  assert.equal(languageHomepage("ar"), "/");
});

test("crawlers and preview agents are excluded", () => {
  for (const userAgent of ["Googlebot/2.1", "bingbot/2.0", "Lighthouse", "Twitterbot/1.0"]) {
    assert.equal(isSearchCrawler(userAgent), true);
    assert.equal(resolveFirstVisitLanguage({ pathname: "/", navigatorLanguages: ["en-US"], userAgent }), null);
  }
});

test("middleware redirects only an unresolved human first visit without loops", async () => {
  const [middleware, resolver] = await Promise.all([read("middleware.ts"), read("lib/i18n/firstVisitLanguage.mjs")]);
  for (const token of ["resolveFirstVisitRedirect", "parseAcceptLanguageHeader", "SITE_LANGUAGE_STORAGE_KEY", 'request.nextUrl.pathname !== "/"', 'language !== "en" && language !== "tr"', "NextResponse.redirect(redirectUrl, 307)"]) assert.ok(middleware.includes(token), token);
  assert.ok(resolver.includes("if (isSiteLanguage(savedLanguage)) return null"));
});
