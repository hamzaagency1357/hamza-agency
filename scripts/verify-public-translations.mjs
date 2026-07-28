import { readFile } from "node:fs/promises";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  runtimeDictionary,
  publicLocales,
  publicSeo,
  serverMetadata,
  middleware,
  languageSwitcher,
  runtimeTranslator,
  cmsTranslations,
  announcement,
  marketingSafety,
  homePage,
  contactUi,
  ownerQaCss,
  rootLayout,
] = await Promise.all([
  readProjectFile("lib/i18n/siteRuntimeTranslations.ts"),
  readProjectFile("lib/i18n/publicLocales.ts"),
  readProjectFile("lib/i18n/publicSeo.ts"),
  readProjectFile("lib/i18n/serverPublicMetadata.ts"),
  readProjectFile("middleware.ts"),
  readProjectFile("components/LanguageSwitcher.tsx"),
  readProjectFile("components/PublicSiteRuntimeTranslator.tsx"),
  readProjectFile("components/CmsPublishedTranslations.tsx"),
  readProjectFile("components/PublishedAnnouncementBar.tsx"),
  readProjectFile("lib/i18n/marketingSafety.ts"),
  readProjectFile("app/page.tsx"),
  readProjectFile("components/ContactStaticUi.tsx"),
  readProjectFile("app/owner-final-qa.css"),
  readProjectFile("app/layout.tsx"),
]);

const errors = [];
const arabicPattern = /[\u0600-\u06ff]/;
const normalize = (value) =>
  value.replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
const entryPattern =
  /^\s*\["((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\],?\s*$/gm;
const entries = [];
let match;

while ((match = entryPattern.exec(runtimeDictionary)) !== null) {
  entries.push({ source: match[1], en: match[2], tr: match[3] });
}

if (entries.length < 300) {
  errors.push(`Expected at least 300 translation entries, found ${entries.length}.`);
}

for (const entry of entries) {
  const source = normalize(entry.source);
  const en = normalize(entry.en);
  const tr = normalize(entry.tr);
  if (!source || !en || !tr) {
    errors.push(`Empty translation field: ${source || "<empty>"}`);
  }
  if (arabicPattern.test(en)) {
    errors.push(`English translation contains Arabic: ${source}`);
  }
  if (arabicPattern.test(tr)) {
    errors.push(`Turkish translation contains Arabic: ${source}`);
  }
  if (/Localized content is being updated/i.test(tr)) {
    errors.push(`Turkish translation contains temporary English copy: ${source}`);
  }
}

const requiredRoutes = [
  "/",
  "/about",
  "/apply",
  "/programs",
  "/services",
  "/digital-services",
  "/service-request",
  "/service-status",
  "/application-status",
  "/jobs",
  "/reviews",
  "/success-stories",
  "/partners",
  "/gallery",
  "/knowledge-center",
  "/faq",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
  "/ai-policy",
  "/ai-support",
];

for (const route of requiredRoutes) {
  const routeToken = route === "/" ? '"/": {' : `"${route}": {`;
  if (!runtimeDictionary.includes(routeToken)) {
    errors.push(`Localized route metadata missing: ${route}`);
  }
  if (!publicSeo.includes(routeToken)) {
    errors.push(`Arabic SEO entry missing: ${route}`);
  }
  if (!publicLocales.includes(`"${route}"`)) {
    errors.push(`Locale route registry missing: ${route}`);
  }
}

for (const slug of ["tiktok", "bigo-live", "yaahlan", "xena", "catchii"]) {
  const token = slug.includes("-") ? `"${slug}": {` : `${slug}: {`;
  if (!runtimeDictionary.includes(token)) {
    errors.push(`Program metadata translation missing: ${slug}`);
  }
  if (!publicLocales.includes(`"${slug}"`)) {
    errors.push(`Program locale route missing: ${slug}`);
  }
}

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      errors.push(`${label} is missing: ${token}`);
    }
  }
}

