"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { AGENT_PUBLIC_PATH, localizePublicHref } from "@/lib/i18n/publicLocales";
import { getCookieConsentCopy, getPwaRuntimeCopy } from "@/lib/i18n/privacyAndPwaCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

function shouldHideFooter(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/portal") || pathname === "/maintenance" || pathname === "/pr99-e2e";
}

const identity = {
  ar: { line: "HAMZA AGENCY — بإدارة الوكيل ⚔عܓོراب✴سܓོوريا⚔", agent: "تعرف على الوكيل عراب سوريا" },
  en: { line: "HAMZA AGENCY — Managed by agent Arab Syria", agent: "Meet agent Arab Syria" },
  tr: { line: "HAMZA AGENCY — Arab Syria yönetiminde", agent: "Arab Syria'yı tanıyın" },
} as const;

export default function PublicFooterLinks() {
  const pathname = usePathname() || "/";
  const language = useSiteLanguage();
  if (shouldHideFooter(pathname)) return null;
  const cookieCopy = getCookieConsentCopy(language);
  const installCopy = getPwaRuntimeCopy(language);
  const t = identity[language];
  return <footer dir={getLanguageDirection(language)} className="hamza-public-utility-footer border-t border-white/10 bg-[#050008] px-4 py-6 text-white" data-testid="public-footer-links">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-black">{t.line}</p><Link href={localizePublicHref(AGENT_PUBLIC_PATH, language)} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-yellow-200 underline-offset-4 hover:underline" data-testid="footer-agent-link">{t.agent}</Link></div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={localizePublicHref("/install-app", language)} className="inline-flex min-h-11 items-center rounded-full border border-violet-300/25 px-4 py-2 font-bold text-violet-100" data-testid="footer-install-app">{installCopy.installButton}</Link>
        <Link href={localizePublicHref("/cookie-settings", language)} className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 font-bold text-white/80" data-testid="footer-cookie-settings">{cookieCopy.settings}</Link>
      </div>
    </div>
  </footer>;
}
