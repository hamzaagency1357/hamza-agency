"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  CmsPublishedText,
  CmsPublishedTranslationsProvider,
  type CmsPublishedTranslationSource,
} from "@/components/CmsPublishedTranslations";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getHomeStaticCopy } from "@/lib/i18n/homeStaticCopy";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { getSharedNavigationLabelByHref } from "@/lib/i18n/sharedChrome";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import {
  defaultPublicNavigationConfig,
  normalizePublicNavigationConfig,
  type PublicNavigationLink,
} from "@/lib/publicNavigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const CMS_TRANSLATION_FIELDS = ["title", "summary", "content"] as const;
const PROGRAM_CARD_TRANSLATION_FIELDS = ["title", "summary"] as const;
const BRAND_PROGRAM_NAMES = new Set(["tiktok", "bigo-live", "yaahlan", "xena", "catchii"]);

type CmsTranslationField = (typeof CMS_TRANSLATION_FIELDS)[number];
type ProgramCardTranslationField = (typeof PROGRAM_CARD_TRANSLATION_FIELDS)[number];
type AnnouncementPosition = "top" | "under_nav" | "inside_hero" | "hidden";
type AnnouncementAnimation = "fixed" | "marquee";

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

type Setting = { setting_key: string | null; setting_value: string | null; setting_group: string | null; is_public: boolean | null };
type MediaItem = { name: string | null; file_url: string | null; file_type: string | null; category: string | null; alt_text: string | null; page_slug: string | null; is_active: boolean | null };
type Announcement = { id: number; title: string | null; content: string | null; start_date: string | null; end_date: string | null; is_active: boolean | null; show_on_homepage: boolean | null; priority: number | null };
type PageContent = { id: number; title: string | null; slug: string | null; content: string | null; seo_description: string | null; is_homepage: boolean | null; is_published: boolean | null };
type HomeSection = { id: number; section_key: string | null; title: string | null; subtitle: string | null; content: string | null; is_visible: boolean | null };

const mainNavigationLinks = [
  { label: "الرئيسية", href: "/" }, { label: "البرامج", href: "/programs" }, { label: "من نحن", href: "/about" }, { label: "الخدمات", href: "/services" }, { label: "الخدمات الرقمية", href: "/digital-services" }, { label: "طلب خدمة", href: "/service-request" }, { label: "تتبع طلب خدمة", href: "/service-status" }, { label: "تتبع طلب الانضمام", href: "/application-status" }, { label: "الوظائف", href: "/jobs" }, { label: "التقييمات", href: "/reviews" }, { label: "قصص النجاح", href: "/success-stories" }, { label: "شركاؤنا", href: "/partners" }, { label: "المعرض", href: "/gallery" }, { label: "مركز المعرفة", href: "/knowledge-center" }, { label: "FAQ", href: "/faq" }, { label: "اتصل بنا", href: "/contact" },
];

const footerLegalLinks: PublicNavigationLink[] = [
  { label: "سياسة الخصوصية", href: "/privacy-policy", type: "legal", isVisible: true, sortOrder: 1 },
  { label: "الشروط والأحكام", href: "/terms-and-conditions", type: "legal", isVisible: true, sortOrder: 2 },
  { label: "AI Policy", href: "/ai-policy", type: "legal", isVisible: true, sortOrder: 3 },
];

const fallbackPrograms: Program[] = [
  { id: 1, name: "TikTok", slug: "tiktok", short_description: "برنامج مناسب لصناع المحتوى الراغبين بالنمو على TikTok.", description: "", status: "active", sort_order: 1, is_visible: true, is_active: true },
  { id: 2, name: "BIGO LIVE", slug: "bigo-live", short_description: "فرص بث مباشر ودعم لصناع المحتوى على BIGO LIVE.", description: "", status: "active", sort_order: 2, is_visible: true, is_active: true },
  { id: 3, name: "Yaahlan", slug: "yaahlan", short_description: "برنامج بث وتواصل اجتماعي لصناع المحتوى النشطين.", description: "", status: "active", sort_order: 3, is_visible: true, is_active: true },
  { id: 4, name: "Xena", slug: "xena", short_description: "فرص محتوى وتطوير للحسابات المناسبة للبرنامج.", description: "", status: "active", sort_order: 4, is_visible: true, is_active: true },
  { id: 5, name: "Catchii", slug: "catchii", short_description: "برنامج متاح لصناع المحتوى ضمن وكالة حمزة.", description: "", status: "active", sort_order: 5, is_visible: true, is_active: true },
];

const fallbackStats = [["+500", "صانع محتوى"], ["5", "منصات متاحة"], ["24/7", "دعم ومتابعة"], ["50+", "فرصة نجاح شهرية"]];