requireTokens("Route-preserving language switcher", languageSwitcher, [
  "localizePublicPath(pathname, nextLanguage)",
  "window.location.search",
  "window.location.hash",
  "data-language-switcher-location=\"header\"",
  "hamza-inline-language-host",
]);
if (/\bfixed\b/.test(languageSwitcher)) {
  errors.push("Language switcher still contains fixed positioning.");
}
if (languageSwitcher.includes("scopeCopy")) {
  errors.push("Floating language explanation copy is still present.");
}

requireTokens("Locale middleware", middleware, [
  "NextResponse.rewrite",
  "x-site-locale",
  "isSupportedPublicPath",
]);
requireTokens("Server locale metadata", serverMetadata, [
  "canonical",
  "getLanguageAlternates",
  "openGraph",
  "twitter",
]);

requireTokens("Public placeholder guard", runtimeTranslator, [
  "PLACEHOLDER_PATTERNS",
  "isInternalPlaceholder",
  "SAFE_UNMATCHED_COPY",
]);

if (cmsTranslations.includes("HomeHeroBrandLine")) {
  errors.push("The duplicate home hero brand line is still implemented.");
}
requireTokens("Single home hero title", cmsTranslations, [
  'sourceKey === "home-hero" && field === "title"',
  "return null",
]);

requireTokens("Localized ticker", announcement, [
  'sourceType: "announcements"',
  "hasCompletePublishedTranslation",
  "hamza-marquee-group",
  "hamzaAnnouncementLtr",
  "hamzaAnnouncementRtl",
  "translate3d(-50%",
  "✦",
]);

const approvedSupportCopy = [
  "نستقبل رسائلكم وطلباتكم على مدار الساعة، وسيتم الرد عليكم في أقرب وقت ممكن.",
  "We receive your messages and requests around the clock and will respond as soon as possible.",
  "Mesajlarınızı ve taleplerinizi günün her saati alıyor ve en kısa sürede yanıtlıyoruz.",
];
for (const copy of approvedSupportCopy) {
  if (!contactUi.includes(copy)) {
    errors.push(`Approved support copy missing: ${copy}`);
  }
}

requireTokens("Owner-managed number preservation", marketingSafety, [
  "Numeric values are intentionally excluded",
  '["24/7 دعم ومتابعة", "24/7 دعم ومتابعة"]',
  '["50+ فرصة نجاح شهرية", "50+ فرصة نجاح شهرية"]',
  '["500+ فرصة نجاح شهرية", "500+ فرصة نجاح شهرية"]',
]);
if (/\(\?:50\|500\).*opportunit/.test(marketingSafety)) {
  errors.push("Numeric owner values are still blocked by the marketing gate.");
}
if (/\\b24\\s\*\\\/\\s\*7/.test(marketingSafety)) {
  errors.push("24/7 is still blocked by the marketing gate.");
}
if (!homePage.includes("home_stat_${index + 1}_number")) {
  errors.push("Home statistics are no longer sourced from settings/CMS.");
}

requireTokens("Responsive visual QA", ownerQaCss, [
  "@media (max-width: 1024px)",
  ".hamza-inline-language-host",
  ".hamza-floating-whatsapp",
  ".hamza-ai-support",
  ".hamza-quick-nav",
  "public-quick-nav-open",
  "public-ai-support-open",
  "overflow-x: clip",
]);
if (!rootLayout.includes('import "./owner-final-qa.css"')) {
  errors.push("Owner final QA stylesheet is not mounted.");
}

const publiclyRenderedSources = `${languageSwitcher}\n${runtimeTranslator}\n${cmsTranslations}\n${announcement}\n${contactUi}`;
if (
  publiclyRenderedSources.includes(">Localized content is being updated.<") ||
  publiclyRenderedSources.includes(">Yerelleştirilmiş içerik güncelleniyor.<")
) {
  errors.push("A visitor-facing placeholder is still rendered directly.");
}

if (errors.length) {
  console.error("Public translation verification failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Public experience verification passed: ${entries.length} translation entries, ${requiredRoutes.length} routes × 3 locales, five program routes, placeholder guards, a single hero title, stable ticker, header language switcher, responsive floating controls, approved support copy, and owner-managed numeric values.`
);
