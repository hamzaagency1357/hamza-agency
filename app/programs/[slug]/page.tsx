"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { programDetailsCopy, usePublishedProgramDetailsTranslation } from "@/lib/i18n/programDetailsReader";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Program = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: string | null;
  requirements: string | null;
  benefits: string | null;
  faq: string | null;
  updates: string | null;
};

type MediaItem = {
  name: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
  alt_text: string | null;
  page_slug: string | null;
  is_active: boolean | null;
};

type Setting = {
  setting_key: string | null;
  setting_value: string | null;
  setting_group: string | null;
  is_public: boolean | null;
};

type ProgramVisual = {
  variant: string;
  label: string;
  accent: string;
  secondary: string;
  badge: string;
  fallbackDescription: string;
  fallbackRequirements: string;
  fallbackBenefits: string;
  fallbackUpdates: string;
  fallbackFaq: string;
};

const programVisuals: Record<string, ProgramVisual> = {
  tiktok: {
    variant: "tiktok",
    label: "Short Video Creator Program",
    accent: "#ff2f8b",
    secondary: "#22d3ee",
    badge: "فيديوهات قصيرة • صناع محتوى • نمو سريع",
    fallbackDescription:
      "برنامج TikTok مخصص لصناع المحتوى الذين يريدون تطوير ظهورهم، تحسين جودة المحتوى، وفهم طريقة العمل داخل الوكالة بشكل احترافي.",
    fallbackRequirements:
      "العمر 18 سنة أو أكثر\nحساب TikTok نشط\nالالتزام بسياسات المنصة\nالقدرة على إنشاء محتوى أو بث بشكل منتظم",
    fallbackBenefits:
      "دعم فني ومتابعة\nتطوير الحساب وتحسين الأداء\nإرشاد حول المحتوى المناسب\nمساعدة في حل المشاكل التقنية",
    fallbackUpdates: "تم فتح باب الانضمام لبرنامج TikTok عبر وكالة حمزة.",
    fallbackFaq:
      "هل القبول مضمون؟\nيتم مراجعة كل طلب حسب معلومات الحساب ونشاط المتقدم.\n\nهل أحتاج عدد متابعين محدد؟\nلا نعتمد على رقم ثابت فقط، بل ننظر إلى الجدية ونوع المحتوى.",
  },
  "bigo-live": {
    variant: "bigo",
    label: "Live Streaming Creator Program",
    accent: "#38bdf8",
    secondary: "#a855f7",
    badge: "بث مباشر • لايف • دعم يومي",
    fallbackDescription:
      "برنامج BIGO LIVE مناسب لصناع المحتوى المهتمين بالبث المباشر، بناء جمهور نشط، وتحسين طريقة الظهور والتفاعل داخل اللايف.",
    fallbackRequirements:
      "العمر 18 سنة أو أكثر\nالقدرة على الظهور أو إدارة بث مباشر\nالتزام واحترام قوانين البرنامج\nرقم واتساب للتواصل والمتابعة",
    fallbackBenefits:
      "متابعة أداء البث\nإرشاد حول أسلوب اللايف\nدعم في مشاكل الحساب\nتوجيه لتحسين التفاعل مع الجمهور",
    fallbackUpdates: "برنامج BIGO LIVE متاح حالياً للتقديم من خلال وكالة حمزة.",
    fallbackFaq:
      "هل أحتاج خبرة بث؟\nالخبرة تساعد، لكن يمكن قبول المبتدئين الجادين.\n\nهل يوجد تدريب؟\nنعم، يتم توجيه المقبولين حسب وضع حسابهم.",
  },
  yaahlan: {
    variant: "yaahlan",
    label: "Community Live Program",
    accent: "#f59e0b",
    secondary: "#8b5cf6",
    badge: "مجتمع • تواصل • بث مباشر",
    fallbackDescription:
      "برنامج Yaahlan يركز على بناء حضور اجتماعي وتفاعل مباشر مع الجمهور، مع دعم وكالة حمزة في المتابعة والتوجيه.",
    fallbackRequirements:
      "حساب نشط أو رغبة جدية بالبدء\nالتزام بالتواصل والمتابعة\nاحترام سياسات المنصة\nتوفر رقم واتساب صحيح",
    fallbackBenefits:
      "تعريف بطريقة العمل\nمتابعة الطلبات والمشاكل\nمساعدة في تحسين الحساب\nدعم في خطوات الانضمام",
    fallbackUpdates: "التقديم على Yaahlan متاح حالياً عبر وكالة حمزة.",
    fallbackFaq:
      "هل البرنامج مناسب للمبتدئين؟\nنعم، إذا كان المتقدم جاداً وقادراً على الالتزام.\n\nكيف تتم المتابعة؟\nغالباً عبر واتساب بعد مراجعة الطلب.",
  },
  xena: {
    variant: "xena",
    label: "Future Creator Program",
    accent: "#a855f7",
    secondary: "#06b6d4",
    badge: "Creator Program • مستقبل المحتوى • وكالة",
    fallbackDescription:
      "برنامج Xena مناسب لصناع المحتوى الراغبين بالانضمام إلى برنامج منظم مع متابعة إدارية ودعم لتطوير الحساب.",
    fallbackRequirements:
      "العمر المناسب حسب شروط البرنامج\nحساب نشط أو قابل للتطوير\nالالتزام بالتعليمات\nتقديم معلومات صحيحة",
    fallbackBenefits:
      "دعم فني وإداري\nمتابعة حالة الحساب\nتوجيه لصانع المحتوى\nمساعدة في فهم نظام البرنامج",
    fallbackUpdates: "برنامج Xena متاح حالياً ضمن برامج وكالة حمزة.",
    fallbackFaq:
      "هل يتم التواصل بعد التقديم؟\nبعد مراجعة الطلب، قد يتواصل فريق الوكالة عبر واتساب.\n\nهل أستطيع التقديم بدون خبرة؟\nنعم، لكن الخبرة السابقة تساعد في التقييم.",
  },
  catchii: {
    variant: "catchii",
    label: "Social Creator Program",
    accent: "#ec4899",
    secondary: "#facc15",
    badge: "Social • Entertainment • Creator Growth",
    fallbackDescription:
      "برنامج Catchii مناسب لصناع المحتوى المهتمين بالتواصل والترفيه وبناء حضور اجتماعي ضمن بيئة وكالة احترافية.",
    fallbackRequirements:
      "حساب أو رغبة جدية بالعمل\nالتزام بسياسات البرنامج\nقدرة على التواصل والمتابعة\nمعلومات تواصل صحيحة",
    fallbackBenefits:
      "مساعدة في خطوات البداية\nدعم في المشاكل التقنية\nمتابعة وتوجيه\nإرشاد لتحسين جودة الحساب",
    fallbackUpdates: "برنامج Catchii متاح حالياً للتقديم عبر وكالة حمزة.",
    fallbackFaq:
      "هل يمكنني التقديم من أي دولة؟\nيمكنك التقديم، وتتم المراجعة حسب شروط البرنامج.\n\nهل التواصل يكون واتساب؟\nنعم، بعد المراجعة قد يتم التواصل عبر واتساب.",
  },
};

