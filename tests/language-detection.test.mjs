import test from "node:test";
import assert from "node:assert/strict";
import { detectDeviceLanguage, isSearchCrawler, languageHomepage, resolveFirstVisitLanguage } from "../lib/i18n/firstVisitLanguage.mjs";

test("saved user selection wins on the language-neutral first visit", () => {
  assert.equal(resolveFirstVisitLanguage({ pathname: "/", savedLanguage: "tr", navigatorLanguages: ["en-US"], userAgent: "Mozilla/5.0" }), "tr");
});

test("explicit English and Turkish URLs are never redirected", () => {
  assert.equal(resolveFirstVisitLanguage({ pathname: "/en", savedLanguage: "tr", navigatorLanguages: ["tr-TR"], userAgent: "Mozilla/5.0" }), null);
  assert.equal(resolveFirstVisitLanguage({ pathname: "/tr/blog", savedLanguage: "en", navigatorLanguages: ["en-US"], userAgent: "Mozilla/5.0" }), null);
});

test("device language is used once when no preference exists", () => {
  assert.equal(resolveFirstVisitLanguage({ pathname: "/", navigatorLanguages: ["de-DE", "en-GB"], userAgent: "Mozilla/5.0" }), "en");
  assert.equal(resolveFirstVisitLanguage({ pathname: "/", navigatorLanguages: ["tr-TR"], userAgent: "Mozilla/5.0", alreadyResolved: true }), null);
});

test("Arabic is the default and deep links remain unchanged", () => {
  assert.equal(detectDeviceLanguage(["fr-FR"]), "ar");
  assert.equal(resolveFirstVisitLanguage({ pathname: "/contact", navigatorLanguages: ["tr-TR"], userAgent: "Mozilla/5.0" }), null);
  assert.equal(languageHomepage("ar"), "/");
});

test("search crawlers are excluded from first-visit redirects", () => {
  assert.equal(isSearchCrawler("Googlebot/2.1"), true);
  assert.equal(resolveFirstVisitLanguage({ pathname: "/", navigatorLanguages: ["en-US"], userAgent: "Googlebot/2.1" }), null);
});
