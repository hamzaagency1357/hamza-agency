"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SiteLanguage = "ar" | "en" | "tr";

type Program = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  is_active: boolean | null;
};

type ProgramMedia = {
  id: number;
  name: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
  page_slug: string | null;
  alt_text: string | null;
  is_active: boolean | null;
};

type TranslationRow = {
  source_id: string;
  field_name: "title" | "summary" | "content";
  language: "en" | "tr";
  translated_value: string | null;
};

type TranslationMap = Record<string, Partial<Record<TranslationRow["field_name"], string>>>;

const LANGUAGE_STORAGE_KEY = "hamza-agency-language";

function normalizeLanguage(value: string | null): SiteLanguage {
  if (value === "en" || value === "tr") return value;
  return "ar";
}

function getStoredLanguage(): SiteLanguage {
  if (typeof window === "undefined") return "ar";
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

function normalizeKey(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isImageMedia(item: ProgramMedia) {
  const fileType = (item.file_type || "").toLowerCase();
  const fileUrl = item.file_url || "";

  return (
    fileType === "image" ||
    fileType === "logo" ||
    fileType.startsWith("image") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileUrl)
  );
}

function getProgramLogoUrl(program: Program, mediaItems: ProgramMedia[]) {
  const slug = normalizeKey(program.slug);
  const name = normalizeKey(program.name);

  const scoredItems = mediaItems
    .filter(isImageMedia)
    .map((item) => {
      const pageSlug = normalizeKey(item.page_slug);
      const category = normalizeKey(item.category);
      const mediaName = normalizeKey(item.name || item.alt_text || "");
      const combined = `${pageSlug} ${category} ${mediaName}`;

      let score = 0;

      if (pageSlug === slug) score += 10;
      if (pageSlug === `program-${slug}` || pageSlug === `programs-${slug}`) score += 9;
      if (combined.includes(slug)) score += 6;
      if (name && combined.includes(name)) score += 4;
      if (combined.includes("program-logo") || combined.includes("programs-logo")) score += 4;
      if (combined.includes("logo")) score += 2;
      if (combined.includes("program")) score += 1;

      return { item, score };
    })
    .filter(({ score }) => score >= 6)
    .sort((a, b) => b.score - a.score);

  return scoredItems[0]?.item.file_url || null;
}

function getProgramVisual(slug: string, name: string) {
  const key = (slug || name || "").toLowerCase();

  if (key.includes("tiktok")) {
    return {
      icon: "♪",
      label: "فيديوهات قصيرة",
      accent: "#ff2f8b",
      secondary: "#22d3ee",
    };
  }

  if (key.includes("bigo")) {
    return {
      icon: "LIVE",
      label: "بث مباشر",
      accent: "#38bdf8",
      secondary: "#8b5cf6",
    };
  }

  if (key.includes("yaahlan")) {
    return {
      icon: "Y",
      label: "مجتمع وبث",
      accent: "#f59e0b",
      secondary: "#8b5cf6",
    };
  }

  if (key.includes("xena")) {
    return {
      icon: "X",
      label: "برنامج صناع المحتوى",
      accent: "#a855f7",
      secondary: "#06b6d4",
    };
  }

  if (key.includes("catchii")) {
    return {
      icon: "C",
      label: "محتوى اجتماعي",
      accent: "#ec4899",
      secondary: "#facc15",
    };
  }

  return {
    icon: "H",
    label: "برنامج وكالة",
    accent: "#7c3aed",
    secondary: "#d4af37",
  };
}

function getStatusLabel(status: string | null) {
  const value = (status || "active").toLowerCase();

  if (value === "limited") return "قبول محدود";
  if (value === "paused") return "متوقف مؤقتاً";
  if (value === "inactive") return "غير متاح";
  if (value === "closed") return "مغلق";

  return "متاح الآن";
}

function getStatusClass(status: string | null) {
  const value = (status || "active").toLowerCase();

  if (value === "limited") {
    return "rounded-full border border-yellow-400/30 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-200";
  }

  if (value === "paused" || value === "inactive" || value === "closed") {
    return "rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200";
  }

  return "rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-200";
}

function buildTranslationMap(rows: TranslationRow[]) {
  return rows.reduce((acc, row) => {
    acc[row.source_id] = acc[row.source_id] || {};
    if (row.translated_value?.trim()) {
      acc[row.source_id][row.field_name] = row.translated_value.trim();
    }
    return acc;
  }, {} as TranslationMap);
}

export default function ProgramsGridWithTranslations({
  programs,
  mediaItems,
}: {
  programs: Program[];
  mediaItems: ProgramMedia[];
}) {
  const [language, setLanguage] = useState<SiteLanguage>("ar");
  const [translations, setTranslations] = useState<TranslationMap>({});

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredLanguage());
    }

    syncLanguage();
    window.addEventListener("hamza-language-change", syncLanguage);
    window.addEventListener("storage", syncLanguage);

    return () => {
      window.removeEventListener("hamza-language-change", syncLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  useEffect(() => {
    async function loadTranslations() {
      if (!supabase || language === "ar") {
        setTranslations({});
        return;
      }

      const programIds = programs.map((program) => String(program.id));
      if (programIds.length === 0) {
        setTranslations({});
        return;
      }

      const { data, error } = await supabase
        .from("content_translations")
        .select("source_id, field_name, language, translated_value")
        .eq("source_type", "programs")
        .eq("language", language)
        .eq("is_published", true)
        .in("status", ["published", "reviewed"])
        .in("source_id", programIds);

      if (error || !data) {
        setTranslations({});
        return;
      }

      setTranslations(buildTranslationMap(data as TranslationRow[]));
    }

    loadTranslations();
  }, [language, programs]);

  const translatedPrograms = useMemo(
    () =>
      programs.map((program) => {
        const translation = translations[String(program.id)] || {};
        return {
          ...program,
          displayName: translation.title || program.name,
          displaySummary:
            translation.summary ||
            program.short_description ||
            program.description ||
            "برنامج متاح حالياً ضمن وكالة حمزة لصناع المحتوى.",
        };
      }),
    [programs, translations]
  );

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {translatedPrograms.map((program) => {
        const visual = getProgramVisual(program.slug, program.name);
        const logoUrl = getProgramLogoUrl(program, mediaItems);
        const programHref = program.slug ? `/programs/${program.slug}` : "/programs";

        return (
          <Link
            key={program.id}
            href={programHref}
            className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_35px_rgba(168,85,247,0.10)] backdrop-blur transition hover:-translate-y-1 hover:border-purple-400/50 hover:bg-purple-500/10"
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background: `linear-gradient(90deg, ${visual.accent}, ${visual.secondary})`,
              }}
            />

            <div className="mb-6 flex items-center justify-between gap-3">
              <div
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-2xl font-black shadow-[0_0_28px_rgba(168,85,247,0.18)]"
                style={{
                  background: logoUrl
                    ? "rgba(255,255,255,0.06)"
                    : `linear-gradient(135deg, ${visual.accent}, ${visual.secondary})`,
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${program.name} logo`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  visual.icon
                )}
              </div>

              <span className={getStatusClass(program.status)}>
                {getStatusLabel(program.status)}
              </span>
            </div>

            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/55">
              {visual.label}
            </div>

            <h2 className="text-3xl font-black">{program.displayName}</h2>

            <p className="mt-4 min-h-24 leading-8 text-white/70">
              {program.displaySummary}
            </p>

            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="text-sm text-white/45">
                اضغط لعرض الشروط والتفاصيل
              </div>

              <div className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-black transition group-hover:scale-105">
                التفاصيل
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
