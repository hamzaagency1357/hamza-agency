import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("cookie settings use normal pages and preserve the consent contract", () => {
  const consent = read("components/CookieConsent.tsx");
  const settings = read("components/CookieSettingsPage.tsx");
  const storage = read("lib/cookieConsent.ts");
  const footer = read("components/PublicFooterLinks.tsx");
  const locales = read("lib/i18n/publicLocales.ts");
  const css = read("app/owner-final-qa.css");

  assert.match(locales, /"\/cookie-settings"/);
  for (const path of [
    "app/cookie-settings/page.tsx",
    "app/en/cookie-settings/page.tsx",
    "app/tr/cookie-settings/page.tsx",
  ]) {
    assert.ok(fs.existsSync(path), `${path} must exist`);
  }

  assert.match(consent, /localizePublicHref\("\/cookie-settings", locale\)/);
  assert.match(footer, /localizePublicHref\("\/cookie-settings", language\)/);
  assert.doesNotMatch(consent, /createPortal|role="dialog"|cookie-dialog|cookie-backdrop|focusable\(|body\.style\.overflow|\.inert|aria-hidden/);
  assert.doesNotMatch(css, /hamza-cookie-backdrop|hamza-cookie-dialog|hamza-cookie-preferences-open|hamza-cookie-consent-portal/);

  assert.match(storage, /hamza_agency_cookie_consent/);
  assert.match(storage, /COOKIE_CONSENT_VERSION = "1\.0"/);
  assert.match(storage, /necessary: true/);
  assert.match(settings, /role="status"/);
  assert.match(settings, /const optionalCategories = \[/);
  assert.match(settings, /"analytics"/);
  assert.match(settings, /"preferences"/);
  assert.match(settings, /"marketing"/);
  assert.match(settings, /data-testid=\{`cookie-settings-choice-\$\{key\}`\}/);
  assert.match(settings, /cookie-settings-save-selected/);
  assert.match(settings, /cookie-settings-accept-all/);
  assert.match(settings, /cookie-settings-necessary-only/);
});

test("Install App localization is URL-owned without optimistic language selection", () => {
  const install = read("components/InstallAppPage.tsx");
  const switcher = read("components/LanguageSwitcher.tsx");
  const copy = read("lib/i18n/privacyAndPwaCopy.ts");

  assert.match(install, /const language = useSiteLanguage\(\)/);
  assert.match(install, /data-install-locale=\{language\}/);
  assert.doesNotMatch(install, /function InstallAppPage\(\{ language \}/);

  assert.match(switcher, /const activeLanguage = getPathLanguage\(pathname \|\| "\/"\)/);
  assert.doesNotMatch(switcher, /setActiveLanguage|setStoredSiteLanguage/);
  assert.match(switcher, /router\.replace/);
  assert.match(switcher, /useTransition/);

  for (const path of [
    "app/install-app/page.tsx",
    "app/en/install-app/page.tsx",
    "app/tr/install-app/page.tsx",
  ]) {
    assert.doesNotMatch(read(path), /language="(?:ar|en|tr)"/);
  }

  const englishBlock = copy.match(/en: \{[\s\S]*?\n  \},\n  tr:/)?.[0] || "";
  const turkishBlock = copy.match(/tr: \{[\s\S]*?\n  \},\n\};/)?.[0] || "";
  assert.doesNotMatch(englishBlock, /[\u0600-\u06ff]/);
  assert.doesNotMatch(turkishBlock, /[\u0600-\u06ff]/);
});