function normalizeProgramKey(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function isBrandProgram(program: Program) {
  return BRAND_PROGRAM_NAMES.has(normalizeProgramKey(program.slug)) || BRAND_PROGRAM_NAMES.has(normalizeProgramKey(program.name));
}

function getRequiredFields(values: Partial<Record<CmsTranslationField, string | null>>) {
  return CMS_TRANSLATION_FIELDS.filter((field) => Boolean(values[field]?.trim()));
}

function createCmsTranslationSource({ sourceKey, sourceType, sourceId, values, fallback }: {
  sourceKey: string;
  sourceType: CmsPublishedTranslationSource["sourceType"];
  sourceId: number | null | undefined;
  values: Partial<Record<CmsTranslationField, string | null>>;
  fallback: CmsPublishedTranslationSource["fallback"];
}): CmsPublishedTranslationSource {
  return { sourceKey, sourceType, sourceId: sourceId ?? "", requiredFields: getRequiredFields(values), fallback };
}

function findHomeSection(sections: HomeSection[], sectionKey: string) {
  return sections.find((section) => section.section_key === sectionKey) || null;
}

export default function HomePage() {
  const language = useSiteLanguage();
  const homeCopy = getHomeStaticCopy(language);
  const [showSplash, setShowSplash] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<Setting[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [programs, setPrograms] = useState<Program[]>(fallbackPrograms);
  const [homepageContent, setHomepageContent] = useState<PageContent | null>(null);
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
  const [programCardTranslations, setProgramCardTranslations] = useState<PublishedTranslationMap<ProgramCardTranslationField>>({});
  const [form, setForm] = useState({ fullName: "", country: "", whatsapp: "", platform: "TikTok", previousExperience: "", notes: "" });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { void loadPublicCmsData(); }, []);

  useEffect(() => {
    let isCurrent = true;
    async function loadProgramTranslations() {
      const translations = await readPublishedTranslations({ sourceType: "programs", language, sourceIds: programs.map((program) => program.id), fields: PROGRAM_CARD_TRANSLATION_FIELDS });
      if (isCurrent) setProgramCardTranslations(translations);
    }
    void loadProgramTranslations();
    return () => { isCurrent = false; };
  }, [language, programs]);

  async function loadPublicCmsData() {
    if (!isSupabaseConfigured || !supabase) return;
    const [settingsResult, mediaResult, announcementsResult, programsResult, pagesResult] = await Promise.all([
      supabase.from("settings").select("setting_key, setting_value, setting_group, is_public").eq("is_public", true),
      supabase.from("media").select("name, file_url, file_type, category, alt_text, page_slug, is_active").eq("is_active", true),
      supabase.from("announcements").select("id, title, content, start_date, end_date, is_active, show_on_homepage, priority").eq("is_active", true).eq("show_on_homepage", true).order("priority", { ascending: true }),
      supabase.from("programs").select("id, name, slug, short_description, description, status, sort_order, is_visible, is_active").eq("is_visible", true).eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("pages").select("id, title, slug, content, seo_description, is_homepage, is_published").eq("is_homepage", true).eq("is_published", true).limit(1),
    ]);
    if (!settingsResult.error && settingsResult.data) setSettings(settingsResult.data);
    if (!mediaResult.error && mediaResult.data) setMediaItems(mediaResult.data);
    if (!announcementsResult.error && announcementsResult.data) setAnnouncements(announcementsResult.data.filter((item) => isAnnouncementVisible(item)));
    if (!programsResult.error && programsResult.data?.length) {
      setPrograms(programsResult.data);
      setForm((current) => ({ ...current, platform: programsResult.data?.[0]?.name || "TikTok" }));
    }
    const homePage = !pagesResult.error ? pagesResult.data?.[0] : null;
    if (!homePage) return;
    setHomepageContent(homePage);
    const { data: sections, error: sectionsError } = await supabase.from("sections").select("id, section_key, title, subtitle, content, is_visible").eq("page_id", homePage.id).eq("is_visible", true).in("section_key", ["hero", "available-programs", "join-cta"]).order("sort_order", { ascending: true });
    if (!sectionsError && sections) setHomeSections(sections);
  }

  function getSetting(keys: string[], fallback: string) {
    for (const key of keys) {
      const value = settings.find((item) => item.setting_key === key)?.setting_value;
      if (value && value.trim()) return value.trim();
    }
    return fallback;
  }

  function isAnnouncementVisible(item: Announcement) {
    const now = new Date();
    const startDate = item.start_date ? new Date(item.start_date) : null;
    const endDate = item.end_date ? new Date(item.end_date) : null;
    return !(item.is_active === false || item.show_on_homepage === false || (startDate && now < startDate) || (endDate && now > endDate));
  }

  function getMediaByPurpose(options: { pageSlug?: string; category?: string; fileType?: string; nameIncludes?: string }) {
    return mediaItems.find((item) => {
      const pageMatch = options.pageSlug ? item.page_slug === options.pageSlug || item.page_slug === "global" : true;
      const categoryMatch = options.category ? item.category === options.category : true;
      const typeMatch = options.fileType ? item.file_type === options.fileType : true;
      const nameMatch = options.nameIncludes ? (item.name || "").toLowerCase().includes(options.nameIncludes.toLowerCase()) : true;
      return pageMatch && categoryMatch && typeMatch && nameMatch;
    });
  }

  function getUsableImageUrl(media: MediaItem | undefined, fallback: string) {
    const url = media?.file_url || "";
    return url.startsWith("http") || url.startsWith("/") ? url : fallback;
  }

  function normalizeAnnouncementPosition(value: string): AnnouncementPosition {
    const normalized = value.toLowerCase().trim();
    if (normalized === "top" || normalized === "top_site" || normalized === "site_top") return "top";
    if (normalized === "under_nav" || normalized === "under_logo" || normalized === "below_nav" || normalized === "below_logo") return "under_nav";
    if (normalized === "inside_hero" || normalized === "hero" || normalized === "in_hero") return "inside_hero";
    if (normalized === "hidden" || normalized === "off" || normalized === "none") return "hidden";
    return "under_nav";
  }

  function normalizeAnnouncementAnimation(value: string): AnnouncementAnimation {
    const normalized = value.toLowerCase().trim();
    return normalized === "marquee" || normalized === "moving" || normalized === "move" ? "marquee" : "fixed";
  }

  const publicSettings = useMemo(() => {
    const agencyName = getSetting(["agency_name_ar", "agency_name", "site_name", "brand_name"], "وكالة حمزة");
    const englishName = getSetting(["agency_name_en", "site_name", "site_name_en", "english_name", "company_name"], "HAMZA AGENCY");
    const whatsapp = getSetting(["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
    const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
    const contactEmail = getSetting(["contact_email", "support_email", "email"], "hamza.alshami.13579@gmail.com");
    const footerDescription = getSetting(["footer_description_ar", "footer_description", "site_description"], "وكالة حمزة منصة وكالة متخصصة في تنظيم ودعم صناع المحتوى على برامج ومنصات البث والتواصل.");
    const footerCopyright = getSetting(["footer_copyright_ar", "footer_copyright", "footer_text"], "جميع الحقوق محفوظة لوكالة حمزة");
    const socialLinks = [
      { label: "TikTok", href: getSetting(["social_tiktok_url"], "") },
      { label: "Instagram", href: getSetting(["social_instagram_url"], "") },
      { label: "Facebook", href: getSetting(["social_facebook_url"], "") },
      { label: "Telegram", href: getSetting(["social_telegram_url"], "") },
    ].filter((link) => link.href.trim().length > 0);
    return {
      agencyName, englishName, whatsapp, cleanWhatsapp, contactEmail, footerDescription, footerCopyright, socialLinks,
      footerWhatsappLabel: getSetting(["footer_whatsapp_label"], "فتح واتساب"),
      workingHours: getSetting(["working_hours"], "تتم المتابعة حسب توفر فريق الوكالة وضغط الطلبات"),
      primaryColor: getSetting(["primary_color"], "#7c3aed"), secondaryColor: getSetting(["secondary_color"], "#d4af37"),
      heroTitle: getSetting(["home_hero_title", "hero_title"], "وكالة حمزة لإدارة وتطوير"), heroHighlight: "وكالة حمزة",
      heroDescription: getSetting(["home_hero_description", "hero_description", "site_description", "site_tagline_ar"], "نساعد صناع المحتوى على النمو وتحقيق الأرباح على منصات البث المباشر والتواصل الاجتماعي من خلال إدارة احترافية، دعم يومي، وفرص حقيقية للتطور."),
      heroBadge: getSetting(["home_hero_badge", "hero_badge"], "وكالة عالمية محترفة لإدارة صناع المحتوى"),
      announcementPosition: normalizeAnnouncementPosition(getSetting(["announcement_bar_position", "announcement_position"], "under_nav")),
      announcementAnimation: normalizeAnnouncementAnimation(getSetting(["announcement_bar_animation", "announcement_animation"], "marquee")),
      announcementSpeed: Number(getSetting(["announcement_bar_speed", "announcement_speed"], "22")),
    };
  }, [settings]);

  const footerLegalLinksFromSettings = useMemo(() => {
    const rawValue = settings.find((item) => item.setting_key === "public_footer_links_json")?.setting_value;
    if (!rawValue?.trim()) return footerLegalLinks;
    try {
      const parsed = JSON.parse(rawValue) as PublicNavigationLink[];
      const normalized = normalizePublicNavigationConfig({ ...defaultPublicNavigationConfig, footerLinks: parsed });
      const safeLinks = normalized.footerLinks.filter((link) => !link.href.startsWith("/admin"));
      return safeLinks.length ? safeLinks : footerLegalLinks;
    } catch { return footerLegalLinks; }
  }, [settings]);

  const headerLinksFromSettings = useMemo(() => {
    const rawValue = settings.find((item) => item.setting_key === "public_header_links_json")?.setting_value;
    if (!rawValue?.trim()) return mainNavigationLinks;
    try {
      const parsed = JSON.parse(rawValue) as PublicNavigationLink[];
      const normalized = normalizePublicNavigationConfig({ ...defaultPublicNavigationConfig, headerLinks: parsed });
      const safeLinks = normalized.headerLinks.filter((link) => !link.href.startsWith("/admin"));
      return safeLinks.length ? safeLinks : mainNavigationLinks;
    } catch { return mainNavigationLinks; }
  }, [settings]);

  const ctaLinksFromSettings = useMemo(() => {
    const rawValue = settings.find((item) => item.setting_key === "public_cta_links_json")?.setting_value;
    if (!rawValue?.trim()) return defaultPublicNavigationConfig.ctaLinks;
    try {
      const parsed = JSON.parse(rawValue) as PublicNavigationLink[];
      const normalized = normalizePublicNavigationConfig({ ...defaultPublicNavigationConfig, ctaLinks: parsed });
      const safeLinks = normalized.ctaLinks.filter((link) => !link.href.startsWith("/admin"));
      return safeLinks.length ? safeLinks : defaultPublicNavigationConfig.ctaLinks;
    } catch { return defaultPublicNavigationConfig.ctaLinks; }
  }, [settings]);

  const primaryJoinCta = ctaLinksFromSettings.find((link) => link.key === "primary_join") || ctaLinksFromSettings.find((link) => link.href === "/apply") || { key: "primary_join", label: "انضم الآن", href: "/apply", type: "cta", isVisible: true, sortOrder: 1 };
  const viewProgramsCta = ctaLinksFromSettings.find((link) => link.key === "view_programs") || ctaLinksFromSettings.find((link) => link.href === "/programs") || { key: "view_programs", label: "عرض البرامج", href: "/programs", type: "cta", isVisible: true, sortOrder: 2 };
  const heroSection = findHomeSection(homeSections, "hero");
  const programsSection = findHomeSection(homeSections, "available-programs");
  const joinCtaSection = findHomeSection(homeSections, "join-cta");
  const pageTitle = homepageContent?.title?.trim() || publicSettings.heroTitle;
  const pageContent = homepageContent?.content?.trim() || publicSettings.heroDescription;
  const heroBadge = heroSection?.subtitle?.trim() || publicSettings.heroBadge;
  const heroHighlight = heroSection?.title?.trim() || publicSettings.heroHighlight;
  const programsTitle = programsSection?.title?.trim() || "البرامج المتاحة حالياً";
  const programsDescription = programsSection?.subtitle?.trim() || programsSection?.content?.trim() || "اختر البرنامج المناسب لك لعرض التفاصيل الكاملة، الشروط، نظام العمل، وما تقدمه وكالة حمزة.";
  const joinLabel = joinCtaSection?.title?.trim() || getSharedNavigationLabelByHref(language, primaryJoinCta.href, primaryJoinCta.label);
  const joinModalTitle = joinCtaSection?.subtitle?.trim() || "طلب الانضمام للوكالة";

  const translationSources = useMemo<CmsPublishedTranslationSource[]>(() => [
    createCmsTranslationSource({ sourceKey: "home-page", sourceType: "pages", sourceId: homepageContent?.id, values: { title: homepageContent?.title, summary: homepageContent?.seo_description, content: homepageContent?.content }, fallback: { title: pageTitle, content: pageContent } }),
    createCmsTranslationSource({ sourceKey: "home-hero", sourceType: "sections", sourceId: heroSection?.id, values: { title: heroSection?.title, summary: heroSection?.subtitle, content: heroSection?.content }, fallback: { title: heroHighlight, summary: heroBadge, content: heroSection?.content || "" } }),
    createCmsTranslationSource({ sourceKey: "home-available-programs", sourceType: "sections", sourceId: programsSection?.id, values: { title: programsSection?.title, summary: programsSection?.subtitle, content: programsSection?.content }, fallback: { title: programsTitle, summary: programsDescription, content: programsSection?.content || "" } }),
    createCmsTranslationSource({ sourceKey: "home-join-cta", sourceType: "sections", sourceId: joinCtaSection?.id, values: { title: joinCtaSection?.title, summary: joinCtaSection?.subtitle, content: joinCtaSection?.content }, fallback: { title: joinLabel, summary: joinModalTitle, content: joinCtaSection?.content || "" } }),
  ], [homepageContent, heroSection, programsSection, joinCtaSection, pageTitle, pageContent, heroHighlight, heroBadge, programsTitle, programsDescription, joinLabel, joinModalTitle]);

  const logoMedia = getMediaByPurpose({ category: "logo", nameIncludes: "logo" });
  const homeBackgroundMedia = getMediaByPurpose({ pageSlug: "home", category: "background", fileType: "background_video" }) || getMediaByPurpose({ pageSlug: "home", category: "background", fileType: "video" }) || getMediaByPurpose({ pageSlug: "home", category: "background", fileType: "image" }) || getMediaByPurpose({ pageSlug: "home", category: "background" });
  const logoUrl = getUsableImageUrl(logoMedia, "/Logo%20hamza%20agency.jpg");
  const activePrograms = programs.length ? programs : fallbackPrograms;
  const activeAnnouncement = announcements[0] || null;
  const homeStats = fallbackStats.map(([fallbackNumber, fallbackLabel], index) => [getSetting([`home_stat_${index + 1}_number`], fallbackNumber), getSetting([`home_stat_${index + 1}_label`], fallbackLabel)]);
  const translatedPrograms = useMemo(() => activePrograms.map((program) => {
    const translation = programCardTranslations[String(program.id)];
    const hasTranslation = language !== "ar" && hasCompletePublishedTranslation(translation, PROGRAM_CARD_TRANSLATION_FIELDS);
    return {
      ...program,
      displaySummary: hasTranslation ? translation?.summary || program.short_description || program.description || "عرض تفاصيل البرنامج" : program.short_description || "عرض تفاصيل البرنامج",
      usesTranslatedName: hasTranslation && !isBrandProgram(program),
      translatedName: hasTranslation && !isBrandProgram(program) ? translation?.title || program.name || "" : program.name || "",
    };
  }), [activePrograms, language, programCardTranslations]);
  const getSharedLabel = (href: string, fallback: string) => getSharedNavigationLabelByHref(language, href, fallback);
  const updateField = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (!form.fullName || !form.country || !form.whatsapp || !form.platform) { setMessage(homeCopy.requiredFieldsMessage); return; }
    if (!isSupabaseConfigured || !supabase) { setMessage(homeCopy.databaseUnavailableMessage); return; }
    const duplicateKey = `hamza-agency-${form.whatsapp}-${form.platform}`;
    if (localStorage.getItem(duplicateKey)) { setMessage(homeCopy.duplicateApplicationMessage); return; }
    setIsSubmitting(true);
    const { error } = await supabase.from("agency_applications").insert({ full_name: form.fullName.trim(), country: form.country.trim(), whatsapp: form.whatsapp.trim(), platform: form.platform, previous_experience: form.previousExperience.trim(), notes: form.notes.trim(), status: "new" });
    setIsSubmitting(false);
    if (error) { console.error("Supabase insert error:", error); setMessage(homeCopy.submitErrorMessage); return; }
    localStorage.setItem(duplicateKey, "true");
    setMessage(homeCopy.submitSuccessMessage);
    setForm({ fullName: "", country: "", whatsapp: "", platform: activePrograms[0]?.name || "TikTok", previousExperience: "", notes: "" });
    setTimeout(() => { setMessage(""); setShowJoinForm(false); }, 3500);
  };

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main dir={getLanguageDirection(language)} className="relative min-h-screen overflow-hidden bg-[#070009] text-white" style={{ "--primary": publicSettings.primaryColor, "--secondary": publicSettings.secondaryColor } as CSSProperties}>
        <SiteAnimationStyles />
        <PublicBackground media={homeBackgroundMedia} />
        {showSplash && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 transition-opacity duration-500"><div className="absolute h-72 w-72 rounded-full bg-purple-700/30 blur-3xl" /><div className="absolute h-96 w-96 animate-pulse rounded-full border border-purple-500/20" /><div className="relative text-center"><img src={logoUrl} alt={publicSettings.englishName} className="mx-auto h-36 w-36 rounded-3xl object-cover shadow-[0_0_90px_rgba(168,85,247,0.7)]" /><p className="mt-5 text-sm font-black uppercase tracking-[0.35em] text-purple-100/75" dir="ltr">HAMZA AGENCY</p></div></div>}
        {publicSettings.announcementPosition === "top" && activeAnnouncement && <AnnouncementBar announcement={activeAnnouncement} animation={publicSettings.announcementAnimation} speed={publicSettings.announcementSpeed} />}
        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-6"><Link href="/" className="flex items-center gap-3"><img src={logoUrl} alt={publicSettings.englishName} className="h-12 w-12 rounded-xl object-cover shadow-[0_0_25px_rgba(168,85,247,0.45)]" /><div><div className="text-sm font-bold">{publicSettings.englishName}</div><div className="text-xs text-yellow-200/80">{publicSettings.agencyName}</div></div></Link><div className="hidden items-center gap-2 lg:flex">{headerLinksFromSettings.map((link) => <Link key={link.href} href={link.href} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/70 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white">{getSharedLabel(link.href, link.label)}</Link>)}</div></nav>
        <div className="relative z-20 mx-auto mb-4 max-w-7xl px-5 lg:hidden"><div className="flex gap-2 overflow-x-auto pb-2">{headerLinksFromSettings.map((link) => <Link key={link.href} href={link.href} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/75 backdrop-blur">{getSharedLabel(link.href, link.label)}</Link>)}</div></div>
        {publicSettings.announcementPosition === "under_nav" && activeAnnouncement && <div className="relative z-20 mx-auto max-w-7xl px-5"><AnnouncementBar announcement={activeAnnouncement} animation={publicSettings.announcementAnimation} speed={publicSettings.announcementSpeed} rounded /></div>}
        <section className="relative z-20 mx-auto max-w-7xl px-5 pb-20 pt-10 text-center"><HeroVideoVisual />{publicSettings.announcementPosition === "inside_hero" && activeAnnouncement && <div className="relative z-20 mx-auto mb-8 max-w-4xl"><AnnouncementBar announcement={activeAnnouncement} animation={publicSettings.announcementAnimation} speed={publicSettings.announcementSpeed} rounded /></div>}<div className="relative z-20"><img src={logoUrl} alt={`${publicSettings.englishName} Logo`} className="mx-auto mb-8 h-44 w-44 rounded-[2rem] object-cover shadow-[0_0_95px_rgba(168,85,247,0.65)]" /><div className="mx-auto mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm text-purple-100 backdrop-blur"><CmsPublishedText sourceKey="home-hero" field="summary" fallback={heroBadge} /></div><h1 className="text-5xl font-black leading-tight md:text-7xl"><CmsPublishedText sourceKey="home-page" field="title" fallback={pageTitle} /><span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent"><CmsPublishedText sourceKey="home-hero" field="title" fallback={heroHighlight} /></span></h1><p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/80 md:text-2xl"><CmsPublishedText sourceKey="home-page" field="content" fallback={pageContent} /></p><div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">{primaryJoinCta.isVisible !== false && <button onClick={() => setShowJoinForm(true)} className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-9 py-4 text-lg font-bold shadow-[0_0_40px_rgba(168,85,247,0.45)] transition hover:scale-[1.03]"><CmsPublishedText sourceKey="home-join-cta" field="title" fallback={joinLabel} /></button>}{viewProgramsCta.isVisible !== false && <Link href={viewProgramsCta.href} className="rounded-full border border-white/15 bg-white/[0.05] px-9 py-4 text-lg font-bold text-white/80 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10">{getSharedLabel(viewProgramsCta.href, viewProgramsCta.label)}</Link>}</div></div></section>
        <section className="relative z-20 mx-auto grid max-w-6xl grid-cols-2 gap-5 px-5 pb-20 lg:grid-cols-4">{homeStats.map(([number, label]) => <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-7 text-center backdrop-blur"><div className="bg-gradient-to-r from-purple-300 to-yellow-300 bg-clip-text text-4xl font-black text-transparent">{number}</div><div className="mt-3 text-white/75">{label}</div></div>)}</section>
        <section className="relative z-20 mx-auto max-w-7xl px-5 pb-24"><h2 className="text-center text-4xl font-black"><CmsPublishedText sourceKey="home-available-programs" field="title" fallback={programsTitle} /></h2><p className="mx-auto mt-4 max-w-2xl text-center text-white/60"><CmsPublishedText sourceKey="home-available-programs" field="summary" fallback={programsDescription} /></p><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">{translatedPrograms.map((program) => <Link key={program.id} href={program.slug ? `/programs/${program.slug}` : "/programs"} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur transition hover:border-purple-400/60 hover:bg-purple-500/10"><div className="mb-3 inline-flex rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-200">{program.status === "limited" ? homeCopy.statusLimited : program.status === "paused" ? homeCopy.statusPaused : homeCopy.statusAvailable}</div><div className="text-2xl font-black" dir={program.usesTranslatedName ? "ltr" : undefined}>{program.translatedName}</div><div className="mt-3 text-sm leading-7 text-white/60" dir={language === "ar" ? "rtl" : "ltr"}>{program.displaySummary}</div></Link>)}</div>{viewProgramsCta.isVisible !== false && <div className="mt-10 text-center"><Link href={viewProgramsCta.href} className="inline-flex rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black shadow-[0_0_35px_rgba(168,85,247,0.22)]">{getSharedLabel(viewProgramsCta.href, viewProgramsCta.label)}</Link></div>}</section>
        <section className="relative z-20 mx-auto max-w-6xl px-5 pb-24"><div className="rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-8 backdrop-blur"><h2 className="text-3xl font-black">{homeCopy.whyTitle}</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{homeCopy.whyItems.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/25 p-5">{item}</div>)}</div><div className="mt-8 grid gap-4 md:grid-cols-3"><Link href="/about" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center font-bold text-white/75 transition hover:border-purple-400/50">{getSharedLabel("/about", "تعرف علينا")}</Link><Link href="/services" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center font-bold text-white/75 transition hover:border-purple-400/50">{getSharedLabel("/services", "خدمات الوكالة")}</Link><Link href="/contact" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center font-bold text-white/75 transition hover:border-purple-400/50">{getSharedLabel("/contact", "تواصل معنا")}</Link></div></div></section>
        {showJoinForm && <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur"><div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6 shadow-[0_0_80px_rgba(168,85,247,0.25)]"><div className="mb-6 flex items-center justify-between"><button onClick={() => { setMessage(""); setShowJoinForm(false); }} className="rounded-full border border-white/15 px-5 py-2 text-white/70">{homeCopy.close}</button><h2 className="text-3xl font-black"><CmsPublishedText sourceKey="home-join-cta" field="summary" fallback={joinModalTitle} /></h2></div><form onSubmit={handleSubmit} className="space-y-5"><input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder={homeCopy.fullNamePlaceholder} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" /><input value={form.country} onChange={(event) => updateField("country", event.target.value)} placeholder={homeCopy.countryPlaceholder} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" /><input value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} placeholder={homeCopy.whatsappPlaceholder} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" /><select value={form.platform} onChange={(event) => updateField("platform", event.target.value)} className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400">{activePrograms.map((program) => <option key={program.id} value={program.name || ""}>{program.name}</option>)}</select><div className="rounded-3xl border border-white/10 bg-black/30 p-5"><h3 className="mb-3 text-2xl font-black">{homeCopy.previousExperienceTitle}</h3><p className="mb-4 text-lg text-purple-200">{homeCopy.previousExperiencePrompt}</p><textarea value={form.previousExperience} onChange={(event) => updateField("previousExperience", event.target.value)} placeholder={homeCopy.previousExperiencePlaceholder} className="min-h-40 w-full resize-none bg-transparent text-xl outline-none" /></div><textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder={homeCopy.notesPlaceholder} className="min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />{message && <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-center text-xl font-bold text-yellow-100">{message}</div>}<button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black disabled:opacity-60">{isSubmitting ? homeCopy.submitting : homeCopy.submitApplication}</button></form></div></div>}
        <a href={`https://wa.me/${publicSettings.cleanWhatsapp}`} target="_blank" className="fixed bottom-5 left-5 z-30 rounded-full bg-green-500 px-5 py-4 text-sm font-black text-white shadow-2xl">{getStaticCopy(language, "whatsapp")}</a>
        <footer className="relative z-20 border-t border-white/10 bg-black/25 px-5 py-10 backdrop-blur"><div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4"><div><div className="flex items-center gap-3"><img src={logoUrl} alt={publicSettings.englishName} className="h-12 w-12 rounded-xl object-cover" /><div><div className="font-black">{publicSettings.englishName}</div><div className="text-sm text-yellow-200/75">{publicSettings.agencyName}</div></div></div><p className="mt-5 leading-8 text-white/55">{publicSettings.footerDescription}</p>{publicSettings.socialLinks.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{publicSettings.socialLinks.map((link) => <a key={link.label} href={link.href} target="_blank" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-purple-400/50 hover:text-white">{link.label}</a>)}</div>}</div><div><h3 className="font-black text-white">{getStaticCopy(language, "footerSiteLinks")}</h3><div className="mt-4 grid gap-3 text-white/60">{headerLinksFromSettings.map((link) => <Link key={link.href} href={link.href} className="transition hover:text-purple-200">{getSharedLabel(link.href, link.label)}</Link>)}</div></div><div><h3 className="font-black text-white">{getStaticCopy(language, "footerLegalPages")}</h3><div className="mt-4 grid gap-3 text-white/60">{footerLegalLinksFromSettings.map((link) => link.href.startsWith("/") || link.href.startsWith("#") ? <Link key={link.href} href={link.href} className="transition hover:text-yellow-200">{getSharedLabel(link.href, link.label)}</Link> : <a key={link.href} href={link.href} target={link.target || "_blank"} rel={link.rel || "noreferrer"} className="transition hover:text-yellow-200">{link.label}</a>)}</div></div><div><h3 className="font-black text-white">{getStaticCopy(language, "footerContact")}</h3><p className="mt-4 text-white/60">{publicSettings.whatsapp}</p><p className="mt-2 break-all text-white/50">{publicSettings.contactEmail}</p><p className="mt-3 leading-7 text-white/45">{publicSettings.workingHours}</p><a href={`https://wa.me/${publicSettings.cleanWhatsapp}`} target="_blank" className="mt-5 inline-flex rounded-full bg-green-500 px-6 py-3 font-black text-white">{publicSettings.footerWhatsappLabel}</a></div></div><div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-center text-sm text-white/45">{publicSettings.footerCopyright}</div></footer>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}

