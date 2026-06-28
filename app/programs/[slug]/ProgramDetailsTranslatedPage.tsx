"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { getLanguageDirection, type SiteLanguage } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type DetailField = "title" | "summary" | "content" | "requirements" | "benefits" | "updates" | "faq";
type TranslationMap = Partial<Record<DetailField, string>>;

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

type Setting = { setting_key: string | null; setting_value: string | null };
type MediaItem = { name: string | null; file_url: string | null; file_type: string | null; category: string | null; page_slug: string | null; is_active: boolean | null };
type TranslationRow = { field_name: DetailField | null; translated_value: string | null };

type Copy = {
  back: string;
  notFound: string;
  notFoundDescription: string;
  available: string;
  limited: string;
  paused: string;
  unavailable: string;
  join: string;
  requirements: string;
  benefits: string;
  updates: string;
  faq: string;
  close: string;
  formTitle: string;
  fullName: string;
  country: string;
  whatsapp: string;
  experience: string;
  experienceDescription: string;
  notes: string;
  submit: string;
  submitting: string;
  required: string;
  duplicate: string;
  databaseUnavailable: string;
  submitError: string;
  submitSuccess: string;
  refreshing: string;
  visual: string;
};

const fields: DetailField[] = ["title", "summary", "content", "requirements", "benefits", "updates", "faq"];
const brandSlugs = new Set(["tiktok", "bigo-live", "yaahlan", "xena", "catchii"]);

const copy: Record<SiteLanguage, Copy> = {
  ar: {
    back: "← العودة إلى البرامج",
    notFound: "البرنامج غير موجود",
    notFoundDescription: "لم يتم العثور على هذا البرنامج ضمن برامج وكالة حمزة المتاحة حالياً.",
    available: "متاح الآن",
    limited: "قبول محدود",
    paused: "متوقف مؤقتاً",
    unavailable: "غير متاح",
    join: "انضم الآن",
    requirements: "شروط القبول",
    benefits: "ماذا تقدم وكالة حمزة؟",
    updates: "آخر التحديثات",
    faq: "الأسئلة الشائعة",
    close: "إغلاق",
    formTitle: "طلب الانضمام إلى",
    fullName: "الاسم الثلاثي",
    country: "الدولة",
    whatsapp: "رقم واتساب",
    experience: "خبرات سابقة",
    experienceDescription: "هل عملت على برامج أو وكالات أخرى سابقاً؟",
    notes: "ملاحظات إضافية",
    submit: "إرسال الطلب",
    submitting: "جارٍ الإرسال...",
    required: "يرجى تعبئة الحقول الأساسية.",
    duplicate: "تم إرسال طلب سابق بنفس رقم الواتساب وهذا البرنامج.",
    databaseUnavailable: "الاتصال بقاعدة البيانات غير مفعل حالياً.",
    submitError: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.",
    submitSuccess: "تم استلام طلبك بنجاح. سيقوم فريق الوكالة بمراجعة الطلب وقد يتم التواصل معك عبر واتساب.",
    refreshing: "تحديث بيانات البرنامج...",
    visual: "برنامج صناع محتوى",
  },
  en: {
    back: "← Back to programs",
    notFound: "Program not found",
    notFoundDescription: "This program is not currently available in HAMZA AGENCY programs.",
    available: "Available now",
    limited: "Limited spots",
    paused: "Temporarily paused",
    unavailable: "Unavailable",
    join: "Join now",
    requirements: "Requirements",
    benefits: "What HAMZA AGENCY offers",
    updates: "Latest updates",
    faq: "Frequently asked questions",
    close: "Close",
    formTitle: "Apply to join",
    fullName: "Full name",
    country: "Country",
    whatsapp: "WhatsApp number",
    experience: "Previous experience",
    experienceDescription: "Have you worked with other programs or agencies before?",
    notes: "Additional notes",
    submit: "Submit application",
    submitting: "Submitting...",
    required: "Please complete the required fields.",
    duplicate: "A request was already sent for this WhatsApp number and program.",
    databaseUnavailable: "Database connection is not available right now.",
    submitError: "Something went wrong while sending your application. Please try again.",
    submitSuccess: "Your application was received successfully. Our team will review it and may contact you through WhatsApp.",
    refreshing: "Refreshing program data...",
    visual: "Creator program",
  },
  tr: {
    back: "← Programlara dön",
    notFound: "Program bulunamadı",
    notFoundDescription: "Bu program şu anda HAMZA AGENCY programları arasında bulunmuyor.",
    available: "Şimdi açık",
    limited: "Kontenjan sınırlı",
    paused: "Geçici olarak duraklatıldı",
    unavailable: "Uygun değil",
    join: "Şimdi katıl",
    requirements: "Katılım şartları",
    benefits: "HAMZA AGENCY neler sunar?",
    updates: "Son güncellemeler",
    faq: "Sık sorulan sorular",
    close: "Kapat",
    formTitle: "Katılım başvurusu",
    fullName: "Ad soyad",
    country: "Ülke",
    whatsapp: "WhatsApp numarası",
    experience: "Önceki deneyim",
    experienceDescription: "Daha önce başka programlar veya ajanslarla çalıştınız mı?",
    notes: "Ek notlar",
    submit: "Başvuruyu gönder",
    submitting: "Gönderiliyor...",
    required: "Lütfen zorunlu alanları doldurun.",
    duplicate: "Bu WhatsApp numarası ve program için daha önce bir başvuru gönderildi.",
    databaseUnavailable: "Veritabanı bağlantısı şu anda kullanılamıyor.",
    submitError: "Başvuru gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
    submitSuccess: "Başvurunuz başarıyla alındı. Ekibimiz inceleyip gerektiğinde WhatsApp üzerinden sizinle iletişime geçecektir.",
    refreshing: "Program bilgileri güncelleniyor...",
    visual: "İçerik üreticisi programı",
  },
};

