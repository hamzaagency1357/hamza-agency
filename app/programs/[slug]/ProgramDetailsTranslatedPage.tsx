"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { getLanguageDirection, type SiteLanguage } from "@/lib/i18n/locale";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { programDetailsCopy, type ProgramDetailsCopy } from "@/lib/programs/detailsCopy";
import {
  defaultProgramVisual,
  programNames,
  programVisuals,
  type ProgramVisual,
  visualLabelKeys,
} from "@/lib/programs/detailsPresentation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type DetailField = "title" | "summary" | "content" | "requirements" | "benefits" | "updates" | "faq";
type TranslationMap = Partial<Record<DetailField, string>>;
type TranslationRow = { field_name: DetailField | null; translated_value: string | null };
type Program = { id: number; name: string; slug: string; description: string | null; short_description: string | null; status: string | null; requirements: string | null; benefits: string | null; faq: string | null; updates: string | null };
type MediaItem = { name: string | null; file_url: string | null; file_type: string | null; category: string | null; alt_text: string | null; page_slug: string | null };
type Setting = { setting_key: string | null; setting_value: string | null };

const requiredFields: DetailField[] = ["title", "summary", "content", "requirements", "benefits", "updates", "faq"];
const brandSlugs = new Set(["tiktok", "bigo-live", "yaahlan", "xena", "catchii"]);

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function isBrandProgram(program: Program) {
  return brandSlugs.has(normalize(program.slug)) || brandSlugs.has(normalize(program.name));
}

function getFallbackProgram(slug: string): Program | null {
  const visual = programVisuals[slug];
  const name = programNames[slug];
  if (!visual || !name) return null;
  return { id: Object.keys(programNames).indexOf(slug) + 1, name, slug, description: visual.fallbackDescription, short_description: visual.fallbackDescription, status: "active", requirements: visual.fallbackRequirements, benefits: visual.fallbackBenefits, updates: visual.fallbackUpdates, faq: visual.fallbackFaq };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value?.trim()) return value.trim();
  }
  return fallback;
}

function findProgramBackground(mediaItems: MediaItem[], slug: string, programName: string) {
  const normalizedName = normalize(programName);
  const candidates = [slug, `program-${slug}`, `programs-${slug}`, `programs/${slug}`, `/programs/${slug}`, normalizedName];
  const direct = mediaItems.find((item) => candidates.includes(item.page_slug || "") && item.category === "background" && ["background_video", "video", "image", "generated_background"].includes(item.file_type || ""));
  if (direct) return direct;
  return mediaItems.find((item) => item.category === "background" && `${item.name || ""} ${item.alt_text || ""}`.toLowerCase().includes(slug)) || null;
}

function getStatusLabel(status: string | null, text: ProgramDetailsCopy) {
  const value = (status || "active").toLowerCase();
  if (value === "limited") return text.limited;
  if (value === "paused") return text.paused;
  if (value === "inactive" || value === "closed") return text.unavailable;
  return text.available;
}

export default function ProgramDetailsTranslatedPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const requestedLanguage = useSiteLanguage();
  const [program, setProgram] = useState<Program | null>(() => getFallbackProgram(slug));
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ fullName: "", country: "", whatsapp: "", previousExperience: "", notes: "" });

  useEffect(() => {
    const fallback = getFallbackProgram(slug);
    setProgram(fallback);
    setTranslations({});

    async function loadProgramData() {
      if (!isSupabaseConfigured || !supabase || !slug) return;
      setIsRefreshing(true);
      const [programResult, mediaResult, settingsResult] = await Promise.all([
        supabase.from("programs").select("id, name, slug, description, short_description, status, requirements, benefits, faq, updates").eq("slug", slug).maybeSingle(),
        supabase.from("media").select("name, file_url, file_type, category, alt_text, page_slug").eq("is_active", true),
        supabase.from("settings").select("setting_key, setting_value").eq("is_public", true),
      ]);
      if (!mediaResult.error && mediaResult.data) setMediaItems(mediaResult.data as MediaItem[]);
      if (!settingsResult.error && settingsResult.data) setSettings(settingsResult.data as Setting[]);
      if (programResult.error || !programResult.data) {
        setProgram(fallback);
        setIsRefreshing(false);
        return;
      }

      const source = programResult.data as Program;
      setProgram(source);
      if (requestedLanguage === "ar") {
        setIsRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from("content_translations")
        .select("field_name, translated_value")
        .eq("source_type", "programs")
        .eq("source_id", String(source.id))
        .eq("language", requestedLanguage)
        .eq("is_published", true)
        .in("status", ["published", "reviewed"])
        .in("field_name", requiredFields);

      if (!error && data) {
        const next = (data as TranslationRow[]).reduce((result, row) => {
          if (row.field_name && requiredFields.includes(row.field_name) && row.translated_value?.trim()) result[row.field_name] = row.translated_value.trim();
          return result;
        }, {} as TranslationMap);
        setTranslations(next);
      }
      setIsRefreshing(false);
    }

    void loadProgramData();
  }, [slug, requestedLanguage]);

  const isComplete = requestedLanguage !== "ar" && requiredFields.every((field) => Boolean(translations[field]?.trim()));
  const language: SiteLanguage = isComplete ? requestedLanguage : "ar";
  const text = programDetailsCopy[language];
  const visual = useMemo(() => programVisuals[slug] || defaultProgramVisual, [slug]);
  const translatedVisualLabel = getStaticCopy(language, visualLabelKeys[slug] || "programsVisualAgency");
  const displayProgram = useMemo(() => {
    if (!program || !isComplete) return program;
    return { ...program, name: isBrandProgram(program) ? program.name : translations.title || program.name, short_description: translations.summary || program.short_description, description: translations.content || program.description, requirements: translations.requirements || program.requirements, benefits: translations.benefits || program.benefits, updates: translations.updates || program.updates, faq: translations.faq || program.faq };
  }, [program, isComplete, translations]);
  const backgroundMedia = useMemo(() => findProgramBackground(mediaItems, slug, program?.name || ""), [mediaItems, slug, program?.name]);
  const primaryWhatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!program || !displayProgram) return;
    if (!form.fullName || !form.country || !form.whatsapp) return setMessage(text.required);
    if (!isSupabaseConfigured || !supabase) return setMessage(text.databaseUnavailable);

    const sourceProgramName = program.name;
    const duplicateKey = `hamza-agency-${form.whatsapp}-${sourceProgramName}`;
    if (localStorage.getItem(duplicateKey)) return setMessage(text.duplicate);

    setIsSubmitting(true);
    const { error } = await supabase.from("agency_applications").insert({ full_name: form.fullName.trim(), country: form.country.trim(), whatsapp: form.whatsapp.trim(), platform: sourceProgramName, previous_experience: form.previousExperience.trim(), notes: form.notes.trim(), status: "new" });
    setIsSubmitting(false);
    if (error) return setMessage(text.submitError);

    localStorage.setItem(duplicateKey, "true");
    setMessage(text.submitSuccess);
    setForm({ fullName: "", country: "", whatsapp: "", previousExperience: "", notes: "" });
    window.setTimeout(() => { setMessage(""); setShowForm(false); }, 3000);
  }

  if (!displayProgram) {
    return <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] px-5 py-20 text-white"><ProgramAnimationStyles /><ProgramBackground media={null} visual={defaultProgramVisual} /><section className="relative z-20 mx-auto max-w-5xl"><h1 className="text-4xl font-black">{programDetailsCopy.ar.notFound}</h1><p className="mt-5 max-w-2xl leading-8 text-white/65">{programDetailsCopy.ar.notFoundDescription}</p><Link href="/programs" className="mt-8 inline-block text-purple-300">{programDetailsCopy.ar.back}</Link></section></main>;
  }

  const description = displayProgram.description || displayProgram.short_description || visual.fallbackDescription;
  const requirements = displayProgram.requirements || visual.fallbackRequirements;
  const benefits = displayProgram.benefits || visual.fallbackBenefits;
  const updates = displayProgram.updates || visual.fallbackUpdates;
  const faq = displayProgram.faq || visual.fallbackFaq;
  const statusClass = displayProgram.status === "limited" ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-200" : displayProgram.status === "paused" || displayProgram.status === "inactive" || displayProgram.status === "closed" ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-green-400/30 bg-green-500/10 text-green-200";

  return (
    <main dir={getLanguageDirection(language)} className="relative min-h-screen overflow-hidden bg-[#070009] text-white" style={{ "--program-accent": visual.accent, "--program-secondary": visual.secondary } as CSSProperties}>
      <ProgramAnimationStyles />
      <ProgramBackground media={backgroundMedia} visual={visual} />
      <section className="relative z-20 mx-auto max-w-6xl px-5 py-14">
        <Link href="/programs" className="mb-8 inline-block text-purple-200">{text.back}</Link>
        <div className="relative overflow-hidden rounded-[2rem] border border-purple-400/20 bg-black/40 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/[0.04] via-transparent to-purple-500/5" />
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/75">{isComplete ? translatedVisualLabel : visual.badge}</div>
          {isRefreshing && <div className="mb-4 inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-100">{text.refreshing}</div>}
          <span className={`rounded-full border px-4 py-2 text-sm font-bold ${statusClass}`}>{getStatusLabel(displayProgram.status, text)}</span>
          {!isComplete && <p className="mt-7 text-sm font-bold uppercase tracking-[0.28em] text-purple-200" dir="ltr">{visual.label}</p>}
          <h1 className="mt-4 text-5xl font-black md:text-7xl">{displayProgram.name}</h1>
          <p className="mt-8 max-w-4xl text-xl leading-10 text-white/78">{description}</p>
          <button onClick={() => setShowForm(true)} className="mt-8 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black shadow-[0_0_30px_rgba(168,85,247,0.26)] transition hover:scale-[1.01]">{text.join}</button>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2"><InfoCard title={text.requirements} content={requirements} tone="gold" /><InfoCard title={text.benefits} content={benefits} tone="purple" /></div>
        <InfoCard title={text.updates} content={updates} tone="cyan" />
        <InfoCard title={text.faq} content={faq} tone="pink" />
      </section>
      {showForm && <ApplicationModal text={text} programName={displayProgram.name} form={form} setForm={setForm} message={message} submitting={isSubmitting} onClose={() => { setMessage(""); setShowForm(false); }} onSubmit={handleSubmit} />}
      <a href={`https://wa.me/${primaryWhatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="fixed bottom-5 left-5 z-30 rounded-full bg-green-500 px-5 py-4 text-sm font-black text-white shadow-2xl">WhatsApp</a>
    </main>
  );
}

function InfoCard({ title, content, tone }: { title: string; content: string; tone: "purple" | "gold" | "cyan" | "pink" }) {
  const tones = { purple: "border-purple-400/20 bg-purple-500/10", gold: "border-yellow-400/20 bg-yellow-500/10", cyan: "border-cyan-400/20 bg-cyan-500/10", pink: "border-pink-400/20 bg-pink-500/10" };
  return <div className={`mt-8 rounded-[2rem] border p-6 backdrop-blur ${tones[tone]}`}><h2 className="text-3xl font-black">{title}</h2><p className="mt-4 whitespace-pre-wrap leading-9 text-white/72">{content}</p></div>;
}

function ApplicationModal({ text, programName, form, setForm, message, submitting, onClose, onSubmit }: { text: ProgramDetailsCopy; programName: string; form: { fullName: string; country: string; whatsapp: string; previousExperience: string; notes: string }; setForm: React.Dispatch<React.SetStateAction<{ fullName: string; country: string; whatsapp: string; previousExperience: string; notes: string }>>; message: string; submitting: boolean; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur"><div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6 shadow-[0_0_80px_rgba(168,85,247,0.25)]"><div className="mb-6 flex items-center justify-between gap-4"><button onClick={onClose} className="rounded-full border border-white/15 px-5 py-2 text-white/70">{text.close}</button><h2 className="text-3xl font-black">{text.formTitle} {programName}</h2></div><form onSubmit={onSubmit} className="space-y-5"><input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder={text.fullName} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" /><input value={form.country} onChange={(event) => update("country", event.target.value)} placeholder={text.country} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" /><input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} placeholder={text.whatsapp} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" /><div className="rounded-3xl border border-white/10 bg-black/30 p-5"><h3 className="mb-3 text-2xl font-black">{text.experience}</h3><p className="mb-4 text-lg text-purple-200">{text.experienceDescription}</p><textarea value={form.previousExperience} onChange={(event) => update("previousExperience", event.target.value)} placeholder={text.experience} className="min-h-40 w-full resize-none bg-transparent text-xl outline-none" /></div><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder={text.notes} className="min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />{message && <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-center text-xl font-bold text-yellow-100">{message}</div>}<button type="submit" disabled={submitting} className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black disabled:opacity-60">{submitting ? text.submitting : text.submit}</button></form></div></div>;
}

function ProgramBackground({ media, visual }: { media: MediaItem | null; visual: ProgramVisual }) {
  const url = media?.file_url || "";
  const type = media?.file_type || "";
  const usable = url.startsWith("http") || url.startsWith("/");
  const video = type === "video" || type === "background_video" || /\.(mp4|webm|ogg)$/i.test(url);
  const image = type === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  if (usable && video) return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><video className="h-full w-full object-cover opacity-35" src={url} autoPlay loop muted playsInline /><div className="absolute inset-0 bg-[#070009]/78" /><div className="absolute inset-0" style={{ background: `radial-gradient(circle at top, ${visual.accent}42, transparent 50%)` }} /></div>;
  if (usable && image) return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-cover bg-center opacity-32" style={{ backgroundImage: `url("${url}")` }} /><div className="absolute inset-0 bg-[#070009]/80" /><div className="absolute inset-0" style={{ background: `radial-gradient(circle at top, ${visual.accent}42, transparent 50%)` }} /></div>;
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 0%, ${visual.accent}44 0%, rgba(7,0,9,0.98) 70%)` }} /><div className="program-soft-glow absolute -left-24 top-10 h-80 w-80 rounded-full blur-3xl md:h-[460px] md:w-[460px]" style={{ backgroundColor: `${visual.accent}26` }} /><div className="program-soft-glow-two absolute -right-28 top-40 hidden h-[430px] w-[430px] rounded-full blur-3xl md:block" style={{ backgroundColor: `${visual.secondary}20` }} /><div className="absolute inset-0 opacity-12 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" /><ProgramSpecificVisual variant={visual.variant} /></div>;
}

