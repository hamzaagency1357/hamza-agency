"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { sanitizeMarketingCopy } from "@/lib/i18n/marketingSafety";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { translateSiteRuntimeText } from "@/lib/i18n/siteRuntimeTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type Announcement = { id: number; title: string | null; content: string | null };
type Field = "title" | "content";
type Animation = "fixed" | "marquee";
const fields: Field[] = ["title", "content"];
const fallback = {
  en: { title: "HAMZA AGENCY", content: "Follow the latest agency updates, programs, and opportunities." },
  tr: { title: "HAMZA AGENCY", content: "Ajansın güncel duyurularını, programlarını ve fırsatlarını takip edin." },
};

export default function PublishedAnnouncementBar({ announcement, animation, speed, rounded = false }: { announcement: Announcement; animation: Animation; speed: number; rounded?: boolean }) {
  const language = useSiteLanguage();
  const direction = getLanguageDirection(language);
  const [translations, setTranslations] = useState<PublishedTranslationMap<Field>>({});

  useEffect(() => {
    let active = true;
    setTranslations({});
    if (language === "ar" || !announcement.id) return () => { active = false; };
    void readPublishedTranslations<Field>({ sourceType: "announcements", language, sourceIds: [announcement.id], fields })
      .then((map) => { if (active) setTranslations(map); });
    return () => { active = false; };
  }, [announcement.id, language]);

  const displayed = useMemo(() => {
    if (language === "ar") return {
      title: sanitizeMarketingCopy(announcement.title || "", "ar"),
      content: sanitizeMarketingCopy(announcement.content || "", "ar"),
    };
    const current = translations[String(announcement.id)];
    if (hasCompletePublishedTranslation(current, fields)) return {
      title: sanitizeMarketingCopy(current?.title || "", language),
      content: sanitizeMarketingCopy(current?.content || "", language),
    };
    const title = translateSiteRuntimeText(announcement.title || "", language);
    const content = translateSiteRuntimeText(announcement.content || "", language);
    return {
      title: title.trim() && !title.includes("Localized content") && !title.includes("Yerelleştirilmiş") ? title : fallback[language].title,
      content: content.trim() && !content.includes("Localized content") && !content.includes("Yerelleştirilmiş") ? content : fallback[language].content,
    };
  }, [announcement, language, translations]);

  const text = `${displayed.title} — ${displayed.content}`.trim();
  if (!text) return null;
  const style = { "--marquee-duration": `${Math.min(Math.max(Number(speed) || 22, 16), 60)}s` } as CSSProperties;
  const group = (
    <div className="hamza-marquee-group flex min-w-[100vw] shrink-0 items-center justify-around gap-8 px-8">
      <span className="inline-flex min-w-max items-center gap-8 px-4"><span>{text}</span><span aria-hidden="true" className="text-yellow-300/65">✦</span></span>
      <span className="inline-flex min-w-max items-center gap-8 px-4"><span>{text}</span><span aria-hidden="true" className="text-yellow-300/65">✦</span></span>
    </div>
  );

  return (
    <div lang={language} dir={direction} data-announcement-locale={language} className={`overflow-hidden border border-yellow-400/20 bg-yellow-400/10 text-yellow-100 ${rounded ? "rounded-2xl" : "border-x-0"}`}>
      {animation === "marquee" ? (
        <div className="overflow-hidden">
          <div className="hamza-marquee-track flex w-max items-center whitespace-nowrap py-3 text-sm font-bold md:text-base" data-marquee-direction={direction} style={style}>
            {group}
            <div aria-hidden="true">{group}</div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-center text-sm font-bold leading-7 md:text-base"><span className="text-yellow-200">{displayed.title}</span><span className="mx-2 text-white/40">—</span><span>{displayed.content}</span></div>
      )}
      <style>{`
        @keyframes hamzaAnnouncementLtr { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        @keyframes hamzaAnnouncementRtl { from { transform: translate3d(-50%,0,0); } to { transform: translate3d(0,0,0); } }
        .hamza-marquee-track[data-marquee-direction="ltr"] { animation: hamzaAnnouncementLtr var(--marquee-duration) linear infinite; }
        .hamza-marquee-track[data-marquee-direction="rtl"] { direction: rtl; animation: hamzaAnnouncementRtl var(--marquee-duration) linear infinite; }
        @media (prefers-reduced-motion: reduce) { .hamza-marquee-track { animation: none !important; transform: none !important; white-space: normal; width: auto; } .hamza-marquee-track > [aria-hidden="true"] { display:none; } }
      `}</style>
    </div>
  );
}
