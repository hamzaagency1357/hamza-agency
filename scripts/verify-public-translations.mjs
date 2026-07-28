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
  globalHeader,
  runtimeTranslator,
  cmsTranslations,
  announcement,
  marketingSafety,
  homePage,
  contactUi,
  supportCopy,
  ownerQaCss,
  rootLayout,
] = await Promise.all([
  readProjectFile("lib/i18n/siteRuntimeTranslations.ts"),
  readProjectFile("lib/i18n/publicLocales.ts"),
  readProjectFile("lib/i18n/publicSeo.ts"),
  readProjectFile("lib/i18n/serverPublicMetadata.ts"),
  readProjectFile("middleware.ts"),
  readProjectFile("components/LanguageSwitcher.tsx"),
  readProjectFile("components/PublicGlobalHeader.tsx"),
  readProjectFile("components/PublicSiteRuntimeTranslator.tsx"),
  readProjectFile("components/CmsPublishedTranslations.tsx"),
  readProjectFile("components/PublishedAnnouncementBar.tsx"),
  readProjectFile("lib/i18n/marketingSafety.ts"),
  readProjectFile("app/page.tsx"),
  readProjectFile("components/ContactStaticUi.tsx"),
  readProjectFile("lib/i18n/supportCopy.ts"),
  readProjectFile("app/owner-final-qa.css"),
  readProjectFile("app/layout.tsx"),
]);