function AnnouncementBar({ announcement, animation, speed, rounded = false }: { announcement: Announcement; animation: AnnouncementAnimation; speed: number; rounded?: boolean }) {
  const text = `${announcement.title || ""} — ${announcement.content || ""}`;
  if (!text.trim()) return null;
  return <div className={`overflow-hidden border border-yellow-400/20 bg-yellow-400/10 text-yellow-100 shadow-[0_0_35px_rgba(212,175,55,0.12)] backdrop-blur ${rounded ? "rounded-2xl" : "border-x-0"}`}>{animation === "marquee" ? <div className="hamza-marquee-track flex w-max whitespace-nowrap py-3 text-sm font-bold md:text-base" style={{ "--marquee-duration": `${speed || 22}s` } as CSSProperties}><span className="mx-8">{text}</span><span className="mx-8">{text}</span><span className="mx-8">{text}</span><span className="mx-8">{text}</span></div> : <div className="px-4 py-3 text-center text-sm font-bold md:text-base"><span className="text-yellow-200">{announcement.title}</span><span className="mx-2 text-white/40">—</span><span>{announcement.content}</span></div>}</div>;
}

function PublicBackground({ media }: { media: MediaItem | undefined }) {
  const url = media?.file_url || "";
  const fileType = media?.file_type || "";
  const isUsableUrl = url.startsWith("http") || url.startsWith("/");
  const isVideo = fileType === "video" || fileType === "background_video" || /\.(mp4|webm|ogg)$/i.test(url);
  const isImage = fileType === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  if (isUsableUrl && isVideo) return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><video className="h-full w-full object-cover opacity-36" src={url} autoPlay loop muted playsInline /><div className="absolute inset-0 bg-[#050008]/74" /><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,5,32,0.35),rgba(5,0,8,0.94))]" /></div>;
  if (isUsableUrl && isImage) return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-cover bg-center opacity-34" style={{ backgroundImage: `url("${url}")` }} /><div className="absolute inset-0 bg-[#050008]/76" /><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,5,32,0.35),rgba(5,0,8,0.94))]" /></div>;
  return <GeneratedBackground variant={url || "generated://premium-luxury-dark"} />;
}

