"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLanguageDirection } from "@/lib/i18n/locale";
import {
  AGENT_PUBLIC_PATH,
  getBlogSlugFromPath,
  localizePublicHref,
  stripLocalePrefix,
} from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: { home: "الرئيسية", about: "من نحن", blog: "المدونة", agent: "عراب سوريا", current: "المحتوى الحالي" },
  en: { home: "Home", about: "About us", blog: "Blog", agent: "Arab Syria", current: "Current page" },
  tr: { home: "Ana sayfa", about: "Hakkımızda", blog: "Blog", agent: "Arab Syria", current: "Mevcut sayfa" },
} as const;

export default function PublicBreadcrumbs({ currentLabel }: { currentLabel?: string }) {
  const pathname = usePathname() || "/";
  const language = useSiteLanguage();
  const direction = getLanguageDirection(language);
  const t = copy[language];
  const publicPath = stripLocalePrefix(pathname);
  const blogSlug = getBlogSlugFromPath(publicPath);
  const isBlog = publicPath === "/blog" || Boolean(blogSlug);
  const isAgent = publicPath === AGENT_PUBLIC_PATH;
  if (!isBlog && !isAgent) return null;
  const homeHref = localizePublicHref("/", language);
  const blogHref = localizePublicHref("/blog", language);
  const aboutHref = localizePublicHref("/about", language);
  return (
    <nav aria-label="Breadcrumb" dir={direction} className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold text-white/70">
      <Link href={homeHref} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:text-white">{t.home}</Link>
      <span aria-hidden="true">/</span>
      {isBlog ? <>
        {blogSlug ? <Link href={blogHref} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:text-white">{t.blog}</Link> : <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-purple-100">{t.blog}</span>}
        {blogSlug ? <><span aria-hidden="true">/</span><span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-purple-100">{currentLabel || t.current}</span></> : null}
      </> : <>
        <Link href={aboutHref} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:text-white">{t.about}</Link>
        <span aria-hidden="true">/</span>
        <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-purple-100">{currentLabel || t.agent}</span>
      </>}
    </nav>
  );
}
