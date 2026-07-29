"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PublishedAnnouncementBar from "@/components/PublishedAnnouncementBar";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { submitPublicForm } from "@/lib/publicSubmission";

type Program = {
  id: number;
  name: string | null;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  status: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  is_active: boolean | null;
};

type ContentTranslation = {
  source_id: string;
  translated_value: string | null;
};

type Setting = { setting_key: string | null; setting_value: string | null };
type Announcement = {
  id: number;
  title: string | null;
  content: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  show_on_homepage: boolean | null;
  priority: number | null;
};
type Form = {
  fullName: string;
  country: string;
  whatsapp: string;
  platform: string;
  previousExperience: string;
  notes: string;
};

const fallbackPrograms: Program[] = [
  { id: 1, name: "TikTok", slug: "tiktok", short_description: "برنامج لصناع المحتوى الراغبين بالنمو على TikTok.", description: "", status: "active", sort_order: 1, is_visible: true, is_active: true },
  { id: 2, name: "BIGO LIVE", slug: "bigo-live", short_description: "فرص بث مباشر ودعم لصناع المحتوى.", description: "", status: "active", sort_order: 2, is_visible: true, is_active: true },
  { id: 3, name: "Yaahlan", slug: "yaahlan", short_description: "برنامج اجتماعي وبث مباشر.", description: "", status: "active", sort_order: 3, is_visible: true, is_active: true },
];

const localizedProgramFallbacks = {
  en: {
    tiktok: "Join the TikTok program with follow-up and support from HAMZA AGENCY.",
    "bigo-live": "Join the BIGO LIVE program with follow-up and support from HAMZA AGENCY.",
    yaahlan: "Join the Yaahlan audio program with follow-up and support from HAMZA AGENCY.",
  },
  tr: {
    tiktok: "HAMZA AGENCY takibi ve desteğiyle TikTok programına katılın.",
    "bigo-live": "HAMZA AGENCY takibi ve desteğiyle BIGO LIVE programına katılın.",
    yaahlan: "HAMZA AGENCY takibi ve desteğiyle Yaahlan sesli yayın programına katılın.",
  },
} as const;

const nav = [
  { ar: "الرئيسية", en: "Home", tr: "Ana Sayfa", href: "/" },
  { ar: "البرامج", en: "Programs", tr: "Programlar", href: "/programs" },
  { ar: "الخدمات", en: "Services", tr: "Hizmetler", href: "/services" },
  { ar: "الوظائف", en: "Jobs", tr: "İş İlanları", href: "/jobs" },
  { ar: "تواصل", en: "Contact", tr: "İletişim", href: "/contact" },
];

const copy = {
  ar: { badge: "وكالة احترافية لإدارة صناع المحتوى", title: "وكالة حمزة", lead: "نساعد صناع المحتوى على تطوير حضورهم وتحسين فرص النجاح على منصات البث والتواصل.", programs: "البرامج المتاحة", join: "انضم الآن", form: "طلب الانضمام", submit: "إرسال الطلب", success: "تم استلام طلبك بنجاح.", error: "تعذر الإرسال حالياً. حاول لاحقاً.", required: "يرجى تعبئة الحقول المطلوبة.", name: "الاسم الكامل", country: "الدولة", phone: "رقم واتساب", experience: "الخبرة السابقة", notes: "ملاحظات", stats: [["3+", "برامج متاحة"], ["AR · EN · TR", "لغات الموقع"], ["24/7", "استقبال الطلبات"]] },
  en: { badge: "Professional creator management agency", title: "HAMZA AGENCY", lead: "We help creators grow their presence and opportunities across live-streaming and social platforms.", programs: "Available programs", join: "Join now", form: "Agency application", submit: "Submit application", success: "Your application was received.", error: "Submission is unavailable right now. Please try later.", required: "Please complete the required fields.", name: "Full name", country: "Country", phone: "WhatsApp number", experience: "Previous experience", notes: "Notes", stats: [["3+", "Available programs"], ["AR · EN · TR", "Site languages"], ["24/7", "Request intake"]] },
  tr: { badge: "Profesyonel içerik üreticisi ajansı", title: "HAMZA AGENCY", lead: "İçerik üreticilerinin canlı yayın ve sosyal platformlarda büyümesine destek oluyoruz.", programs: "Mevcut programlar", join: "Şimdi katıl", form: "Ajans başvurusu", submit: "Başvuruyu gönder", success: "Başvurunuz alındı.", error: "Başvuru şu anda gönderilemiyor. Daha sonra tekrar deneyin.", required: "Lütfen gerekli alanları doldurun.", name: "Ad soyad", country: "Ülke", phone: "WhatsApp numarası", experience: "Önceki deneyim", notes: "Notlar", stats: [["3+", "Mevcut program"], ["AR · EN · TR", "Site dilleri"], ["24/7", "Talep kabulü"]] },
};