function ProgramSpecificVisual({ variant }: { variant: string }) {
  if (variant === "tiktok") return <div className="hidden md:block"><div className="program-float absolute left-[12%] top-[28%] h-48 w-28 rounded-[2rem] border border-pink-300/20 bg-pink-500/8 backdrop-blur" /><div className="program-float-reverse absolute right-[14%] top-[40%] h-44 w-28 rounded-[2rem] border border-cyan-300/18 bg-cyan-400/8 backdrop-blur" /></div>;
  if (variant === "bigo") return <div className="hidden md:block"><div className="program-ring absolute left-1/2 top-[26%] h-[340px] w-[340px] -translate-x-1/2 rounded-full border border-sky-300/18" /><div className="program-dot absolute left-[22%] top-[34%] h-3 w-3 rounded-full bg-sky-300/70 shadow-[0_0_24px_rgba(125,211,252,0.7)]" /></div>;
  if (variant === "yaahlan") return <div className="hidden md:block"><div className="program-float absolute left-[10%] top-[30%] h-16 w-36 rounded-3xl border border-amber-300/18 bg-amber-400/8 backdrop-blur" /><div className="program-float-reverse absolute right-[12%] top-[42%] h-16 w-40 rounded-3xl border border-purple-300/18 bg-purple-400/8 backdrop-blur" /></div>;
  if (variant === "xena") return <div className="hidden md:block"><div className="program-ring absolute left-1/2 top-[28%] h-60 w-60 -translate-x-1/2 rounded-full border border-purple-300/18 bg-purple-500/5" /><div className="program-float absolute left-[18%] top-[42%] h-16 w-16 rotate-45 border border-cyan-300/16 bg-cyan-500/8" /></div>;
  if (variant === "catchii") return <div className="hidden md:block"><div className="program-float absolute left-[12%] top-[30%] h-24 w-40 rounded-[2rem] border border-pink-300/18 bg-pink-500/8 backdrop-blur" /><div className="program-float-reverse absolute right-[12%] top-[42%] h-24 w-40 rounded-[2rem] border border-yellow-300/18 bg-yellow-500/8 backdrop-blur" /></div>;
  return <div className="hidden md:block"><div className="program-ring absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full border border-purple-300/18" /></div>;
}

