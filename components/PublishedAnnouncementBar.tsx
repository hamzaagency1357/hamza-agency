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
    const complete = hasCompletePublishedTranslation(current, fields);

    if (complete) {
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
        localizedTitle.trim() &&
        !localizedTitle.includes("Localized content") &&
        !localizedTitle.includes("Yerelleştirilmiş içerik")
          ? localizedTitle
          : safeFallback[language].title,
      content:
        localizedContent.trim() &&
        !localizedContent.includes("Localized content") &&
        !localizedContent.includes("Yerelleştirilmiş içerik")
          ? localizedContent
          : safeFallback[language].content,
    };
  }, [announcement, language, translations]);

  const text = `${displayed.title || ""} — ${displayed.content || ""}`.trim();

  if (!text) return null;

  const duration = Math.min(Math.max(Number(speed) || 22, 12), 60);
  const marqueeStyle = {
    "--marquee-duration": `${duration}s`,
  } as CSSProperties;

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
        <div
          className="hamza-marquee-track flex w-max max-w-none items-center whitespace-nowrap py-3 text-sm font-bold md:text-base"
          data-marquee-direction={direction}
          style={marqueeStyle}
        >
          {[0, 1, 2, 3].map((item) => (
            <span key={item} aria-hidden={item > 0} className="mx-8">
              {text}
            </span>
          ))}
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
          to { transform: translate3d(-25%, 0, 0); }
        }

        @keyframes hamzaAnnouncementRtl {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(25%, 0, 0); }
        }

        .hamza-marquee-track[data-marquee-direction="ltr"] {
          animation: hamzaAnnouncementLtr var(--marquee-duration, 22s) linear infinite !important;
        }

        .hamza-marquee-track[data-marquee-direction="rtl"] {
          animation: hamzaAnnouncementRtl var(--marquee-duration, 22s) linear infinite !important;
        }

        @media (max-width: 768px) {
          .hamza-marquee-track span {
            max-width: 86vw;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hamza-marquee-track {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