function setting(rows: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = rows.find((row) => row.setting_key === key)?.setting_value;
    if (value?.trim()) return value.trim();
  }
  return fallback;
}

function localizePrograms(programs: Program[], language: "ar" | "en" | "tr", translations: ContentTranslation[]) {
  if (language === "ar") return programs;
  const translatedById = new Map(translations.map((row) => [row.source_id, row.translated_value?.trim() || ""]));
  return programs.map((program) => {
    const slug = program.slug || "";
    const fallback = localizedProgramFallbacks[language][slug as keyof (typeof localizedProgramFallbacks)[typeof language]];
    return { ...program, short_description: translatedById.get(String(program.id)) || fallback || "" };
  });
}

export default function HomePage() {
  const language = useSiteLanguage();
  const t = copy[language];
  const [programs, setPrograms] = useState<Program[]>(() => localizePrograms(fallbackPrograms, language, []));
  const [settings, setSettings] = useState<Setting[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>({ fullName: "", country: "", whatsapp: "", platform: "TikTok", previousExperience: "", notes: "" });
  const [website, setWebsite] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) setPrograms(localizePrograms(fallbackPrograms, language, []));
        return;
      }

      const translationQuery = language === "ar"
        ? Promise.resolve({ data: [] as ContentTranslation[] })
        : supabase
            .from("content_translations")
            .select("source_id,translated_value")
            .eq("source_type", "programs")
            .eq("field_name", "summary")
            .eq("language", language)
            .eq("is_published", true);

      const [programResult, settingResult, announcementResult, translationResult] = await Promise.all([
        supabase.from("programs").select("id,name,slug,short_description,description,status,sort_order,is_visible,is_active").eq("is_visible", true).eq("is_active", true).order("sort_order"),
        supabase.from("settings").select("setting_key,setting_value").eq("is_public", true),
        supabase.from("announcements").select("id,title,content,start_date,end_date,is_active,show_on_homepage,priority").eq("is_active", true).eq("show_on_homepage", true).order("priority").limit(1),
        translationQuery,
      ]);

      if (cancelled) return;
      const sourcePrograms = programResult.data?.length ? (programResult.data as Program[]) : fallbackPrograms;
      const localizedPrograms = localizePrograms(sourcePrograms, language, (translationResult.data || []) as ContentTranslation[]);
      setPrograms(localizedPrograms);
      setForm((current) => ({ ...current, platform: localizedPrograms[0]?.name || "TikTok" }));
      if (settingResult.data) setSettings(settingResult.data as Setting[]);
      setAnnouncement((announcementResult.data?.[0] as Announcement | undefined) || null);
    })();
    return () => { cancelled = true; };
  }, [language]);

  const agencyName = setting(settings, language === "ar" ? ["agency_name_ar", "agency_name"] : language === "tr" ? ["agency_name_tr", "agency_name_en"] : ["agency_name_en", "agency_name"], t.title);
  const logo = setting(settings, ["logo_url"], "/Logo%20hamza%20agency.jpg");
  const localizedNav = useMemo(() => nav.map((item) => ({ label: item[language], href: localizePublicHref(item.href, language) })), [language]);
  const stats = t.stats.map(([fallbackNumber, fallbackLabel], index) => [
    setting(settings, [`home_stat_${index + 1}_number_${language}`, `home_stat_${index + 1}_number`], fallbackNumber),
    setting(settings, [`home_stat_${index + 1}_label_${language}`, `home_stat_${index + 1}_label`], fallbackLabel),
  ] as const);

  function openForm() {
    setShowForm(true);
    setStartedAt(new Date().toISOString());
    setWebsite("");
    setMessage("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!form.fullName.trim() || !form.country.trim() || !form.whatsapp.trim() || !form.platform.trim()) {
      setMessage(t.required);
      return;
    }
    setBusy(true);
    try {
      await submitPublicForm("application", { full_name: form.fullName.trim(), country: form.country.trim(), whatsapp: form.whatsapp.trim(), platform: form.platform, previous_experience: form.previousExperience.trim(), notes: form.notes.trim() }, startedAt, website);
      setMessage(t.success);
      setForm({ fullName: "", country: "", whatsapp: "", platform: programs[0]?.name || "TikTok", previousExperience: "", notes: "" });
    } catch {
      setMessage(t.error);
    } finally {
      setBusy(false);
    }
  }

  return <main dir={getLanguageDirection(language)} className="min-h-screen overflow-x-hidden bg-[#070009] text-white">
    <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,.34),transparent_55%)]" />
    <div className="relative z-10">
      {announcement && <PublishedAnnouncementBar announcement={announcement} animation="marquee" speed={22} />}
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-6">
        <Link href={localizePublicHref("/", language)} className="flex items-center gap-3"><Image src={logo} alt={agencyName} width={52} height={52} unoptimized className="h-13 w-13 rounded-xl object-cover" /><span className="font-black">{agencyName}</span></Link>
        <div className="hidden gap-2 lg:flex">{localizedNav.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-bold">{item.label}</Link>)}</div>
        <button onClick={openForm} className="rounded-full bg-purple-600 px-5 py-3 font-black">{t.join}</button>
      </nav>
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-12 text-center">
        <div className="mx-auto inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{t.badge}</div>
        <Image src={logo} alt={agencyName} width={176} height={176} unoptimized priority className="mx-auto mt-8 h-44 w-44 rounded-[2rem] object-cover shadow-[0_0_80px_rgba(168,85,247,.55)]" />
        <h1 className="mt-8 text-6xl font-black md:text-8xl">{agencyName}</h1>
        <p className="mx-auto mt-7 max-w-4xl text-xl leading-10 text-white/70">{t.lead}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3"><button onClick={openForm} className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 text-xl font-black">{t.join}</button><Link href={localizePublicHref("/programs", language)} className="rounded-full border border-white/15 px-8 py-4 text-xl font-black">{t.programs}</Link></div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">{stats.map(([number, label]) => <div key={`${number}-${label}`} className="rounded-3xl border border-white/10 bg-white/[.05] p-5"><div className="text-3xl font-black text-yellow-200">{number}</div><div className="mt-2 text-white/60">{label}</div></div>)}</div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-24"><h2 className="text-center text-4xl font-black">{t.programs}</h2><div className="mt-8 grid gap-6 md:grid-cols-3">{programs.map((program) => <Link key={program.id} href={localizePublicHref(`/programs/${program.slug}`, language)} className="rounded-[2rem] border border-white/10 bg-white/[.05] p-6 backdrop-blur"><h3 className="text-3xl font-black">{program.name}</h3><p className="mt-4 leading-8 text-white/65">{program.short_description || program.description}</p></Link>)}</div></section>
    </div>
    {showForm && <div className="fixed inset-0 z-[300] overflow-y-auto bg-black/80 p-4 backdrop-blur"><div className="mx-auto my-8 max-w-2xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6"><div className="flex items-center justify-between"><h2 className="text-3xl font-black">{t.form}</h2><button onClick={() => setShowForm(false)} className="rounded-full border border-white/15 px-4 py-2">×</button></div><form onSubmit={submit} className="mt-6 grid gap-4"><input aria-hidden="true" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="absolute -left-[10000px] h-px w-px opacity-0" /><Input placeholder={t.name} value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} /><Input placeholder={t.country} value={form.country} onChange={(value) => setForm({ ...form, country: value })} /><Input placeholder={t.phone} value={form.whatsapp} onChange={(value) => setForm({ ...form, whatsapp: value })} /><select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} className="rounded-2xl border border-white/10 bg-black/30 p-4">{programs.map((program) => <option key={program.id} value={program.name || ""}>{program.name}</option>)}</select><textarea value={form.previousExperience} onChange={(event) => setForm({ ...form, previousExperience: event.target.value })} placeholder={t.experience} className="min-h-28 rounded-2xl border border-white/10 bg-black/30 p-4" /><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={t.notes} className="min-h-24 rounded-2xl border border-white/10 bg-black/30 p-4" />{message && <p className="rounded-2xl border border-white/10 p-4 text-center">{message}</p>}<button type="submit" disabled={busy} className="rounded-full bg-purple-600 px-6 py-4 font-black disabled:opacity-50">{busy ? "…" : t.submit}</button></form></div></div>}
  </main>;
}

function Input({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (value: string) => void }) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-2xl border border-white/10 bg-black/30 p-4" />;
}