function GeneratedBackground({ variant }: { variant: string }) {
  const normalized = variant.replace("generated://", "");
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#040006]" /><div className="absolute inset-0 bg-[linear-gradient(180deg,#16072a_0%,#09000f_48%,#030004_100%)]" /><div className="premium-purple-depth absolute inset-0 opacity-95" /><div className="premium-silk-one absolute -left-[18%] top-[18%] h-[360px] w-[145vw] rotate-[-9deg] rounded-[999px] bg-gradient-to-r from-transparent via-purple-500/18 to-transparent blur-3xl" /><div className="premium-silk-two absolute -right-[20%] top-[34%] hidden h-[260px] w-[135vw] rotate-[8deg] rounded-[999px] bg-gradient-to-r from-transparent via-violet-300/12 to-transparent blur-3xl md:block" /><div className="premium-gold-thread absolute left-[-8%] top-[34%] h-[2px] w-[116vw] rotate-[-5deg] bg-gradient-to-r from-transparent via-yellow-200/34 to-transparent blur-[1px]" /><div className="premium-gold-soft absolute right-[-20%] top-[24%] h-[240px] w-[55vw] rounded-full bg-yellow-300/8 blur-[90px]" /><div className="premium-bottom-shadow absolute bottom-0 left-0 right-0 h-[45vh] bg-gradient-to-t from-black via-black/78 to-transparent" /><div className="premium-fine-texture absolute inset-0 opacity-[0.055] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.55)_1px,transparent_0)] [background-size:54px_54px]" /><div className="premium-glint premium-glint-one absolute h-1.5 w-1.5 rounded-full bg-yellow-100/70 shadow-[0_0_22px_rgba(254,240,138,0.8)]" /><div className="premium-glint premium-glint-two absolute h-1.5 w-1.5 rounded-full bg-purple-100/65 shadow-[0_0_22px_rgba(216,180,254,0.75)]" />{normalized.includes("programs") && <div className="absolute left-[8%] top-[38%] hidden h-24 w-40 rounded-[2rem] border border-purple-300/10 bg-white/[0.025] backdrop-blur md:block" />}</div>;
}

