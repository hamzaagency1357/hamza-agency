import { readFile } from "node:fs/promises";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [runtimeSurface,runtimeDictionary,approvedTranslations,publicLocales,publicSeo,serverMetadata,middleware,siteLanguageProvider,languageSwitcher,globalHeader,publicIdentity,runtimeTranslator,cmsTranslations,announcement,marketingSafety,homePage,contactUi,supportCopy,ownerQaCss,rootLayout] = await Promise.all([
  readProjectFile("lib/i18n/siteRuntimeTranslations.ts"),readProjectFile("lib/i18n/siteRuntimeTranslationsLegacy.ts"),readProjectFile("lib/i18n/approvedPublishedTranslations.ts"),readProjectFile("lib/i18n/publicLocales.ts"),readProjectFile("lib/i18n/publicSeo.ts"),readProjectFile("lib/i18n/serverPublicMetadata.ts"),readProjectFile("middleware.ts"),readProjectFile("lib/i18n/useSiteLanguage.tsx"),readProjectFile("components/LanguageSwitcher.tsx"),readProjectFile("components/PublicGlobalHeader.tsx"),readProjectFile("lib/publicIdentity.ts"),readProjectFile("components/PublicSiteRuntimeTranslator.tsx"),readProjectFile("components/CmsPublishedTranslations.tsx"),readProjectFile("components/PublishedAnnouncementBar.tsx"),readProjectFile("lib/i18n/marketingSafety.ts"),readProjectFile("app/page.tsx"),readProjectFile("components/ContactStaticUi.tsx"),readProjectFile("lib/i18n/supportCopy.ts"),readProjectFile("app/owner-final-qa.css"),readProjectFile("app/layout.tsx"),
]);

