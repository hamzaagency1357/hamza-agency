"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { sanitizeMarketingCopy } from "@/lib/i18n/marketingSafety";
import { getApprovedPublishedTranslation } from "@/lib/i18n/approvedPublishedTranslations";
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

function isUsable(value: string) {
  const text = value.trim();
  return text.length > 0 && !text.startsWith("Localized content") && !text.startsWith("Yerelleştirilmiş içerik");
}

function joinAnnouncement(title: string, content: string) {
  return [title.trim(), content.trim()].filter(Boolean).join(" — ");
}

export default function PublishedAnnouncementBar({
  announcement,
  animation,
  speed,
  rounded = false,
}: {
  announcement: Announcement;
  animation: Animation;
  speed: number;
  rounded?: boolean;
}) {
  const language = useSiteLanguage();
  const direction = getLanguageDirection(language);
  const [translations, setTranslations] = useState<PublishedTranslationMap<Field>>({});

  useEffect(() => {
    let active = true;
    setTranslations({});
    if (language === "ar" || !announcement.id) return () => { active = false; };
    void readPublishedTranslations<Field>({
      sourceType: "announcements",
      language,
      sourceIds: [announcement.id],
      fields,
    }).then((map) => {
      if (active) setTranslations(map);
    });
    return () => { active = false; };
  }, [announcement.id, language]);

  const displayed = useMemo(() => {
    const current = translations[String(announcement.id)];
    const hasPublished = language !== "ar" && hasCompletePublishedTranslation(current, fields);
    const approvedTitle = getApprovedPublishedTranslation({
      sourceType: "announcements",
      sourceId: announcement.id,
      field: "title",
      language,
    });
    const approvedContent = getApprovedPublishedTranslation({
      sourceType: "announcements",
      sourceId: announcement.id,
      field: "content",
      language,
    });
    const translatedTitle = translateSiteRuntimeText(announcement.title || "", language);
    const translatedContent = translateSiteRuntimeText(announcement.content || "", language);
    const titleCandidates = [
      approvedTitle,
      hasPublished ? current?.title || "" : "",
      translatedTitle,
      language === "ar" ? announcement.title || "إعلانات وكالة حمزة" : "",
    ];
    const contentCandidates = [
      approvedContent,
      hasPublished ? current?.content || "" : "",
      translatedContent,
      language === "ar" ? announcement.content || "تابع آخر أخبار وبرامج وكالة حمزة." : "",
    ];

    return {
      title: sanitizeMarketingCopy(titleCandidates.find(isUsable) || "HAMZA AGENCY", language),
      content: sanitizeMarketingCopy(contentCandidates.find(isUsable) || "", language),
    };
  }, [announcement, language, translations]);

  const text = joinAnnouncement(displayed.title, displayed.content);
  if (!text) return null;

  const style = {
    "--marquee-duration": `${Math.min(Math.max(Number(speed) || 22, 16), 60)}s`,
  } as CSSProperties;
  const tickerItem = (
    <span
      dir={direction}
      lang={language}
      className="inline-flex min-w-max shrink-0 items-center gap-8 pe-8"
    >
      <span>{text}</span>
      <span aria-hidden="true" className="text-yellow-300/65">✦</span>
    </span>
  );

  return (
    <div
      lang={language}
      dir={direction}
      data-announcement-locale={language}
      className={`overflow-hidden border border-yellow-400/20 bg-yellow-400/10 text-yellow-100 ${rounded ? "rounded-2xl" : "border-x-0"}`}
    >
      {animation === "marquee" ? (
        <div className="overflow-hidden" dir="ltr">
          <div
            className="hamza-marquee-track flex w-max items-center whitespace-nowrap py-3 text-sm font-bold md:text-base"
            data-marquee-mechanics="ltr"
            data-marquee-language={language}
            data-marquee-direction={language === "ar" ? "right" : "left"}
            style={style}
          >
            <div className="hamza-marquee-group flex shrink-0 items-center">{tickerItem}</div>
            <div className="hamza-marquee-group flex shrink-0 items-center" aria-hidden="true">{tickerItem}</div>
          </div>
        </div>
      ) : (
        <div dir={direction} className="px-4 py-3 text-center text-sm font-bold leading-7 md:text-base">
          {displayed.title && <span className="text-yellow-200">{displayed.title}</span>}
          {displayed.title && displayed.content && <span className="mx-2 text-white/40">—</span>}
          {displayed.content && <span>{displayed.content}</span>}
        </div>
      )}
      <style>{`
        /* hamzaAnnouncementTrack uses language-specific keyframes below. */
        @keyframes hamzaAnnouncementRight {
          from { transform: translate3d(-50%, 0, 0); }
          to { transform: translate3d(0, 0, 0); }
        }
        @keyframes hamzaAnnouncementLeft {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        .hamza-marquee-track[data-marquee-mechanics="ltr"] {
          direction: ltr;
        }
        .hamza-marquee-track[data-marquee-language="ar"] {
          animation: hamzaAnnouncementRight var(--marquee-duration) linear infinite;
        }
        .hamza-marquee-track[data-marquee-language="en"],
        .hamza-marquee-track[data-marquee-language="tr"] {
          animation: hamzaAnnouncementLeft var(--marquee-duration) linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hamza-marquee-track { animation: none !important; transform: none !important; white-space: normal; width: auto; }
          .hamza-marquee-track > [aria-hidden="true"] { display: none; }
        }
      `}</style>
    </div>
  );
}