const programNames: Record<string, string> = {
  tiktok: "TikTok",
  "bigo-live": "BIGO LIVE",
  yaahlan: "Yaahlan",
  xena: "Xena",
  catchii: "Catchii",
};

const translatedVisualBadges = {
  tiktok: { en: "Short videos", tr: "Kısa videolar" },
  "bigo-live": { en: "Live streaming", tr: "Canlı yayın" },
  yaahlan: { en: "Community and live", tr: "Topluluk ve canlı yayın" },
  xena: { en: "Creator program", tr: "İçerik üreticisi programı" },
  catchii: { en: "Social content", tr: "Sosyal içerik" },
  default: { en: "Agency program", tr: "Ajans programı" },
} as const;

const defaultVisual: ProgramVisual = {
  variant: "programs",
  label: "Creator Agency Program",
  accent: "#7c3aed",
  secondary: "#d4af37",
  badge: "برنامج صناع محتوى • وكالة حمزة",
  fallbackDescription:
    "هذا البرنامج جزء من منظومة وكالة حمزة لدعم صناع المحتوى ومساعدتهم على الانضمام للبرامج المناسبة وتطوير حضورهم.",
  fallbackRequirements:
    "تقديم معلومات صحيحة\nرقم واتساب فعال\nالالتزام بشروط المنصة\nالجدية في العمل والمتابعة",
  fallbackBenefits:
    "دعم إداري وفني\nمتابعة الطلب\nإرشاد لصانع المحتوى\nمساعدة في حل المشاكل التقنية",
  fallbackUpdates: "هذا البرنامج متاح للتقديم حالياً عبر وكالة حمزة.",
  fallbackFaq:
    "هل القبول مضمون؟\nكل طلب يخضع للمراجعة.\n\nكيف أعرف حالة طلبي؟\nيمكنك متابعة طلبك من صفحة تتبع طلب الانضمام أو التواصل عبر واتساب.",
};