function HeroVideoVisual() {
  return <div className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[500px] max-w-6xl overflow-hidden opacity-75"><div className="premium-hero-aura absolute left-1/2 top-28 h-72 w-[680px] -translate-x-1/2 rounded-full bg-purple-500/14 blur-[85px]" /><div className="premium-hero-gold absolute left-1/2 top-48 h-px w-[540px] -translate-x-1/2 bg-gradient-to-r from-transparent via-yellow-100/28 to-transparent" /></div>;
}

function SiteAnimationStyles() {
  return <style>{`
    @keyframes hamzaMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(50%); } }
    .hamza-marquee-track { animation: hamzaMarquee var(--marquee-duration, 22s) linear infinite; }
    @keyframes premiumDepth { 0%, 100% { background: radial-gradient(circle at 50% 0%, rgba(91, 33, 182, 0.34), transparent 52%), radial-gradient(circle at 18% 22%, rgba(124, 58, 237, 0.14), transparent 34%), radial-gradient(circle at 85% 30%, rgba(212, 175, 55, 0.055), transparent 34%); } 50% { background: radial-gradient(circle at 48% 3%, rgba(109, 40, 217, 0.42), transparent 54%), radial-gradient(circle at 22% 26%, rgba(124, 58, 237, 0.18), transparent 35%), radial-gradient(circle at 80% 27%, rgba(212, 175, 55, 0.085), transparent 34%); } }
    @keyframes premiumSilkOne { 0%, 100% { transform: translate3d(0, 0, 0) rotate(-9deg); opacity: 0.72; } 50% { transform: translate3d(3%, 18px, 0) rotate(-8deg); opacity: 0.92; } }
    @keyframes premiumSilkTwo { 0%, 100% { transform: translate3d(0, 0, 0) rotate(8deg); opacity: 0.45; } 50% { transform: translate3d(-3%, -12px, 0) rotate(7deg); opacity: 0.65; } }
    @keyframes premiumGoldThread { 0%, 100% { transform: translate3d(0, 0, 0) rotate(-5deg); opacity: 0.42; } 50% { transform: translate3d(2%, 7px, 0) rotate(-4.5deg); opacity: 0.7; } }
    @keyframes premiumGoldSoft { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.58; } 50% { transform: translate3d(-24px, 12px, 0) scale(1.04); opacity: 0.82; } }
    @keyframes premiumGlint { 0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.18; } 50% { transform: translate3d(var(--x), var(--y), 0); opacity: 0.82; } }
    @keyframes premiumHeroAura { 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.55; } 50% { transform: translateX(-50%) scale(1.04); opacity: 0.78; } }
    @keyframes premiumHeroGold { 0%, 100% { opacity: 0.18; transform: translateX(-50%) scaleX(0.9); } 50% { opacity: 0.45; transform: translateX(-50%) scaleX(1.04); } }
    .premium-purple-depth { animation: premiumDepth 28s ease-in-out infinite; }
    .premium-silk-one { animation: premiumSilkOne 24s ease-in-out infinite; will-change: transform, opacity; }
    .premium-silk-two { animation: premiumSilkTwo 30s ease-in-out infinite; will-change: transform, opacity; }
    .premium-gold-thread { animation: premiumGoldThread 26s ease-in-out infinite; will-change: transform, opacity; }
    .premium-gold-soft { animation: premiumGoldSoft 30s ease-in-out infinite; will-change: transform, opacity; }
    .premium-glint { animation: premiumGlint 18s ease-in-out infinite; will-change: transform, opacity; }
    .premium-glint-one { left: 18%; top: 31%; --x: 42px; --y: 26px; }
    .premium-glint-two { right: 22%; top: 46%; --x: -38px; --y: 30px; animation-delay: -7s; }
    .premium-hero-aura { animation: premiumHeroAura 18s ease-in-out infinite; }
    .premium-hero-gold { animation: premiumHeroGold 16s ease-in-out infinite; }
    @media (max-width: 768px) { .premium-silk-one { animation-duration: 34s; opacity: 0.65; } .premium-purple-depth { animation-duration: 40s; } .premium-gold-thread, .premium-gold-soft, .premium-glint, .premium-hero-aura, .premium-hero-gold { animation: none !important; } .premium-fine-texture { opacity: 0.035; } }
    @media (prefers-reduced-motion: reduce) { .hamza-marquee-track, .premium-purple-depth, .premium-silk-one, .premium-silk-two, .premium-gold-thread, .premium-gold-soft, .premium-glint, .premium-hero-aura, .premium-hero-gold { animation: none !important; } }
  `}</style>;
}