const visualBySlug: Record<string, { accent: string; secondary: string }> = {
  tiktok: { accent: "#ff2f8b", secondary: "#22d3ee" },
  "bigo-live": { accent: "#38bdf8", secondary: "#a855f7" },
  yaahlan: { accent: "#f59e0b", secondary: "#8b5cf6" },
  xena: { accent: "#a855f7", secondary: "#06b6d4" },
  catchii: { accent: "#ec4899", secondary: "#facc15" },
};

function fallbackProgram(slug: string): Program | null {
  const name: Record<string, string> = { tiktok: "TikTok", "bigo-live": "BIGO LIVE", yaahlan: "Yaahlan", xena: "Xena", catchii: "Catchii" };
  if (!name[slug]) return null;
  return {
    id: Object.keys(name).indexOf(slug) + 1,
    name: name[slug], slug, status: "active",
    description: "هذا البرنامج جزء من منظومة وكالة حمزة لدعم صناع المحتوى ومساعدتهم على الانضمام للبرامج المناسبة وتطوير حضورهم.",
    short_description: "هذا البرنامج جزء من منظومة وكالة حمزة لدعم صناع المحتوى.",
    requirements: "تقديم معلومات صحيحة\nرقم واتساب فعال\nالالتزام بشروط المنصة\nالجدية في العمل والمتابعة",
    benefits: "دعم إداري وفني\nمتابعة الطلب\nإرشاد لصانع المحتوى\nمساعدة في حل المشاكل التقنية",
    updates: "هذا البرنامج متاح للتقديم حالياً عبر وكالة حمزة.",
    faq: "هل القبول مضمون؟\nكل طلب يخضع للمراجعة.\n\nكيف أعرف حالة طلبي؟\nيمكنك متابعة طلبك من صفحة التتبع أو التواصل عبر واتساب.",
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isBrand(program: Program) {
  return brandSlugs.has(normalize(program.slug)) || brandSlugs.has(normalize(program.name));
}

function isCompleteTranslation(values: TranslationMap) {
  return fields.every((field) => Boolean(values[field]?.trim()));
}

function getStatus(status: string | null, text: Copy) {
  const value = (status || "active").toLowerCase();
  if (value === "limited") return text.limited;
  if (value === "paused") return text.paused;
  if (value === "inactive" || value === "closed") return text.unavailable;
  return text.available;
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value?.trim()) return value.trim();
  }
  return fallback;
}

function getBackground(media: MediaItem[], slug: string) {
  const candidates = [slug, `program-${slug}`, `programs-${slug}`, `programs/${slug}`, `/programs/${slug}`];
  return media.find((item) => candidates.includes(item.page_slug || "") && item.category === "background" && Boolean(item.file_url)) || null;
}

export default function ProgramDetailsTranslatedPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const requestedLanguage = useSiteLanguage();
  const [program, setProgram] = useState<Program | null>(() => fallbackProgram(slug));
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ fullName: "", country: "", whatsapp: "", previousExperience: "", notes: "" });

  useEffect(() => {
    const fallback = fallbackProgram(slug);
    setProgram(fallback);
    setTranslations({});

    async function load() {
      if (!isSupabaseConfigured || !supabase || !slug) return;
      setRefreshing(true);

      const [programResult, mediaResult, settingsResult] = await Promise.all([
        supabase.from("programs").select("id, name, slug, description, short_description, status, requirements, benefits, faq, updates").eq("slug", slug).maybeSingle(),
        supabase.from("media").select("name, file_url, file_type, category, page_slug, is_active").eq("is_active", true),
        supabase.from("settings").select("setting_key, setting_value").eq("is_public", true),
      ]);

      if (!mediaResult.error && mediaResult.data) setMedia(mediaResult.data as MediaItem[]);
      if (!settingsResult.error && settingsResult.data) setSettings(settingsResult.data as Setting[]);

      if (programResult.error || !programResult.data) {
        setProgram(fallback);
        setRefreshing(false);
        return;
      }

      const source = programResult.data as Program;
      setProgram(source);

      if (requestedLanguage === "ar") {
        setTranslations({});
        setRefreshing(false);
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
        .in("field_name", fields);

      if (error || !data) {
        setTranslations({});
      } else {
        const next = (data as TranslationRow[]).reduce((result, row) => {
          if (row.field_name && fields.includes(row.field_name) && row.translated_value?.trim()) {
            result[row.field_name] = row.translated_value.trim();
          }
          return result;
        }, {} as TranslationMap);
        setTranslations(next);
      }

      setRefreshing(false);
    }

    void load();
  }, [slug, requestedLanguage]);

  const hasPublishedTranslation = requestedLanguage !== "ar" && isCompleteTranslation(translations);
  const language: SiteLanguage = hasPublishedTranslation ? requestedLanguage : "ar";
  const text = copy[language];
  const displayProgram = useMemo(() => {
    if (!program || !hasPublishedTranslation) return program;
    return {
      ...program,
      name: isBrand(program) ? program.name : translations.title || program.name,
      short_description: translations.summary || program.short_description,
      description: translations.content || program.description,
      requirements: translations.requirements || program.requirements,
      benefits: translations.benefits || program.benefits,
      updates: translations.updates || program.updates,
      faq: translations.faq || program.faq,
    };
  }, [program, hasPublishedTranslation, translations]);

  const visual = visualBySlug[slug] || { accent: "#7c3aed", secondary: "#d4af37" };
  const primaryWhatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const background = useMemo(() => getBackground(media, slug), [media, slug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!displayProgram) return;
    setMessage("");
    if (!form.fullName || !form.country || !form.whatsapp) {
      setMessage(text.required);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setMessage(text.databaseUnavailable);
      return;
    }
    const duplicateKey = `hamza-agency-${form.whatsapp}-${displayProgram.name}`;
    if (localStorage.getItem(duplicateKey)) {
      setMessage(text.duplicate);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("agency_applications").insert({
      full_name: form.fullName.trim(), country: form.country.trim(), whatsapp: form.whatsapp.trim(),
      platform: displayProgram.name, previous_experience: form.previousExperience.trim(), notes: form.notes.trim(), status: "new",
    });
    setSubmitting(false);

    if (error) {
      setMessage(text.submitError);
      return;
    }

    localStorage.setItem(duplicateKey, "true");
    setMessage(text.submitSuccess);
    setForm({ fullName: "", country: "", whatsapp: "", previousExperience: "", notes: "" });
    window.setTimeout(() => { setMessage(""); setShowForm(false); }, 3000);
  }

  if (!displayProgram) {
    return <main dir="rtl" className="min-h-screen bg-[#070009] px-5 py-20 text-white"><section className="mx-auto max-w-5xl"><h1 className="text-4xl font-black">{copy.ar.notFound}</h1><p className="mt-5 max-w-2xl leading-8 text-white/65">{copy.ar.notFoundDescription}</p><Link href="/programs" className="mt-8 inline-block text-purple-300">{copy.ar.back}</Link></section></main>;
  }

  const statusClass = displayProgram.status === "limited" ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-200" : displayProgram.status === "paused" || displayProgram.status === "inactive" || displayProgram.status === "closed" ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-green-400/30 bg-green-500/10 text-green-200";

  return (
    <main dir={getLanguageDirection(language)} className="relative min-h-screen overflow-hidden bg-[#070009] text-white" style={{ "--program-accent": visual.accent, "--program-secondary": visual.secondary } as CSSProperties}>
      <ProgramBackground media={background} accent={visual.accent} secondary={visual.secondary} />
      <section className="relative z-20 mx-auto max-w-6xl px-5 py-14">
        <Link href="/programs" className="mb-8 inline-block text-purple-200">{text.back}</Link>
        <div className="relative overflow-hidden rounded-[2rem] border border-purple-400/20 bg-black/40 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/[0.04] via-transparent to-purple-500/5" />
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/75">{text.visual}</div>
          {refreshing && <div className="mb-4 inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-100">{text.refreshing}</div>}
          <span className={`rounded-full border px-4 py-2 text-sm font-bold ${statusClass}`}>{getStatus(displayProgram.status, text)}</span>
          <p className="mt-7 text-sm font-bold uppercase tracking-[0.28em] text-purple-200">{displayProgram.slug}</p>
          <h1 className="mt-4 text-5xl font-black md:text-7xl">{displayProgram.name}</h1>
          {displayProgram.short_description && displayProgram.short_description !== displayProgram.description && <p className="mt-6 max-w-4xl text-lg leading-8 text-purple-100">{displayProgram.short_description}</p>}
          <p className="mt-6 max-w-4xl text-xl leading-10 text-white/78">{displayProgram.description || displayProgram.short_description}</p>
          <button onClick={() => setShowForm(true)} className="mt-8 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black shadow-[0_0_30px_rgba(168,85,247,0.26)] transition hover:scale-[1.01]">{text.join}</button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <InfoCard title={text.requirements} content={displayProgram.requirements || ""} tone="gold" />
          <InfoCard title={text.benefits} content={displayProgram.benefits || ""} tone="purple" />
        </div>
        <InfoCard title={text.updates} content={displayProgram.updates || ""} tone="cyan" />
        <InfoCard title={text.faq} content={displayProgram.faq || ""} tone="pink" />
      </section>

      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur">
          <div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6 shadow-[0_0_80px_rgba(168,85,247,0.25)]">
            <div className="mb-6 flex items-center justify-between gap-4"><button onClick={() => { setMessage(""); setShowForm(false); }} className="rounded-full border border-white/15 px-5 py-2 text-white/70">{text.close}</button><h2 className="text-3xl font-black">{text.formTitle} {displayProgram.name}</h2></div>
            <form onSubmit={submit} className="space-y-5">
              <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder={text.fullName} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />
              <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} placeholder={text.country} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />
              <input value={form.whatsapp} onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))} placeholder={text.whatsapp} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5"><h3 className="mb-3 text-2xl font-black">{text.experience}</h3><p className="mb-4 text-lg text-purple-200">{text.experienceDescription}</p><textarea value={form.previousExperience} onChange={(event) => setForm((current) => ({ ...current, previousExperience: event.target.value }))} placeholder={text.experience} className="min-h-40 w-full resize-none bg-transparent text-xl outline-none" /></div>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={text.notes} className="min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />
              {message && <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-center text-xl font-bold text-yellow-100">{message}</div>}
              <button type="submit" disabled={submitting} className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black disabled:opacity-60">{submitting ? text.submitting : text.submit}</button>
            </form>
          </div>
        </div>
      )}
      <a href={`https://wa.me/${primaryWhatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="fixed bottom-5 left-5 z-30 rounded-full bg-green-500 px-5 py-4 text-sm font-black text-white shadow-2xl">WhatsApp</a>
    </main>
  );
}

function InfoCard({ title, content, tone }: { title: string; content: string; tone: "purple" | "gold" | "cyan" | "pink" }) {
  const toneClasses = { purple: "border-purple-400/20 bg-purple-500/10", gold: "border-yellow-400/20 bg-yellow-500/10", cyan: "border-cyan-400/20 bg-cyan-500/10", pink: "border-pink-400/20 bg-pink-500/10" };
  return <div className={`mt-8 rounded-[2rem] border p-6 backdrop-blur ${toneClasses[tone]}`}><h2 className="text-3xl font-black">{title}</h2><p className="mt-4 whitespace-pre-wrap leading-9 text-white/72">{content}</p></div>;
}

function ProgramBackground({ media, accent, secondary }: { media: MediaItem | null; accent: string; secondary: string }) {
  const url = media?.file_url || "";
  const type = media?.file_type || "";
  const isVideo = type === "video" || type === "background_video" || /\.(mp4|webm|ogg)$/i.test(url);
  const isImage = type === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">{url && isVideo ? <video className="h-full w-full object-cover opacity-35" src={url} autoPlay loop muted playsInline /> : url && isImage ? <div className="absolute inset-0 bg-cover bg-center opacity-32" style={{ backgroundImage: `url(\"${url}\")` }} /> : <><div className="absolute -left-24 top-10 h-80 w-80 rounded-full blur-3xl" style={{ backgroundColor: `${accent}26` }} /><div className="absolute -right-28 top-40 hidden h-[430px] w-[430px] rounded-full blur-3xl md:block" style={{ backgroundColor: `${secondary}20` }} /></>}<div className="absolute inset-0 bg-[#070009]/80" /><div className="absolute inset-0" style={{ background: `radial-gradient(circle at top, ${accent}42, transparent 52%)` }} /></div>;
}
