import { readFile } from "node:fs/promises";

const dictionaryPath = new URL("../lib/i18n/siteRuntimeTranslations.ts", import.meta.url);
const source = await readFile(dictionaryPath, "utf8");
const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  publicLocalesSource,
  publicSeoSource,
  serverMetadataSource,
  announcementSource,
  publishedTranslationsSource,
  middlewareSource,
  languageSwitcherSource,
  localeLinkSyncSource,
  sitemapSource,
  robotsSource,
  marketingSafetySource,
  homeCopySource,
  homePageSource,
  visualPresetSource,
  visualMigrationSource,
  visualRollbackSource,
  rootLayoutSource,
  publicAgencyNameSource,
  applicationStatusSource,
  serviceRequestSource,
  faqPageSource,
  servicesPageSource,
] = await Promise.all([
  readProjectFile("lib/i18n/publicLocales.ts"),
  readProjectFile("lib/i18n/publicSeo.ts"),
  readProjectFile("lib/i18n/serverPublicMetadata.ts"),
  readProjectFile("components/PublishedAnnouncementBar.tsx"),
  readProjectFile("lib/i18n/publishedTranslations.ts"),
  readProjectFile("middleware.ts"),
  readProjectFile("components/LanguageSwitcher.tsx"),
  readProjectFile("components/PublicLocaleLinkSync.tsx"),
  readProjectFile("app/sitemap.ts"),
  readProjectFile("app/robots.ts"),
  readProjectFile("lib/i18n/marketingSafety.ts"),
  readProjectFile("lib/i18n/homeStaticCopy.ts"),
  readProjectFile("app/page.tsx"),
  readProjectFile("lib/visualBackgroundPresets.ts"),
  readProjectFile(
    "supabase/migrations/20260728132048_final_public_background_presets.sql"
  ),
  readProjectFile(
    "supabase/rollbacks/20260728132048_final_public_background_presets.sql"
  ),
  readProjectFile("app/layout.tsx"),
  readProjectFile("components/PublicAgencyName.tsx"),
  readProjectFile("app/application-status/page.tsx"),
  readProjectFile("app/service-request/page.tsx"),
  readProjectFile("app/faq/page.tsx"),
  readProjectFile("app/services/page.tsx"),
]);