function getFallbackProgram(slug: string): Program | null {
  const visual = programVisuals[slug];
  const name = programNames[slug];

  if (!visual || !name) return null;

  return {
    id: Object.keys(programNames).indexOf(slug) + 1,
    name,
    slug,
    description: visual.fallbackDescription,
    short_description: visual.fallbackDescription,
    status: "active",
    requirements: visual.fallbackRequirements,
    benefits: visual.fallbackBenefits,
    updates: visual.fallbackUpdates,
    faq: visual.fallbackFaq,
  };
}

export default function ProgramDetailsPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const requestedLanguage = useSiteLanguage();

  const [program, setProgram] = useState<Program | null>(() => getFallbackProgram(slug));
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    country: "",
    whatsapp: "",
    previousExperience: "",
    notes: "",
  });
  const { translations, isComplete, isLoading: isTranslationLoading } = usePublishedProgramDetailsTranslation(
    program?.id,
    requestedLanguage
  );

  useEffect(() => {
    const fallbackProgram = getFallbackProgram(slug);
    setProgram(fallbackProgram);

    async function loadProgramPageData() {
      if (!isSupabaseConfigured || !supabase || !slug) return;

      setIsRefreshing(true);

      const [programResult, mediaResult, settingsResult] = await Promise.all([
        supabase
          .from("programs")
          .select("id, name, slug, description, short_description, status, requirements, benefits, faq, updates")
          .eq("slug", slug)
          .maybeSingle(),
        supabase
          .from("media")
          .select("name, file_url, file_type, category, alt_text, page_slug, is_active")
          .eq("is_active", true),
        supabase
          .from("settings")
          .select("setting_key, setting_value, setting_group, is_public")
          .eq("is_public", true),
      ]);

      if (!mediaResult.error && mediaResult.data) {
        setMediaItems(mediaResult.data);
      }

      if (!settingsResult.error && settingsResult.data) {
        setSettings(settingsResult.data);
      }

      if (!programResult.error && programResult.data) {
        setProgram(programResult.data as Program);
      } else {
        setProgram(fallbackProgram);
      }

      setIsRefreshing(false);
    }

    void loadProgramPageData();
  }, [slug]);

  const language = isComplete ? requestedLanguage : "ar";
  const copy = programDetailsCopy[language];
  const visual = useMemo(() => programVisuals[slug] || defaultVisual, [slug]);
  const primaryWhatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const backgroundMedia = useMemo(() => findProgramBackground(mediaItems, slug, program?.name || ""), [mediaItems, slug, program?.name]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!program) return;

    if (!form.fullName || !form.country || !form.whatsapp) {
      setMessage(copy.required);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage(copy.databaseUnavailable);
      return;
    }

    const duplicateKey = `hamza-agency-${form.whatsapp}-${program.name}`;

    if (localStorage.getItem(duplicateKey)) {
      setMessage(copy.duplicate);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("agency_applications").insert({
      full_name: form.fullName.trim(),
      country: form.country.trim(),
      whatsapp: form.whatsapp.trim(),
      platform: program.name,
      previous_experience: form.previousExperience.trim(),
      notes: form.notes.trim(),
      status: "new",
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Supabase insert error:", error);
      setMessage(copy.submitError);
      return;
    }

    localStorage.setItem(duplicateKey, "true");
    setMessage(copy.submitSuccess);
    setForm({ fullName: "", country: "", whatsapp: "", previousExperience: "", notes: "" });

    setTimeout(() => {
      setMessage("");
      setShowForm(false);
    }, 3000);
  }

  if (!program) {
    return (
      <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] px-5 py-20 text-white">
        <ProgramAnimationStyles />
        <ProgramBackground media={undefined} visual={defaultVisual} />
        <section className="relative z-20 mx-auto max-w-5xl">
          <h1 className="text-4xl font-black">البرنامج غير موجود</h1>
          <p className="mt-5 max-w-2xl leading-8 text-white/65">لم يتم العثور على هذا البرنامج ضمن برامج وكالة حمزة المتاحة حالياً.</p>
          <Link href="/programs" className="mt-8 inline-block text-purple-300">العودة إلى البرامج</Link>
        </section>
      </main>
    );
  }

  const isBrandProgram = ["tiktok", "bigo-live", "yaahlan", "xena", "catchii"].includes(program.slug);
  const displayName = isComplete && !isBrandProgram ? translations.title || program.name : program.name;
  const displayDescription = isComplete
    ? translations.content || translations.summary || program.description || program.short_description || visual.fallbackDescription
    : program.description || program.short_description || visual.fallbackDescription;
  const displayRequirements = isComplete ? translations.requirements || visual.fallbackRequirements : program.requirements || visual.fallbackRequirements;
  const displayBenefits = isComplete ? translations.benefits || visual.fallbackBenefits : program.benefits || visual.fallbackBenefits;
  const displayUpdates = isComplete ? translations.updates || visual.fallbackUpdates : program.updates || visual.fallbackUpdates;
  const displayFaq = isComplete ? translations.faq || visual.fallbackFaq : program.faq || visual.fallbackFaq;
  const statusLabel = program.status === "limited" ? copy.limited : program.status === "paused" ? copy.paused : copy.available;
  const visualBadge =
    isComplete && requestedLanguage !== "ar"
      ? (translatedVisualBadges[slug as keyof typeof translatedVisualBadges] || translatedVisualBadges.default)[requestedLanguage]
      : visual.badge;

  return (
    <main
      dir={getLanguageDirection(language)}
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
      style={{ "--program-accent": visual.accent, "--program-secondary": visual.secondary } as CSSProperties}
    >
      <ProgramAnimationStyles />
      <ProgramBackground media={backgroundMedia} visual={visual} />

      <section className="relative z-20 mx-auto max-w-6xl px-5 py-14">
        <Link href="/programs" className="mb-8 inline-block text-purple-200">{copy.back}</Link>

        <div className="relative overflow-hidden rounded-[2rem] border border-purple-400/20 bg-black/40 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/[0.04] via-transparent to-purple-500/5" />

          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/75">
            {visualBadge}
          </div>

          {(isRefreshing || isTranslationLoading) && (
            <div className="mb-4 inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-100">
              {copy.refreshing}
            </div>
          )}

          <span className="rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-200">
            {statusLabel}
          </span>

          {!isComplete && (
            <p className="mt-7 text-sm font-bold uppercase tracking-[0.28em] text-purple-200" dir="ltr">
              {visual.label}
            </p>
          )}

          <h1 className="mt-4 text-5xl font-black md:text-7xl">{displayName}</h1>

          <p className="mt-8 max-w-4xl text-xl leading-10 text-white/78">
            {displayDescription}
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="mt-8 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black shadow-[0_0_30px_rgba(168,85,247,0.26)] transition hover:scale-[1.01]"
          >
            {copy.join}
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <InfoCard title={copy.requirements} content={displayRequirements} tone="gold" />
          <InfoCard title={copy.benefits} content={displayBenefits} tone="purple" />
        </div>

        <InfoCard title={copy.updates} content={displayUpdates} tone="cyan" />
        <InfoCard title={copy.faq} content={displayFaq} tone="pink" />
      </section>

      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur">
          <div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6 shadow-[0_0_80px_rgba(168,85,247,0.25)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <button
                onClick={() => {
                  setMessage("");
                  setShowForm(false);
                }}
                className="rounded-full border border-white/15 px-5 py-2 text-white/70"
              >
                {copy.close}
              </button>
              <h2 className="text-3xl font-black">{copy.formTitle} {displayName}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder={copy.fullName} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />
              <input value={form.country} onChange={(e) => updateField("country", e.target.value)} placeholder={copy.country} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />
              <input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} placeholder={copy.whatsapp} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <h3 className="mb-3 text-2xl font-black">{copy.experience}</h3>
                <p className="mb-4 text-lg text-purple-200">{copy.experienceDescription}</p>
                <textarea value={form.previousExperience} onChange={(e) => updateField("previousExperience", e.target.value)} placeholder={copy.experiencePlaceholder} className="min-h-40 w-full resize-none bg-transparent text-xl outline-none" />
              </div>

              <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder={copy.notes} className="min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />

              {message && (
                <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-center text-xl font-bold text-yellow-100">
                  {message}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black disabled:opacity-60">
                {isSubmitting ? copy.submitting : copy.submit}
              </button>
            </form>
          </div>
        </div>
      )}

      <a href={`https://wa.me/${primaryWhatsapp.replace(/[^\d]/g, "")}`} target="_blank" className="fixed bottom-5 left-5 z-30 rounded-full bg-green-500 px-5 py-4 text-sm font-black text-white shadow-2xl">
        {copy.whatsappCta}
      </a>
    </main>
  );
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value && value.trim()) return value.trim();
  }

  return fallback;
}