function ProgramAnimationStyles() {
  return <style>{`
    @keyframes programSoftGlow { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.65; } 50% { transform: translate3d(28px, 22px, 0) scale(1.05); opacity: 0.9; } }
    @keyframes programSoftGlowTwo { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.45; } 50% { transform: translate3d(-26px, 18px, 0) scale(1.04); opacity: 0.72; } }
    @keyframes programFloatLight { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
    @keyframes programFloatLightReverse { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(12px); } }
    @keyframes programRingLight { 0%, 100% { opacity: 0.16; transform: translateX(-50%) scale(0.98); } 50% { opacity: 0.32; transform: translateX(-50%) scale(1.03); } }
    .program-soft-glow { animation: programSoftGlow 18s ease-in-out infinite; }
    .program-soft-glow-two { animation: programSoftGlowTwo 22s ease-in-out infinite; }
    .program-float { animation: programFloatLight 16s ease-in-out infinite; }
    .program-float-reverse { animation: programFloatLightReverse 18s ease-in-out infinite; }
    .program-ring { animation: programRingLight 14s ease-in-out infinite; }
    .program-dot { animation: programFloatLight 12s ease-in-out infinite; }
    @media (max-width: 768px) { .program-soft-glow, .program-soft-glow-two, .program-float, .program-float-reverse, .program-ring, .program-dot { animation: none !important; } }
    @media (prefers-reduced-motion: reduce) { .program-soft-glow, .program-soft-glow-two, .program-float, .program-float-reverse, .program-ring, .program-dot { animation: none !important; } }
  `}</style>;
}
