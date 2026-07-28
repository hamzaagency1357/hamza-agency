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

type Announcement = {
  id: number;
  title: string | null;
  content: string | null;
};

type Field = "title" | "content";
type Animation = "fixed" | "marquee";

const fields: Field[] = ["title", "content"];
const safeFallback = {
  en: {
    title: "HAMZA AGENCY",
    content: "Follow the latest agency updates, programs, and opportunities.",
  },
  tr: {
    title: "HAMZA AGENCY",
    content: "Ajansın güncel duyurularını, programlarını ve fırsatlarını takip edin.",
  },
};

function isPlaceholder(value: string) {
  return (
    value.includes("Localized content is being updated") ||
    value.includes("Yerelleştirilmiş içerik güncelleniyor")
  );
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
  const [translations, setTranslations] = useState<
    PublishedTranslationMap<Field>
  >({});

  useEffect(() => {
    let active = true;
    setTranslations({});

    if (language === "ar" || !announcement?.id) {
      return () => {
        active = false;
      };
    }

    async function load() {
      const map = await readPublishedTranslations<Field>({
        sourceType: "announcements",
        language,
        sourceIds: [announcement.id],
        fields,
      });
      if (active) setTranslations(map);
    }

    void load();
    return () => {
      active = false;
    };
  }, [announcement?.id, language]);

  const displayed = useMemo(() => {
    if (language === "ar") {
      return {
        title: sanitizeMarketingCopy(announcement.title || "", "ar"),
        content: sanitizeMarketingCopy(announcement.content || "", "ar"),
      };
    }

    const current = translations[String(announcement.id)];
    if (hasCompletePublishedTranslation(current, fields)) {
      return {
        title: sanitizeMarketingCopy(current?.title || "", language),
        content: sanitizeMarketingCopy(current?.content || "", language),
      };
    }

    const localizedTitle = translateSiteRuntimeText(
      announcement.title || "",
      language
    );
    const localizedContent = translateSiteRuntimeText(
      announcement.content || "",
      language
    );

    return {
      title:
        localizedTitle.trim() && !isPlaceholder(localizedTitle)
          ? localizedTitle
          : safeFallback[language].title,
      content:
        localizedContent.trim() && !isPlaceholder(localizedContent)
          ? localizedContent
          : safeFallback[language].content,
    };
  }, [announcement, language, translations]);

  const text = `${displayed.title || ""} — ${displayed.content || ""}`.trim();
  if (!text) return null;

  const duration = Math.min(Math.max(Number(speed) || 22, 16), 60);
  const marqueeStyle = {
    "--marquee-duration": `${duration}s`,
  } as CSSProperties;

  const segment = (
    <span className="hamza-marquee-segment inline-flex shrink-0 items-center gap-10 px-10">
      <span>{text}</span>
      <span aria-hidden="true" className="text-yellow-300/65">
        ✦
      </span>
    </span>
  );

  return (
    <div
      lang={language}
      dir={direction}
      data-announcement-locale={language}
      aria-label={displayed.title || "HAMZA AGENCY"}
      className={`overflow-hidden border border-yellow-400/20 bg-yellow-400/10 text-yellow-100 shadow-[0_0_35px_rgba(212,175,55,0.12)] backdrop-blur ${
        rounded ? "rounded-2xl" : "border-x-0"
      }`}
    >
      {animation === "marquee" ? (
        <div className="hamza-marquee-viewport overflow-hidden">
          <div
            className="hamza-marquee-track flex w-max max-w-none items-center whitespace-nowrap py-3 text-sm font-bold md:text-base"
            data-marquee-direction={direction}
            style={marqueeStyle}
          >
            <div className="hamza-marquee-group flex shrink-0 items-center">
              {segment}
              {segment}
            </div>
            <div
              aria-hidden="true"
              className="hamza-marquee-group flex shrink-0 items-center"
            >
              {segment}
              {segment}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-center text-sm font-bold leading-7 md:text-base">
          <span className="text-yellow-200">{displayed.title}</span>
          <span className="mx-2 text-white/40">—</span>
          <span>{displayed.content}</span>
        </div>
      )}

      <style>{`
        @keyframes hamzaAnnouncementLtr {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes hamzaAnnouncementRtl {
          from { transform: translate3d(-50%, 0, 0); }
          to { transform: translate3d(0, 0, 0); }
        }
        .hamza-marquee-track[data-marquee-direction="ltr"] {
          animation: hamzaAnnouncementLtr var(--marquee-duration, 22s) linear infinite !important;
        }
        .hamza-marquee-track[data-marquee-direction="rtl"] {
          direction: rtl;
          animation: hamzaAnnouncementRtl var(--marquee-duration, 22s) linear infinite !important;
        }
        .hamza-marquee-group { min-width: max-content; }
        @media (max-width: 768px) {
          .hamza-marquee-segment { gap: 1.75rem; padding-inline: 1.75rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hamza-marquee-track {
            animation: none !important;
            transform: none !important;
            white-space: normal !important;
            width: auto !important;
          }
          .hamza-marquee-group[aria-hidden="true"] { display: none; }
        }
      `}</style>
    </div>
  );
}
