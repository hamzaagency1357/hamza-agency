import { isSiteLanguage, type SiteLanguage } from "@/lib/i18n/locale";

export const SITE_URL = "https://hamza-agency.com";
export const PUBLIC_ROUTE_PATHS = ["/","/about","/ai-policy","/ai-support","/apply","/application-status","/contact","/cookie-policy","/cookie-settings","/digital-services","/faq","/gallery","/install-app","/jobs","/knowledge-center","/partners","/privacy-policy","/programs","/reviews","/service-request","/service-status","/services","/success-stories","/terms-and-conditions","/track"] as const;
export const PROGRAM_SLUGS = ["tiktok","bigo-live","yaahlan","xena","catchii"] as const;
export type PublicRoutePath = (typeof PUBLIC_ROUTE_PATHS)[number];
const publicRouteSet = new Set<string>(PUBLIC_ROUTE_PATHS);
const localizedPrefixPattern = /^\/(en|tr)(?=\/|$)/;
const programPathPattern = /^\/programs\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dynamicCmsPathPattern = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reservedCmsSegments = new Set(["admin","api","_next","en","tr","login","reset-password","robots.txt","sitemap.xml","manifest.webmanifest","opengraph-image"]);
const nonIndexablePublicPaths = new Set(["/application-status", "/service-status", "/track"]);

export function normalizePublicPathname(pathname:string){const withoutQuery=pathname.split(/[?#]/,1)[0]||"/";const withLeadingSlash=withoutQuery.startsWith("/")?withoutQuery:`/${withoutQuery}`;return withLeadingSlash.replace(/\/+$/g,"")||"/"}
export function splitLocalizedPathname(pathname:string):{language:SiteLanguage;publicPath:string}{const normalized=normalizePublicPathname(pathname);const match=normalized.match(localizedPrefixPattern);if(!match||!isSiteLanguage(match[1]))return{language:"ar",publicPath:normalized};const publicPath=normalized.slice(match[0].length)||"/";return{language:match[1],publicPath:normalizePublicPathname(publicPath)}}
export function stripLocalePrefix(pathname:string){return splitLocalizedPathname(pathname).publicPath}
export function getPathLanguage(pathname:string):SiteLanguage{return splitLocalizedPathname(pathname).language}
export function localizePublicPath(pathname:string,language:SiteLanguage){const url=new URL(pathname,SITE_URL);const publicPath=stripLocalePrefix(url.pathname);const localized=language==="ar"?publicPath:publicPath==="/"?`/${language}`:`/${language}${publicPath}`;return `${localized}${url.search}${url.hash}`}
export function localizePublicHref(href:string,language:SiteLanguage){if(!href.startsWith("/")||href.startsWith("//")||href.startsWith("/api/")||href.startsWith("/admin"))return href;return localizePublicPath(href,language)}
export function getLocalizedAbsoluteUrl(pathname:string,language:SiteLanguage){return `${SITE_URL}${localizePublicPath(pathname,language)}`}
export function getLanguageAlternates(pathname:string){const publicPath=stripLocalePrefix(pathname);return{ar:getLocalizedAbsoluteUrl(publicPath,"ar"),en:getLocalizedAbsoluteUrl(publicPath,"en"),tr:getLocalizedAbsoluteUrl(publicPath,"tr"),"x-default":getLocalizedAbsoluteUrl(publicPath,"ar")}}
export function isDynamicCmsPublicPath(pathname:string){const publicPath=stripLocalePrefix(pathname);const segment=publicPath.slice(1);return dynamicCmsPathPattern.test(publicPath)&&!publicRouteSet.has(publicPath)&&!reservedCmsSegments.has(segment)}
export function isSupportedPublicPath(pathname:string){const publicPath=stripLocalePrefix(pathname);return publicRouteSet.has(publicPath)||programPathPattern.test(publicPath)||isDynamicCmsPublicPath(publicPath)}
export function isProgramPublicPath(pathname:string){return programPathPattern.test(stripLocalePrefix(pathname))}
export function getProgramSlugFromPath(pathname:string){const match=stripLocalePrefix(pathname).match(/^\/programs\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);return match?.[1]||null}
export function isIndexablePublicPath(pathname:string){const publicPath=stripLocalePrefix(pathname);return isSupportedPublicPath(publicPath)&&!nonIndexablePublicPaths.has(publicPath)}