const errors = [];
const arabicPattern = /[\u0600-\u06ff]/;
const normalize = (value) => value.replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
const entryPattern = /^\s*\["((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\],?\s*$/gm;
const entries = [];
let match;
while ((match = entryPattern.exec(runtimeDictionary)) !== null) entries.push({ source: match[1], en: match[2], tr: match[3] });

if (entries.length < 300) errors.push(`Expected at least 300 translation entries, found ${entries.length}.`);
for (const entry of entries) {
  const source = normalize(entry.source); const en = normalize(entry.en); const tr = normalize(entry.tr);
  if (!source || !en || !tr) errors.push(`Empty translation field: ${source || "<empty>"}`);
  if (arabicPattern.test(en)) errors.push(`English translation contains Arabic: ${source}`);
  if (arabicPattern.test(tr)) errors.push(`Turkish translation contains Arabic: ${source}`);
}

const forbiddenPlaceholders = ["Localized content is being updated.","Yerelleştirilmiş içerik güncelleniyor."];
const displayableSources = [runtimeSurface, cmsTranslations, announcement, runtimeTranslator, homePage];
for (const placeholder of forbiddenPlaceholders) if (displayableSources.some((source) => source.includes(placeholder))) errors.push(`Forbidden public placeholder remains displayable: ${placeholder}`);

if (!runtimeSurface.includes("siteRuntimeTranslationsLegacy")) errors.push("Safe runtime translation surface is not wrapping the legacy dictionary.");
if (!runtimeSurface.includes("isLegacyPlaceholder")) errors.push("Safe runtime translation surface does not block legacy placeholders.");
for (const token of ["SAFE_UNMATCHED_COPY", "HAMZA AGENCY information", "HAMZA AGENCY bilgileri"]) if (`${runtimeTranslator}\n${languageSwitcher}`.includes(token)) errors.push(`Forbidden generic public fallback remains: ${token}`);

for (const token of ["window.location.assign", "MutationObserver", "createPortal", "document.createElement", "router.prefetch"]) if (languageSwitcher.includes(token)) errors.push(`LanguageSwitcher still uses forbidden architecture: ${token}`);
for (const token of ["router.replace","useTransition","scroll:false","rememberLanguagePreference(next)","localizePublicPath","window.location.search","window.location.hash",'data-language-switcher="dropdown"','aria-haspopup="menu"','aria-expanded={open}','role="menu"','role="menuitemradio"',"العربية","English","Türkçe"]) if (!languageSwitcher.includes(token)) errors.push(`Approved language dropdown is missing: ${token}`);
if (languageSwitcher.includes('data-language-switcher="segmented"')) errors.push("Legacy segmented language switcher returned.");

for (const token of ["LanguageSwitcher","getPublicIdentity","identity.agencyName.en",'language==="en"?"":identity.agencyName[language]']) if (!globalHeader.includes(token)) errors.push(`Owner-approved public header identity wiring is missing: ${token}`);
for (const token of ['ar: "وكالة حمزة"','en: "HAMZA AGENCY"','tr: "Hamza Ajansı"']) if (!publicIdentity.includes(token)) errors.push(`Central public identity default is missing: ${token}`);
if (/عراب سوريا|Godfather of Syria|Vaftiz Babası|⚔/.test(globalHeader)) errors.push("Agent identity must not appear in the public header.");
if (!publicIdentity.includes('agencyName: { ar: "وكالة حمزة", en: "HAMZA AGENCY", tr: "Hamza Ajansı" }')) errors.push("Central agency identity defaults drifted from the Owner-approved AR/EN/TR values.");

if (runtimeTranslator.includes("MutationObserver") || runtimeTranslator.includes("document.body")) errors.push("Runtime translator still scans or observes document.body.");
if (!runtimeTranslator.includes("[data-runtime-translate='true']")) errors.push("Runtime translator is not restricted to explicit legacy markers.");
if (rootLayout.includes("PublicLocaleLinkSync")) errors.push("DOM locale-link synchronization is still mounted.");
if (rootLayout.includes("ApprovedSupportCopySync") || rootLayout.includes("PublicHeaderDropdownNav")) errors.push("Removed DOM synchronization/header portal components are still mounted.");
if (!/<PublicGlobalHeader\s*\/>/.test(rootLayout)) errors.push("Direct React public header is not mounted.");

if (middleware.includes('request.cookies.get("hamza-agency-language")') || middleware.includes("localizePublicPath")) errors.push("Middleware still redirects an Arabic URL from the saved locale cookie.");
for (const token of ["NextResponse.rewrite", "x-site-locale", "isSupportedPublicPath", "shouldPersistLanguagePreference", 'headers.get("next-router-prefetch")', 'headers.get("rsc")', 'headers.get("sec-fetch-mode")', 'headers.get("sec-fetch-dest")', 'fetchMode === "navigate" && fetchDestination === "document"']) if (!middleware.includes(token)) errors.push(`Locale middleware is missing: ${token}`);
if (!siteLanguageProvider.includes('const nextLanguage = getPathLanguage(pathname || "/");')) errors.push("SiteLanguageProvider does not derive language directly from the URL.");
for (const token of ["getStoredSiteLanguage", "SITE_LANGUAGE_CHANGE_EVENT", 'pathLanguage === "ar"']) if (siteLanguageProvider.includes(token)) errors.push(`SiteLanguageProvider still allows a non-URL language source: ${token}`);

for (const token of ['"pages:1"','"sections:1"','"sections:2"','"sections:3"','"announcements:2"','"announcements:3"','"home-page:title"','"home-hero:title"']) if (!approvedTranslations.includes(token)) errors.push(`Approved published translation is missing: ${token}`);
const requiredRoutes = ["/", "/about", "/apply", "/programs", "/services", "/digital-services", "/service-request", "/service-status", "/application-status", "/jobs", "/reviews", "/success-stories", "/partners", "/gallery", "/knowledge-center", "/faq", "/contact", "/privacy-policy", "/terms-and-conditions", "/ai-policy", "/ai-support"];
for (const route of requiredRoutes) { const routeToken=route==="/"?'"/": {':`"${route}": {`; if (!runtimeDictionary.includes(routeToken)) errors.push(`Localized route metadata missing: ${route}`); if (!publicSeo.includes(routeToken)) errors.push(`Arabic SEO entry missing: ${route}`); if (!publicLocales.includes(`"${route}"`)) errors.push(`Locale route registry missing: ${route}`); }
for (const slug of ["tiktok", "bigo-live", "yaahlan", "xena", "catchii"]) { const token=slug.includes("-")?`"${slug}": {`:`${slug}: {`; if (!runtimeDictionary.includes(token)) errors.push(`Program metadata translation missing: ${slug}`); }
for (const token of ["canonical", "getLanguageAlternates", "openGraph", "twitter"]) if (!serverMetadata.includes(token)) errors.push(`Server locale metadata is missing: ${token}`);

for (const token of ["hamza-marquee-group","hamzaAnnouncementRight","hamzaAnnouncementLeft",'data-marquee-mechanics="ltr"',"data-marquee-language={language}",'data-marquee-language="ar"','data-marquee-language="en"','data-marquee-language="tr"',"from { transform: translate3d(-50%, 0, 0); }","to { transform: translate3d(0, 0, 0); }","from { transform: translate3d(0, 0, 0); }","to { transform: translate3d(-50%, 0, 0, 0); }","✦"]) if (!announcement.includes(token)) errors.push(`Localized ticker direction is missing: ${token}`);
if (announcement.includes("justify-around") || announcement.includes("direction: rtl")) errors.push("Ticker track must remain mechanically LTR without distributed spacing.");
if ((announcement.match(/hamza-marquee-group/g) || []).length !== 2) errors.push("Ticker must render exactly two identical marquee groups.");

const approvedSupportCopy = ["فريقنا متواجد لمتابعة طلباتكم ورسائلكم، وسيتم الرد عليكم في أقرب فرصة ممكنة.","Our team is available to follow up on your requests and messages, and we will respond at the earliest possible opportunity.","Ekibimiz talep ve mesajlarınızı takip etmek için hazırdır ve size mümkün olan en kısa sürede yanıt verilecektir."];
for (const copy of approvedSupportCopy) if (!supportCopy.includes(copy) || !contactUi.includes(copy)) errors.push(`Approved support copy missing: ${copy}`);
for (const forbidden of ["قد تختلف سرعة الرد حسب ضغط الطلبات ونوع البرنامج أو الخدمة.","Response times may vary depending on request volume and the type of program or service.","Yanıt süresi, talep yoğunluğuna ve program ya da hizmet türüne göre değişebilir."]) if (contactUi.includes(forbidden)) errors.push(`Removed support qualifier returned: ${forbidden}`);

const ownerApprovedStatistics = [
  'number:"7000+",label:"صانع محتوى"',
  'number:"5+",label:"منصات متاحة"',
  'number:"24/7",label:"دعم ومتابعة"',
  'number:"7",label:"سنوات خبرة"',
  'number:"7000+",label:"Content creators"',
  'number:"5+",label:"Available platforms"',
  'number:"24/7",label:"Support & follow-up"',
  'number:"7",label:"Years of experience"',
  'number:"7000+",label:"İçerik üreticisi"',
  'number:"5+",label:"Mevcut platformlar"',
  'number:"24/7",label:"Destek ve takip"',
  'number:"7",label:"Yıllık deneyim"',
];
for (const token of ownerApprovedStatistics) if (!homePage.includes(token)) errors.push(`Owner-approved homepage statistic is missing: ${token}`);
if (homePage.replace(/\s+/g,"").includes("item.key===2?String(programs.length)")) errors.push("Owner-approved platform marketing statistic must not be replaced by the runtime program count.");
if (!homePage.includes("text-yellow-200")) errors.push("Owner-approved statistic numbers are missing the restrained gold emphasis.");
if (!marketingSafety.includes("Numeric values are intentionally excluded")) errors.push("Owner-managed numeric preservation documentation is missing.");
if (!rootLayout.includes('import "./owner-final-qa.css"')) errors.push("Owner final QA stylesheet is not mounted.");
if (!rootLayout.includes('import "./owner-verified-delta.css"')) errors.push("Owner-verified visual hierarchy stylesheet is not mounted.");
for (const token of ["safe-area-inset-bottom", "--public-mobile-dock-clearance", "scroll-padding-bottom"]) if (!ownerQaCss.includes(token)) errors.push(`Mobile dock clearance is missing: ${token}`);

if (errors.length) { console.error("Public translation verification failed:\n"); errors.forEach((error)=>console.error(`- ${error}`)); process.exit(1); }
console.log(`Public experience verification passed: ${entries.length} translations, ${requiredRoutes.length} routes × 3 URL-owned locales, centrally managed approved header identity and dropdown language switching, approved support copy, Owner-approved homepage statistics, safe runtime fallbacks, localized ticker direction, and mobile dock clearance.`);
