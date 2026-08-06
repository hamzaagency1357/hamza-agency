import type { SiteLanguage } from "@/lib/i18n/locale";

export const FIRST_VISIT_LANGUAGE_SESSION_KEY: string;

export type FirstVisitLanguageInput = {
  pathname: string;
  savedLanguage?: string | null;
  navigatorLanguages?: readonly string[];
  userAgent?: string;
  alreadyResolved?: boolean;
};

export function isSearchCrawler(userAgent: string): boolean;
export function detectDeviceLanguage(
  navigatorLanguages?: readonly string[]
): SiteLanguage;
export function resolveFirstVisitLanguage(
  input: FirstVisitLanguageInput
): SiteLanguage | null;
export function languageHomepage(
  language: SiteLanguage
): "/" | "/en" | "/tr";