const errors = [];
const arabicPattern = /[\u0600-\u06ff]/;
const normalize = (value) => value.replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
const entryPattern = /^\s*\["((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\],?\s*$/gm;
const entries = [];
let match;
while ((match = entryPattern.exec(runtimeDictionary)) !== null) {
  entries.push({ source: match[1], en: match[2], tr: match[3] });
}

if (entries.length < 300) errors.push(`Expected at least 300 translation entries, found ${entries.length}.`);
for (const entry of entries) {
  const source = normalize(entry.source);
  const en = normalize(entry.en);
  const tr = normalize(entry.tr);
  if (!source || !en || !tr) errors.push(`Empty translation field: ${source || "<empty>"}`);
  if (arabicPattern.test(en)) errors.push(`English translation contains Arabic: ${source}`);
  if (arabicPattern.test(tr)) errors.push(`Turkish translation contains Arabic: ${source}`);
}

const forbiddenPublicCopy = [
  "SAFE_UNMATCHED_COPY",
  "HAMZA AGENCY information",
  "HAMZA AGENCY bilgileri",
];
for (const token of forbiddenPublicCopy) {
  if (`${runtimeTranslator}\n${languageSwitcher}`.includes(token)) {
    errors.push(`Forbidden generic public fallback remains: ${token}`);
  }
}

const forbiddenSwitcherArchitecture = [
  "window.location.assign",
  "MutationObserver",
  "createPortal",
  "document.createElement",
  'aria-haspopup="menu"',
];
for (const token of forbiddenSwitcherArchitecture) {
  if (languageSwitcher.includes(token)) errors.push(`LanguageSwitcher still uses forbidden architecture: ${token}`);
}

for (const token of [
  "router.prefetch",
  "router.replace",
  "useTransition",
  "scroll: false",
  "localizePublicPath",
  "window.location.search",
  "window.location.hash",
  'data-language-switcher="segmented"',
  "min-h-11",
  "min-w-11",
]) {
  if (!languageSwitcher.includes(token)) errors.push(`Segmented language switcher is missing: ${token}`);
}

for (const token of [
  "<LanguageSwitcher />",
  'en: "Content Creator Agency"',
  'tr: "İçerik Üreticisi Ajansı"',
  'ar: "وكالة حمزة"',
]) {
  if (!globalHeader.includes(token)) errors.push(`Direct public header is missing: ${token}`);
}
if ((globalHeader.match(/HAMZA AGENCY/g) || []).length > 3) {
  errors.push("Public header repeats the agency name excessively.");
}

if (runtimeTranslator.includes("MutationObserver") || runtimeTranslator.includes("document.body")) {
  errors.push("Runtime translator still scans or observes document.body.");
}
if (!runtimeTranslator.includes("[data-runtime-translate='true']")) {
  errors.push("Runtime translator is not restricted to explicit legacy markers.");
}
if (rootLayout.includes("ApprovedSupportCopySync") || rootLayout.includes("PublicHeaderDropdownNav")) {
  errors.push("Removed DOM synchronization/header portal components are still mounted.");
}
if (!rootLayout.includes("<PublicGlobalHeader />")) errors.push("Direct React public header is not mounted.");

const requiredRoutes = ["/", "/about", "/apply", "/programs", "/services", "/digital-services", "/service-request", "/service-status", "/application-status", "/jobs", "/reviews", "/success-stories", "/partners", "/gallery", "/knowledge-center", "/faq", "/contact", "/privacy-policy", "/terms-and-conditions", "/ai-policy", "/ai-support"];
for (const route of requiredRoutes) {
  const routeToken = route === "/" ? '"/": {' : `"${route}": {`;
  if (!runtimeDictionary.includes(routeToken)) errors.push(`Localized route metadata missing: ${route}`);
  if (!publicSeo.includes(routeToken)) errors.push(`Arabic SEO entry missing: ${route}`);
  if (!publicLocales.includes(`"${route}"`)) errors.push(`Locale route registry missing: ${route}`);
}
for (const slug of ["tiktok", "bigo-live", "yaahlan", "xena", "catchii"]) {
  const token = slug.includes("-") ? `"${slug}": {` : `${slug}: {`;
  if (!runtimeDictionary.includes(token)) errors.push(`Program metadata translation missing: ${slug}`);
}

for (const token of ["NextResponse.rewrite", "x-site-locale", "isSupportedPublicPath"]) {
  if (!middleware.includes(token)) errors.push(`Locale middleware is missing: ${token}`);
}
for (const token of ["canonical", "getLanguageAlternates", "openGraph", "twitter"]) {
  if (!serverMetadata.includes(token)) errors.push(`Server locale metadata is missing: ${token}`);
}
if (cmsTranslations.includes("HomeHeroBrandLine")) errors.push("Duplicate home hero brand line remains.");

for (const token of ["hamza-marquee-group", "hamzaAnnouncementLtr", "hamzaAnnouncementRtl", "✦"]) {
  if (!announcement.includes(token)) errors.push(`Localized ticker is missing: ${token}`);
}

const approvedSupportCopy = [
  "نستقبل رسائلكم وطلباتكم على مدار الساعة، وسيتم الرد عليكم في أقرب وقت ممكن.",
  "We receive your messages and requests around the clock and will respond as soon as possible.",
  "Mesajlarınızı ve taleplerinizi günün her saati alıyor ve en kısa sürede yanıtlıyoruz.",
];
for (const copy of approvedSupportCopy) {
  if (!supportCopy.includes(copy) || !contactUi.includes(copy)) errors.push(`Approved support copy missing: ${copy}`);
}

if (!homePage.includes("home_stat_${index + 1}_number")) errors.push("Home statistics are no longer sourced from settings/CMS.");
if (!marketingSafety.includes("Numeric values are intentionally excluded")) errors.push("Owner-managed numeric preservation documentation is missing.");
if (!rootLayout.includes('import "./owner-final-qa.css"')) errors.push("Owner final QA stylesheet is not mounted.");
if (!ownerQaCss.includes("safe-area-inset-bottom")) errors.push("Mobile safe-area spacing is missing.");

if (errors.length) {
  console.error("Public translation verification failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Public experience verification passed: ${entries.length} translations, ${requiredRoutes.length} routes × 3 locales, direct segmented language switching, explicit-only legacy translation, approved support copy, and owner-managed numbers.`);