const entryPattern = /^\s*\["((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\],?\s*$/gm;
const entries = [];
let match;

while ((match = entryPattern.exec(source)) !== null) {
  entries.push({ source: match[1], en: match[2], tr: match[3] });
}

const errors = [];
const normalize = (value) => value.replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
const arabicPattern = /[\u0600-\u06ff]/;
const bySource = new Map();
const approvedContextualDuplicates = new Set([
  "كيف تتم المتابعة؟",
  "التواصل عبر واتساب",
]);

if (entries.length < 300) {
  errors.push(`Expected at least 300 translation entries, found ${entries.length}.`);
}

for (const entry of entries) {
  const sourceText = normalize(entry.source);
  const en = normalize(entry.en);
  const tr = normalize(entry.tr);

  if (!sourceText || !en || !tr) {
    errors.push(`Empty translation field found for source: ${sourceText || "<empty>"}`);
    continue;
  }

  if (arabicPattern.test(en)) {
    errors.push(`English translation still contains Arabic text: ${sourceText}`);
  }

  if (arabicPattern.test(tr)) {
    errors.push(`Turkish translation still contains Arabic text: ${sourceText}`);
  }

  const existing = bySource.get(sourceText);
  const isConflictingDuplicate =
    existing && (existing.en !== en || existing.tr !== tr);

  if (isConflictingDuplicate && !approvedContextualDuplicates.has(sourceText)) {
    errors.push(`Conflicting duplicate translation for: ${sourceText}`);
  }

  // The runtime dictionary intentionally uses the last approved contextual value.
  bySource.set(sourceText, { en, tr });
}

const requiredSources = [
  "وكالة حمزة",
  "البرامج",
  "من نحن",
  "الخدمات",
  "الخدمات الرقمية",
  "طلب خدمة",
  "تتبع طلب خدمة",
  "تتبع طلب الانضمام",
  "الوظائف",
  "التقييمات",
  "قصص النجاح",
  "الشركاء والبرامج",
  "المعرض",
  "مركز المعرفة",
  "الأسئلة الشائعة",
  "اتصل بنا",
  "سياسة الخصوصية",
  "الشروط والأحكام",
  "سياسة الذكاء الاصطناعي",
  "دعم ذكي",
  "برنامج TikTok مخصص لصناع المحتوى الذين يريدون تطوير ظهورهم، تحسين جودة المحتوى، وفهم طريقة العمل داخل الوكالة بشكل احترافي.",
  "برنامج BIGO LIVE مناسب لصناع المحتوى المهتمين بالبث المباشر، بناء جمهور نشط، وتحسين طريقة الظهور والتفاعل داخل اللايف.",
  "برنامج Yaahlan يركز على بناء حضور اجتماعي وتفاعل مباشر مع الجمهور، مع دعم وكالة حمزة في المتابعة والتوجيه.",
  "برنامج Xena مناسب لصناع المحتوى الراغبين بالانضمام إلى برنامج منظم مع متابعة إدارية ودعم لتطوير الحساب.",
  "برنامج Catchii مناسب لصناع المحتوى المهتمين بالتواصل والترفيه وبناء حضور اجتماعي ضمن بيئة وكالة احترافية.",
];

for (const requiredSource of requiredSources) {
  if (!bySource.has(normalize(requiredSource))) {
    errors.push(`Required public translation is missing: ${requiredSource}`);
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
  if (!source.includes(routeToken)) {
    errors.push(`Localized metadata is missing for route: ${route}`);
  }

  if (!publicSeoSource.includes(routeToken)) {
    errors.push(`Arabic SEO content is missing for route: ${route}`);
  }

  if (!publicLocalesSource.includes(`"${route}"`)) {
    errors.push(`Public locale route registry is missing: ${route}`);
  }
}

for (const slug of ["tiktok", "bigo-live", "yaahlan", "xena", "catchii"]) {
  const slugToken = slug.includes("-") ? `"${slug}": {` : `${slug}: {`;
  if (!source.includes(slugToken)) {
    errors.push(`Program translation metadata is missing for: ${slug}`);
  }
  if (!publicSeoSource.includes(slugToken)) {
    errors.push(`Arabic program SEO is missing for: ${slug}`);
  }
  if (!publicLocalesSource.includes(`"${slug}"`)) {
    errors.push(`Localized program route registry is missing: ${slug}`);
  }
}

function requireTokens(label, fileSource, tokens) {
  for (const token of tokens) {
    if (!fileSource.includes(token)) {
      errors.push(`${label} is missing required implementation token: ${token}`);
    }
  }
}

const routeMetadataStart = source.indexOf("const routeMetadata:");
const programMetadataStart = source.indexOf("const programMetadata:");
const metadataFunctionStart = source.indexOf(
  "export function getSiteRuntimeMetadata"
);
const nonArabicRouteMetadata = source.slice(
  routeMetadataStart,
  programMetadataStart
);
const nonArabicProgramMetadata = source.slice(
  programMetadataStart,
  metadataFunctionStart
);

if (
  routeMetadataStart < 0 ||
  programMetadataStart < 0 ||
  metadataFunctionStart < 0
) {
  errors.push("Could not locate the EN/TR route metadata registries.");
} else {
  if (arabicPattern.test(nonArabicRouteMetadata)) {
    errors.push("EN/TR route metadata contains Arabic text.");
  }
  if (arabicPattern.test(nonArabicProgramMetadata)) {
    errors.push("EN/TR program metadata contains Arabic text.");
  }
  if (
    /(?:title|description):\s*["'`]\s*["'`]/.test(
      `${nonArabicRouteMetadata}\n${nonArabicProgramMetadata}`
    )
  ) {
    errors.push("EN/TR metadata contains an empty title or description.");
  }
}

requireTokens("Server multilingual metadata", serverMetadataSource, [
  "canonical",
  "getLanguageAlternates",
  "openGraph",
  "twitter",
  "isIndexablePublicPath",
]);

requireTokens("Language alternate registry", publicLocalesSource, [
  '"x-default"',
  "getLocalizedAbsoluteUrl",
]);

requireTokens("Multilingual sitemap", sitemapSource, [
  '["ar", "en", "tr"]',
  "getLanguageAlternates",
  "getLocalizedAbsoluteUrl",
  "alternates",
]);

requireTokens("Localized robots rules", robotsSource, [
  '"/en/service-status"',
  '"/tr/service-status"',
  '"/en/application-status"',
  '"/tr/application-status"',
]);

requireTokens("Locale route middleware", middlewareSource, [
  "NextResponse.rewrite",
  "x-site-locale",
  "x-site-path",
  "forwardedLanguage",
  "forwardedPath !== pathname",
  "hamza-agency-language",
  "isSupportedPublicPath",
  "localizePublicPath",
]);

requireTokens("Server-seeded locale layout", rootLayoutSource, [
  "getRequestSiteContext",
  "SiteLanguageProvider initialLanguage={siteContext.language}",
  "lang={siteContext.language}",
  "dir={siteContext.direction}",
]);

if (rootLayoutSource.includes("<FinalVisualPolish")) {
  errors.push("Hidden legacy visual copy is still mounted in the public layout.");
}

requireTokens("Localized public brand name", publicAgencyNameSource, [
  'language === "ar" ? value : "HAMZA AGENCY"',
]);

for (const [label, fileSource] of [
  ["Application status", applicationStatusSource],
  ["Service request", serviceRequestSource],
]) {
  if (fileSource.includes('"منصة أخرى"]')) {
    errors.push(`${label} exposes an Arabic option value in EN/TR markup.`);
  }
  if (!fileSource.includes('"other"')) {
    errors.push(`${label} is missing the locale-neutral other-platform option.`);
  }
}

for (const [label, fileSource] of [
  ["FAQ page", faqPageSource],
  ["Services page", servicesPageSource],
]) {
  if (fileSource.includes('type="application/ld+json"')) {
    errors.push(`${label} still emits page-local JSON-LD that bypasses locale handling.`);
  }
}

requireTokens("Language counterpart navigation", languageSwitcherSource, [
  "localizePublicPath(pathname, nextLanguage)",
  "setStoredSiteLanguage(nextLanguage)",
  "window.location.assign",
]);

requireTokens("Localized internal links", localeLinkSyncSource, [
  "isSupportedPublicPath",
  "localizePublicHref",
  "MutationObserver",
]);

requireTokens("Announcement translations", announcementSource, [
  'sourceType: "announcements"',
  "hasCompletePublishedTranslation",
  "safeFallback",
  "hamzaAnnouncementLtr",
  "hamzaAnnouncementRtl",
  'data-marquee-direction={direction}',
  "@media (prefers-reduced-motion: reduce)",
]);

if (
  !announcementSource.includes(
    "Follow the latest agency updates, programs, and opportunities."
  ) ||
  !announcementSource.includes(
    "Ajansın güncel duyurularını, programlarını ve fırsatlarını takip edin."
  )
) {
  errors.push("Announcement EN/TR safe fallback copy is incomplete.");
}

requireTokens(
  "Published translation safety",
  publishedTranslationsSource,
  [
    "ARABIC_TEXT_PATTERN",
    "ARABIC_TEXT_PATTERN.test(value)",
    "hasCompletePublishedTranslation",
  ]
);

const unsafePublicClaims = [
  "24/7 دعم ومتابعة",
  "50+ فرصة نجاح شهرية",
  "500+ فرصة نجاح شهرية",
  "وكالة عالمية محترفة لإدارة صناع المحتوى",
];
const publicMarketingSources = `${homeCopySource}\n${homePageSource}\n${source}`;

for (const claim of unsafePublicClaims) {
  if (publicMarketingSources.includes(claim)) {
    errors.push(`Unsupported public marketing claim remains: ${claim}`);
  }
  if (!marketingSafetySource.includes(claim)) {
    errors.push(`Marketing safety fallback is missing legacy claim: ${claim}`);
  }
}

requireTokens("F5.1 safe home stats", homeCopySource, [
  '"دعم ومتابعة"',
  '"فرص شهرية متجددة"',
  '"Support and follow-up"',
  '"Renewed monthly opportunities"',
  '"Destek ve takip"',
  '"Yenilenen aylık fırsatlar"',
]);

const presetIds = [
  "global-luxury-aurora",
  "classic-purple-agency",
  "royal-creator-waves",
  "golden-network-pulse",
  "galaxy-agency-flow",
  "live-streaming-signal",
  "premium-glass-orbits",
  "digital-stage-lights",
];

for (const preset of presetIds) {
  if (!visualPresetSource.includes(`"${preset}"`)) {
    errors.push(`Visual preset registry is missing: ${preset}`);
  }
  if (!visualMigrationSource.includes(`'${preset}'`)) {
    errors.push(`Visual preset migration is missing: ${preset}`);
  }
}

if (
  /disable\s+row\s+level\s+security|drop\s+policy|delete\s+from|truncate\s+table|drop\s+table|drop\s+column/iu.test(
    visualMigrationSource
  )
) {
  errors.push("Visual preset migration contains a destructive or RLS-weakening operation.");
}

requireTokens("Visual preset rollback", visualRollbackSource, [
  "Rollback stopped",
  "visual_experience_settings_background_check",
  "raise exception",
]);

if (errors.length) {
  console.error("Public translation verification failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Public experience verification passed: ${entries.length} entries, ${bySource.size} unique sources, ${requiredRoutes.length} routes × 3 locales, 5 program metadata records, 8 background presets, localized SEO, links, ticker, and F5.1 checks.`
);
