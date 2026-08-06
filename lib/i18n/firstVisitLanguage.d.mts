import type { SiteLanguage } from "./locale";

export const FIRST_VISIT_LANGUAGE_SESSION_KEY: string;
export function isSearchCrawler(userAgent: string): boolean;
export function detectDeviceLanguage(navigatorLanguages?: readonly string[]): SiteLanguage;
export function resolveFirstVisitLanguage(input: {
  pathname: string;
  savedLanguage?: string | null;
  navigatorLanguages?: readonly string[];
  userAgent?: string;
  alreadyResolved?: boolean;
}): SiteLanguage | null;
export function languageHomepage(language: SiteLanguage): "/" | "/en" | "/tr";
