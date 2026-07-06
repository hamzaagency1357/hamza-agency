"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { hasCompletePublishedTranslation, readPublishedTranslations, type PublishedTranslationMap } from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type Announcement = { id: number; title: string | null; content: string | null };
type Field = "title" | "content";
type Animation = "fixed" | "marquee";
const fields: Field[] = ["title", "content"];

export default function PublishedAnnouncementBar({ announcement, animation, speed, rounded = false }: { announcement: Announcement; animation: Animation; speed: number; rounded?: boolean }) {
  const language = useSiteLanguage();
  const [translations, setTranslations] = useState<PublishedTranslationMap<Field>>({});
  useEffect(() => { let active = true; setTranslations({}); if (language === "ar" || !announcement?.id) return () => { active = false; }; async function load() { const map = await readPublishedTranslations<Field>({ sourceType: "announcements", language, sourceIds: [announcement.id], fields }); if (active) setTranslations(map); } void load(); return () => { active = false; }; }, [announcement?.id, language]);
  const displayed = useMemo(() => { const current = translations[String(announcement.id)]; const complete = language !== "ar" && hasCompletePublishedTranslation(current, fields); return complete ? { title: current?.title || announcement.title, content: current?.content || announcement.content } : announcement; }, [announcement, language, translations]);
  const text = `${displayed.title || ""} — ${displayed.content || ""}`;
  if (!text.trim()) return null;
  return <div dir={language === "ar" ? "rtl" : "ltr"} className={`overflow-hidden border border-yellow-400/20 bg-yellow-400/10 text-yellow-100 shadow-[0_0_35px_rgba(212,175,55,0.12)] backdrop-blur ${rounded ? "rounded-2xl" : "border-x-0"}`}>{animation === "marquee" ? <div className="hamza-marquee-track flex w-max whitespace-nowrap py-3 text-sm font-bold md:text-base" style={{ "--marquee-duration": `${speed || 22}s` } as CSSProperties}><span className="mx-8">{text}</span><span className="mx-8">{text}</span><span className="mx-8">{text}</span><span className="mx-8">{text}</span></div> : <div className="px-4 py-3 text-center text-sm font-bold md:text-base"><span className="text-yellow-200">{displayed.title}</span><span className="mx-2 text-white/40">—</span><span>{displayed.content}</span></div>}</div>;
}