function findProgramBackground(mediaItems: MediaItem[], slug: string, programName: string) {
  const normalizedName = programName.toLowerCase().replace(/\s+/g, "-");
  const acceptablePageSlugs = [slug, `program-${slug}`, `programs-${slug}`, `programs/${slug}`, `/programs/${slug}`, normalizedName];

  const directMatch = mediaItems.find((item) => {
    const pageSlug = item.page_slug || "";
    const category = item.category || "";
    const fileType = item.file_type || "";

    return acceptablePageSlugs.includes(pageSlug) && category === "background" && ["background_video", "video", "image", "generated_background"].includes(fileType);
  });

  if (directMatch) return directMatch;

  const nameMatch = mediaItems.find((item) => {
    const name = (item.name || "").toLowerCase();
    const category = item.category || "";
    return category === "background" && (name.includes(slug) || name.includes(normalizedName));
  });

  if (nameMatch) return nameMatch;

  return {
    name: `${slug} generated background`,
    file_url: `generated://program-${slug}`,
    file_type: "generated_background",
    category: "background",
    alt_text: `${slug} animated background`,
    page_slug: slug,
    is_active: true,
  };
}

function ProgramBackground({ media, visual }: { media: MediaItem | undefined; visual: ProgramVisual }) {
  const url = media?.file_url || "";
  const fileType = media?.file_type || "";
  const isUsableUrl = url.startsWith("http") || url.startsWith("/");
  const isVideo = fileType === "video" || fileType === "background_video" || /\.(mp4|webm|ogg)$/i.test(url);
  const isImage = fileType === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  if (isUsableUrl && isVideo) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <video className="h-full w-full object-cover opacity-35" src={url} autoPlay loop muted playsInline />
        <div className="absolute inset-0 bg-[#070009]/78" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at top, ${visual.accent}42, transparent 50%)` }} />
      </div>
    );
  }

  if (isUsableUrl && isImage) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-32" style={{ backgroundImage: `url("${url}")` }} />
        <div className="absolute inset-0 bg-[#070009]/80" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at top, ${visual.accent}42, transparent 50%)` }} />
      </div>
    );
  }

  return <GeneratedProgramBackground visual={visual} />;
}

function GeneratedProgramBackground({ visual }: { visual: ProgramVisual }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 0%, ${visual.accent}44 0%, rgba(7,0,9,0.98) 70%)` }} />
      <div className="program-soft-glow absolute -left-24 top-10 h-80 w-80 rounded-full blur-3xl md:h-[460px] md:w-[460px]" style={{ backgroundColor: `${visual.accent}26` }} />
      <div className="hidden md:block program-soft-glow-two absolute -right-28 top-40 h-[430px] w-[430px] rounded-full blur-3xl" style={{ backgroundColor: `${visual.secondary}20` }} />
      <div className="absolute inset-0 opacity-12 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
      <ProgramSpecificVisual variant={visual.variant} />
    </div>
  );
}

function ProgramSpecificVisual({ variant }: { variant: string }) {
  if (variant === "tiktok") {
    return (
      <div className="hidden md:block">
        <div className="program-float absolute left-[12%] top-[28%] h-48 w-28 rounded-[2rem] border border-pink-300/20 bg-pink-500/8 backdrop-blur" />
        <div className="program-float-reverse absolute right-[14%] top-[40%] h-44 w-28 rounded-[2rem] border border-cyan-300/18 bg-cyan-400/8 backdrop-blur" />
      </div>
    );
  }

  if (variant === "bigo") {
    return (
      <div className="hidden md:block">
        <div className="program-ring absolute left-1/2 top-[26%] h-[340px] w-[340px] -translate-x-1/2 rounded-full border border-sky-300/18" />
        <div className="program-dot absolute left-[22%] top-[34%] h-3 w-3 rounded-full bg-sky-300/70 shadow-[0_0_24px_rgba(125,211,252,0.7)]" />
      </div>
    );
  }

  if (variant === "yaahlan") {
    return (
      <div className="hidden md:block">
        <div className="program-float absolute left-[10%] top-[30%] h-16 w-36 rounded-3xl border border-amber-300/18 bg-amber-400/8 backdrop-blur" />
        <div className="program-float-reverse absolute right-[12%] top-[42%] h-16 w-40 rounded-3xl border border-purple-300/18 bg-purple-400/8 backdrop-blur" />
      </div>
    );
  }

  if (variant === "xena") {
    return (
      <div className="hidden md:block">
        <div className="program-ring absolute left-1/2 top-[28%] h-60 w-60 -translate-x-1/2 rounded-full border border-purple-300/18 bg-purple-500/5" />
        <div className="program-float absolute left-[18%] top-[42%] h-16 w-16 rotate-45 border border-cyan-300/16 bg-cyan-500/8" />
      </div>
    );
  }

  if (variant === "catchii") {
    return (
      <div className="hidden md:block">
        <div className="program-float absolute left-[12%] top-[30%] h-24 w-40 rounded-[2rem] border border-pink-300/18 bg-pink-500/8 backdrop-blur" />
        <div className="program-float-reverse absolute right-[12%] top-[42%] h-24 w-40 rounded-[2rem] border border-yellow-300/18 bg-yellow-500/8 backdrop-blur" />
      </div>
    );
  }

  return <div className="hidden md:block"><div className="program-ring absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full border border-purple-300/18" /></div>;
}

function InfoCard({ title, content, tone }: { title: string; content: string; tone: "purple" | "gold" | "cyan" | "pink" }) {
  const toneClasses = {
    purple: "border-purple-400/20 bg-purple-500/10",
    gold: "border-yellow-400/20 bg-yellow-500/10",
    cyan: "border-cyan-400/20 bg-cyan-500/10",
    pink: "border-pink-400/20 bg-pink-500/10",
  };

  return (
    <div className={`mt-8 rounded-[2rem] border p-6 backdrop-blur ${toneClasses[tone]}`}>
      <h2 className="text-3xl font-black">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap leading-9 text-white/72">{content}</p>
    </div>
  );
}

function ProgramAnimationStyles() {
  return (
    <style>{`
      @keyframes programSoftGlow {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.65; }
        50% { transform: translate3d(28px, 22px, 0) scale(1.05); opacity: 0.9; }
      }
      @keyframes programSoftGlowTwo {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.45; }
        50% { transform: translate3d(-26px, 18px, 0) scale(1.04); opacity: 0.72; }
      }
      @keyframes programFloatLight {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-14px); }
      }
      @keyframes programFloatLightReverse {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(12px); }
      }
      @keyframes programRingLight {
        0%, 100% { opacity: 0.16; transform: translateX(-50%) scale(0.98); }
        50% { opacity: 0.32; transform: translateX(-50%) scale(1.03); }
      }
      .program-soft-glow { animation: programSoftGlow 18s ease-in-out infinite; }
      .program-soft-glow-two { animation: programSoftGlowTwo 22s ease-in-out infinite; }
      .program-float { animation: programFloatLight 16s ease-in-out infinite; }
      .program-float-reverse { animation: programFloatLightReverse 18s ease-in-out infinite; }
      .program-ring { animation: programRingLight 14s ease-in-out infinite; }
      .program-dot { animation: programFloatLight 12s ease-in-out infinite; }
      @media (max-width: 768px) {
        .program-soft-glow,
        .program-soft-glow-two,
        .program-float,
        .program-float-reverse,
        .program-ring,
        .program-dot { animation: none !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .program-soft-glow,
        .program-soft-glow-two,
        .program-float,
        .program-float-reverse,
        .program-ring,
        .program-dot { animation: none !important; }
      }
    `}</style>
  );
}
