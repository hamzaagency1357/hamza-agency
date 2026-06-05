"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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

type Setting = {
  setting_key: string | null;
  setting_value: string | null;
  setting_group: string | null;
  is_public: boolean | null;
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

type PageContent = {
  title: string | null;
  slug: string | null;
  content: string | null;
  is_homepage: boolean | null;
  is_published: boolean | null;
};

type AnnouncementPosition = "top" | "under_nav" | "inside_hero" | "hidden";
type AnnouncementAnimation = "fixed" | "marquee";

const mainNavigationLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "البرامج", href: "/programs" },
  { label: "من نحن", href: "/about" },
  { label: "الخدمات", href: "/services" },
  { label: "الخدمات الرقمية", href: "/digital-services" },
  { label: "مركز المعرفة", href: "/knowledge-center" },
  { label: "FAQ", href: "/faq" },
  { label: "اتصل بنا", href: "/contact" },
];

const footerLegalLinks = [
  { label: "سياسة الخصوصية", href: "/privacy-policy" },
  { label: "الشروط والأحكام", href: "/terms-and-conditions" },
  { label: "AI Policy", href: "/ai-policy" },
];

const fallbackPrograms: Program[] = [
  {
    id: 1,
    name: "TikTok",
    slug: "tiktok",
    short_description: "برنامج مناسب لصناع المحتوى الراغبين بالنمو على TikTok.",
    description: "",
    status: "active",
    sort_order: 1,
    is_visible: true,
    is_active: true,
  },
  {
    id: 2,
    name: "BIGO LIVE",
    slug: "bigo-live",
    short_description: "فرص بث مباشر ودعم لصناع المحتوى على BIGO LIVE.",
    description: "",
    status: "active",
    sort_order: 2,
    is_visible: true,
    is_active: true,
  },
  {
    id: 3,
    name: "Yaahlan",
    slug: "yaahlan",
    short_description: "برنامج بث وتواصل اجتماعي لصناع المحتوى النشطين.",
    description: "",
    status: "active",
    sort_order: 3,
    is_visible: true,
    is_active: true,
  },
  {
    id: 4,
    name: "Xena",
    slug: "xena",
    short_description: "فرص محتوى وتطوير للحسابات المناسبة للبرنامج.",
    description: "",
    status: "active",
    sort_order: 4,
    is_visible: true,
    is_active: true,
  },
  {
    id: 5,
    name: "Catchii",
    slug: "catchii",
    short_description: "برنامج متاح لصناع المحتوى ضمن وكالة حمزة.",
    description: "",
    status: "active",
    sort_order: 5,
    is_visible: true,
    is_active: true,
  },
];

const fallbackStats = [
  ["+500", "صانع محتوى"],
  ["5", "منصات متاحة"],
  ["24/7", "دعم ومتابعة"],
  ["50+", "فرصة نجاح شهرية"],
];

const whyUsItems = [
  "إدارة احترافية لصناع المحتوى",
  "دعم فني ومتابعة يومية",
  "تطوير الحسابات وتحسين الأداء",
  "فرص انضمام لبرامج متعددة",
  "تدريب وإرشاد مستمر",
  "حل المشاكل التقنية بسرعة",
];

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [settings, setSettings] = useState<Setting[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [programs, setPrograms] = useState<Program[]>(fallbackPrograms);
  const [homepageContent, setHomepageContent] = useState<PageContent | null>(
    null
  );

  const [form, setForm] = useState({
    fullName: "",
    country: "",
    whatsapp: "",
    platform: "TikTok",
    previousExperience: "",
    notes: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadPublicCmsData();
  }, []);

  async function loadPublicCmsData() {
    if (!isSupabaseConfigured || !supabase) return;

    const [
      settingsResult,
      mediaResult,
      announcementsResult,
      programsResult,
      pagesResult,
    ] = await Promise.all([
      supabase
        .from("settings")
        .select("setting_key, setting_value, setting_group, is_public")
        .eq("is_public", true),

      supabase
        .from("media")
        .select(
          "name, file_url, file_type, category, alt_text, page_slug, is_active"
        )
        .eq("is_active", true),

      supabase
        .from("announcements")
        .select(
          "id, title, content, start_date, end_date, is_active, show_on_homepage, priority"
        )
        .eq("is_active", true)
        .eq("show_on_homepage", true)
        .order("priority", { ascending: true }),

      supabase
        .from("programs")
        .select(
          "id, name, slug, short_description, description, status, sort_order, is_visible, is_active"
        )
        .eq("is_visible", true)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),

      supabase
        .from("pages")
        .select("title, slug, content, is_homepage, is_published")
        .eq("is_homepage", true)
        .eq("is_published", true)
        .limit(1),
    ]);

    if (!settingsResult.error && settingsResult.data) {
      setSettings(settingsResult.data);
    }

    if (!mediaResult.error && mediaResult.data) {
      setMediaItems(mediaResult.data);
    }

    if (!announcementsResult.error && announcementsResult.data) {
      setAnnouncements(
        announcementsResult.data.filter((item) =>
          isAnnouncementVisible(item)
        )
      );
    }

    if (!programsResult.error && programsResult.data?.length) {
      setPrograms(programsResult.data);
      setForm((current) => ({
        ...current,
        platform: programsResult.data?.[0]?.name || "TikTok",
      }));
    }

    if (!pagesResult.error && pagesResult.data?.[0]) {
      setHomepageContent(pagesResult.data[0]);
    }
  }

  function getSetting(keys: string[], fallback: string) {
    for (const key of keys) {
      const value = settings.find((item) => item.setting_key === key)
        ?.setting_value;

      if (value && value.trim()) return value.trim();
    }

    return fallback;
  }

  function isAnnouncementVisible(item: Announcement) {
    const now = new Date();
    const startDate = item.start_date ? new Date(item.start_date) : null;
    const endDate = item.end_date ? new Date(item.end_date) : null;

    if (item.is_active === false) return false;
    if (item.show_on_homepage === false) return false;
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;

    return true;
  }

  function getMediaByPurpose(options: {
    pageSlug?: string;
    category?: string;
    fileType?: string;
    nameIncludes?: string;
  }) {
    return mediaItems.find((item) => {
      const pageMatch = options.pageSlug
        ? item.page_slug === options.pageSlug || item.page_slug === "global"
        : true;

      const categoryMatch = options.category
        ? item.category === options.category
        : true;

      const typeMatch = options.fileType
        ? item.file_type === options.fileType
        : true;

      const nameMatch = options.nameIncludes
        ? (item.name || "")
            .toLowerCase()
            .includes(options.nameIncludes.toLowerCase())
        : true;

      return pageMatch && categoryMatch && typeMatch && nameMatch;
    });
  }

  function getUsableImageUrl(media: MediaItem | undefined, fallback: string) {
    const url = media?.file_url || "";

    if (url.startsWith("http") || url.startsWith("/")) return url;

    return fallback;
  }

  function normalizeAnnouncementPosition(value: string): AnnouncementPosition {
    const normalized = value.toLowerCase().trim();

    if (
      normalized === "top" ||
      normalized === "top_site" ||
      normalized === "site_top"
    ) {
      return "top";
    }

    if (
      normalized === "under_nav" ||
      normalized === "under_logo" ||
      normalized === "below_nav" ||
      normalized === "below_logo"
    ) {
      return "under_nav";
    }

    if (
      normalized === "inside_hero" ||
      normalized === "hero" ||
      normalized === "in_hero"
    ) {
      return "inside_hero";
    }

    if (
      normalized === "hidden" ||
      normalized === "off" ||
      normalized === "none"
    ) {
      return "hidden";
    }

    return "under_nav";
  }

  function normalizeAnnouncementAnimation(
    value: string
  ): AnnouncementAnimation {
    const normalized = value.toLowerCase().trim();

    if (
      normalized === "marquee" ||
      normalized === "moving" ||
      normalized === "move"
    ) {
      return "marquee";
    }

    return "fixed";
  }

  const publicSettings = useMemo(() => {
    const agencyName = getSetting(
      ["agency_name_ar", "agency_name", "site_name", "brand_name"],
      "وكالة حمزة"
    );

    const englishName = getSetting(
      ["site_name", "site_name_en", "english_name", "company_name"],
      "HAMZA AGENCY"
    );

    const whatsapp = getSetting(
      ["primary_whatsapp", "whatsapp", "support_whatsapp"],
      "+905011730377"
    );

    const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");

    return {
      agencyName,
      englishName,
      whatsapp,
      cleanWhatsapp,
      primaryColor: getSetting(["primary_color"], "#7c3aed"),
      secondaryColor: getSetting(["secondary_color"], "#d4af37"),

      heroTitle: getSetting(
        ["home_hero_title", "hero_title"],
        "وكالة حمزة لإدارة وتطوير"
      ),
      heroHighlight: getSetting(
        ["home_hero_highlight", "hero_highlight"],
        "صناع المحتوى"
      ),
      heroDescription: getSetting(
        ["home_hero_description", "hero_description", "site_description"],
        "نساعد صناع المحتوى على النمو وتحقيق الأرباح على منصات البث المباشر والتواصل الاجتماعي من خلال إدارة احترافية، دعم يومي، وفرص حقيقية للتطور."
      ),
      heroBadge: getSetting(
        ["home_hero_badge", "hero_badge"],
        "وكالة عالمية محترفة لإدارة صناع المحتوى"
      ),

      announcementPosition: normalizeAnnouncementPosition(
        getSetting(
          ["announcement_bar_position", "announcement_position"],
          "under_nav"
        )
      ),
      announcementAnimation: normalizeAnnouncementAnimation(
        getSetting(
          ["announcement_bar_animation", "announcement_animation"],
          "marquee"
        )
      ),
      announcementSpeed: Number(
        getSetting(["announcement_bar_speed", "announcement_speed"], "22")
      ),

      footerText: getSetting(
        ["footer_text"],
        "© 2026 HAMZA AGENCY | وكالة حمزة. All Rights Reserved."
      ),
    };
  }, [settings]);

  const logoMedia = getMediaByPurpose({
    category: "logo",
    nameIncludes: "logo",
  });

  const homeBackgroundMedia =
    getMediaByPurpose({
      pageSlug: "home",
      category: "background",
      fileType: "background_video",
    }) ||
    getMediaByPurpose({
      pageSlug: "home",
      category: "background",
      fileType: "video",
    }) ||
    getMediaByPurpose({
      pageSlug: "home",
      category: "background",
      fileType: "image",
    }) ||
    getMediaByPurpose({
      pageSlug: "home",
      category: "background",
    });

  const logoUrl = getUsableImageUrl(
    logoMedia,
    "/Logo%20hamza%20agency.jpg"
  );

  const activePrograms = programs.length ? programs : fallbackPrograms;
  const activeAnnouncement = announcements[0] || null;

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!form.fullName || !form.country || !form.whatsapp || !form.platform) {
      setMessage("يرجى تعبئة الحقول الأساسية.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("الاتصال بقاعدة البيانات غير مفعل حالياً.");
      return;
    }

    const duplicateKey = `hamza-agency-${form.whatsapp}-${form.platform}`;

    if (localStorage.getItem(duplicateKey)) {
      setMessage("تم إرسال طلب سابق بنفس رقم الواتساب والمنصة.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("agency_applications").insert({
      full_name: form.fullName.trim(),
      country: form.country.trim(),
      whatsapp: form.whatsapp.trim(),
      platform: form.platform,
      previous_experience: form.previousExperience.trim(),
      notes: form.notes.trim(),
      status: "new",
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Supabase insert error:", error);
      setMessage("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
      return;
    }

    localStorage.setItem(duplicateKey, "true");

    setMessage(
      "تم استلام طلبك بنجاح. سيقوم فريق الوكالة بمراجعة الطلب وقد يتم التواصل معك عبر واتساب."
    );

    setForm({
      fullName: "",
      country: "",
      whatsapp: "",
      platform: activePrograms[0]?.name || "TikTok",
      previousExperience: "",
      notes: "",
    });

    setTimeout(() => {
      setMessage("");
      setShowJoinForm(false);
    }, 3500);
  };

  if (showSplash) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="absolute h-72 w-72 rounded-full bg-purple-700/30 blur-3xl" />
        <div className="absolute h-96 w-96 animate-pulse rounded-full border border-purple-500/20" />

        <img
          src={logoUrl}
          alt={publicSettings.englishName}
          className="relative h-36 w-36 rounded-3xl object-cover shadow-[0_0_90px_rgba(168,85,247,0.7)]"
        />
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
      style={
        {
          "--primary": publicSettings.primaryColor,
          "--secondary": publicSettings.secondaryColor,
        } as CSSProperties
      }
    >
      <SiteAnimationStyles />

      <PublicBackground media={homeBackgroundMedia} />

      {publicSettings.announcementPosition === "top" && activeAnnouncement && (
        <AnnouncementBar
          announcement={activeAnnouncement}
          animation={publicSettings.announcementAnimation}
          speed={publicSettings.announcementSpeed}
        />
      )}

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-6">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt={publicSettings.englishName}
            className="h-12 w-12 rounded-xl object-cover shadow-[0_0_25px_rgba(168,85,247,0.45)]"
          />

          <div>
            <div className="text-sm font-bold">{publicSettings.englishName}</div>
            <div className="text-xs text-yellow-200/80">
              {publicSettings.agencyName}
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {mainNavigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/70 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          href="/admin"
          className="hidden rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-2 text-sm font-black text-yellow-100 backdrop-blur transition hover:bg-yellow-500/20 md:inline-flex"
        >
          الإدارة
        </Link>
      </nav>

      <div className="relative z-20 mx-auto mb-4 max-w-7xl px-5 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mainNavigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/75 backdrop-blur"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {publicSettings.announcementPosition === "under_nav" &&
        activeAnnouncement && (
          <div className="relative z-20 mx-auto max-w-7xl px-5">
            <AnnouncementBar
              announcement={activeAnnouncement}
              animation={publicSettings.announcementAnimation}
              speed={publicSettings.announcementSpeed}
              rounded
            />
          </div>
        )}

      <section className="relative z-20 mx-auto max-w-7xl px-5 pb-20 pt-10 text-center">
        <HeroVideoVisual />

        {publicSettings.announcementPosition === "inside_hero" &&
          activeAnnouncement && (
            <div className="relative z-20 mx-auto mb-8 max-w-4xl">
              <AnnouncementBar
                announcement={activeAnnouncement}
                animation={publicSettings.announcementAnimation}
                speed={publicSettings.announcementSpeed}
                rounded
              />
            </div>
          )}

        <div className="relative z-20">
          <img
            src={logoUrl}
            alt={`${publicSettings.englishName} Logo`}
            className="mx-auto mb-8 h-44 w-44 rounded-[2rem] object-cover shadow-[0_0_95px_rgba(168,85,247,0.65)]"
          />

          <div className="mx-auto mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm text-purple-100 backdrop-blur">
            {publicSettings.heroBadge}
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            {homepageContent?.title || publicSettings.heroTitle}
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              {publicSettings.heroHighlight}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/80 md:text-2xl">
            {homepageContent?.content || publicSettings.heroDescription}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => setShowJoinForm(true)}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-9 py-4 text-lg font-bold shadow-[0_0_40px_rgba(168,85,247,0.45)] transition hover:scale-[1.03]"
            >
              انضم الآن
            </button>

            <Link
              href="/programs"
              className="rounded-full border border-white/15 bg-white/[0.05] px-9 py-4 text-lg font-bold text-white/80 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10"
            >
              عرض البرامج
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto grid max-w-6xl grid-cols-2 gap-5 px-5 pb-20 lg:grid-cols-4">
        {fallbackStats.map(([number, label]) => (
          <div
            key={label}
            className="rounded-3xl border border-white/10 bg-white/[0.05] p-7 text-center backdrop-blur"
          >
            <div className="bg-gradient-to-r from-purple-300 to-yellow-300 bg-clip-text text-4xl font-black text-transparent">
              {number}
            </div>
            <div className="mt-3 text-white/75">{label}</div>
          </div>
        ))}
      </section>

      <section className="relative z-20 mx-auto max-w-7xl px-5 pb-24">
        <h2 className="text-center text-4xl font-black">
          البرامج المتاحة حالياً
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-center text-white/60">
          اختر البرنامج المناسب لك لعرض التفاصيل الكاملة، الشروط، نظام العمل،
          وما تقدمه وكالة حمزة.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {activePrograms.map((program) => (
            <Link
              key={program.id}
              href={program.slug ? `/programs/${program.slug}` : "/programs"}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur transition hover:border-purple-400/60 hover:bg-purple-500/10"
            >
              <div className="mb-3 inline-flex rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-200">
                {program.status === "limited"
                  ? "قبول محدود"
                  : program.status === "paused"
                    ? "متوقف مؤقتاً"
                    : "متاح الآن"}
              </div>

              <div className="text-2xl font-black">{program.name}</div>

              <div className="mt-3 text-sm leading-7 text-white/60">
                {program.short_description || "عرض تفاصيل البرنامج"}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/programs"
            className="inline-flex rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black shadow-[0_0_35px_rgba(168,85,247,0.22)]"
          >
            عرض كل البرامج
          </Link>
        </div>
      </section>

      <section className="relative z-20 mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-8 backdrop-blur">
          <h2 className="text-3xl font-black">لماذا وكالة حمزة؟</h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {whyUsItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/25 p-5"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link
              href="/about"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center font-bold text-white/75 transition hover:border-purple-400/50"
            >
              تعرف علينا
            </Link>

            <Link
              href="/services"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center font-bold text-white/75 transition hover:border-purple-400/50"
            >
              خدمات الوكالة
            </Link>

            <Link
              href="/contact"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center font-bold text-white/75 transition hover:border-purple-400/50"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </section>

      {showJoinForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur">
          <div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6 shadow-[0_0_80px_rgba(168,85,247,0.25)]">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setMessage("");
                  setShowJoinForm(false);
                }}
                className="rounded-full border border-white/15 px-5 py-2 text-white/70"
              >
                إغلاق
              </button>

              <h2 className="text-3xl font-black">طلب الانضمام للوكالة</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="الاسم الثلاثي"
                className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              />

              <input
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="الدولة"
                className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              />

              <input
                value={form.whatsapp}
                onChange={(e) => updateField("whatsapp", e.target.value)}
                placeholder="رقم واتساب"
                className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              />

              <select
                value={form.platform}
                onChange={(e) => updateField("platform", e.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              >
                {activePrograms.map((program) => (
                  <option key={program.id} value={program.name || ""}>
                    {program.name}
                  </option>
                ))}
              </select>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <h3 className="mb-3 text-2xl font-black">خبرات سابقة</h3>

                <p className="mb-4 text-lg text-purple-200">
                  هل عملت على برامج أو وكالات أخرى سابقاً؟
                </p>

                <textarea
                  value={form.previousExperience}
                  onChange={(e) =>
                    updateField("previousExperience", e.target.value)
                  }
                  placeholder="اكتب خبراتك السابقة إن وجدت"
                  className="min-h-40 w-full resize-none bg-transparent text-xl outline-none"
                />
              </div>

              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="ملاحظات إضافية"
                className="min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              />

              {message && (
                <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-center text-xl font-bold text-yellow-100">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black disabled:opacity-60"
              >
                {isSubmitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
              </button>
            </form>
          </div>
        </div>
      )}

      <a
        href={`https://wa.me/${publicSettings.cleanWhatsapp}`}
        target="_blank"
        className="fixed bottom-5 left-5 z-30 rounded-full bg-green-500 px-5 py-4 text-sm font-black text-white shadow-2xl"
      >
        واتساب
      </a>

      <footer className="relative z-20 border-t border-white/10 bg-black/25 px-5 py-10 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={logoUrl}
                alt={publicSettings.englishName}
                className="h-12 w-12 rounded-xl object-cover"
              />

              <div>
                <div className="font-black">{publicSettings.englishName}</div>
                <div className="text-sm text-yellow-200/75">
                  {publicSettings.agencyName}
                </div>
              </div>
            </div>

            <p className="mt-5 leading-8 text-white/55">
              منصة وكالة احترافية لإدارة وتوظيف ودعم صناع المحتوى على منصات
              البث المباشر والتواصل الاجتماعي.
            </p>
          </div>

          <div>
            <h3 className="font-black text-white">روابط الموقع</h3>

            <div className="mt-4 grid gap-3 text-white/60">
              {mainNavigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-purple-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-black text-white">الصفحات القانونية</h3>

            <div className="mt-4 grid gap-3 text-white/60">
              {footerLegalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-yellow-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-black text-white">التواصل</h3>

            <p className="mt-4 text-white/60">{publicSettings.whatsapp}</p>

            <a
              href={`https://wa.me/${publicSettings.cleanWhatsapp}`}
              target="_blank"
              className="mt-5 inline-flex rounded-full bg-green-500 px-6 py-3 font-black text-white"
            >
              فتح واتساب
            </a>

            <Link
              href="/admin"
              className="mt-4 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-6 py-3 font-black text-yellow-100"
            >
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-center text-sm text-white/45">
          {publicSettings.footerText}
        </div>
      </footer>
    </main>
  );
}

function AnnouncementBar({
  announcement,
  animation,
  speed,
  rounded = false,
}: {
  announcement: Announcement;
  animation: AnnouncementAnimation;
  speed: number;
  rounded?: boolean;
}) {
  const text = `${announcement.title || ""} — ${announcement.content || ""}`;

  if (!text.trim()) return null;

  return (
    <div
      className={`overflow-hidden border border-yellow-400/20 bg-yellow-400/10 text-yellow-100 shadow-[0_0_35px_rgba(212,175,55,0.12)] backdrop-blur ${
        rounded ? "rounded-2xl" : "border-x-0"
      }`}
    >
      {animation === "marquee" ? (
        <div
          className="hamza-marquee-track flex w-max whitespace-nowrap py-3 text-sm font-bold md:text-base"
          style={
            {
              "--marquee-duration": `${speed || 22}s`,
            } as CSSProperties
          }
        >
          <span className="mx-8">{text}</span>
          <span className="mx-8">{text}</span>
          <span className="mx-8">{text}</span>
          <span className="mx-8">{text}</span>
        </div>
      ) : (
        <div className="px-4 py-3 text-center text-sm font-bold md:text-base">
          <span className="text-yellow-200">{announcement.title}</span>
          <span className="mx-2 text-white/40">—</span>
          <span>{announcement.content}</span>
        </div>
      )}
    </div>
  );
}

function PublicBackground({ media }: { media: MediaItem | undefined }) {
  const url = media?.file_url || "";
  const fileType = media?.file_type || "";
  const isUsableUrl = url.startsWith("http") || url.startsWith("/");

  const isVideo =
    fileType === "video" ||
    fileType === "background_video" ||
    /\.(mp4|webm|ogg)$/i.test(url);

  const isImage =
    fileType === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  if (isUsableUrl && isVideo) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <video
          className="h-full w-full object-cover opacity-38"
          src={url}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-[#070009]/72" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_45%)]" />
      </div>
    );
  }

  if (isUsableUrl && isImage) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: `url("${url}")` }}
        />
        <div className="absolute inset-0 bg-[#070009]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_45%)]" />
      </div>
    );
  }

  return <GeneratedBackground variant={url || "generated://luxury-purple-neon"} />;
}

function GeneratedBackground({ variant }: { variant: string }) {
  const normalized = variant.replace("generated://", "");

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.38)_0%,rgba(76,29,149,0.16)_30%,rgba(7,0,9,0.96)_72%)]" />

      <div className="hamza-aurora-one absolute -left-24 top-10 h-80 w-80 rounded-full bg-purple-600/22 blur-3xl md:h-[460px] md:w-[460px]" />
      <div className="hamza-aurora-two hidden absolute -right-32 top-40 h-[480px] w-[480px] rounded-full bg-fuchsia-500/16 blur-3xl md:block" />

      <div className="hidden md:block absolute inset-0 opacity-12 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)] [background-size:42px_42px]" />

      {normalized.includes("programs") && (
        <>
          <div className="hidden md:block absolute left-[10%] top-[28%] h-24 w-24 rounded-3xl border border-purple-400/20 bg-purple-500/8 backdrop-blur" />
          <div className="hidden md:block absolute right-[12%] top-[42%] h-28 w-28 rounded-full border border-yellow-300/18 bg-yellow-400/8 backdrop-blur" />
        </>
      )}
    </div>
  );
}

function HeroVideoVisual() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto hidden h-[520px] max-w-6xl overflow-hidden opacity-70 md:block">
      <div className="hamza-hero-orbit absolute left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 rounded-full border border-purple-400/15" />
      <div className="absolute left-1/2 top-28 h-56 w-56 -translate-x-1/2 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="hamza-hero-beam absolute left-1/2 top-0 h-[520px] w-24 -translate-x-1/2 bg-gradient-to-b from-purple-400/0 via-purple-400/14 to-transparent blur-2xl" />
    </div>
  );
}

function SiteAnimationStyles() {
  return (
    <style>{`
      @keyframes hamzaMarquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(50%); }
      }

      .hamza-marquee-track {
        animation: hamzaMarquee var(--marquee-duration, 22s) linear infinite;
      }

      @keyframes hamzaAuroraOne {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.6; }
        50% { transform: translate3d(28px, 22px, 0) scale(1.05); opacity: 0.85; }
      }

      @keyframes hamzaAuroraTwo {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.35; }
        50% { transform: translate3d(-28px, 18px, 0) scale(1.04); opacity: 0.65; }
      }

      @keyframes hamzaHeroOrbit {
        0%, 100% { transform: translateX(-50%) scale(0.98); opacity: 0.2; }
        50% { transform: translateX(-50%) scale(1.04); opacity: 0.42; }
      }

      @keyframes hamzaHeroBeam {
        0%, 100% { opacity: 0.16; transform: translateX(-50%) scaleY(0.95); }
        50% { opacity: 0.45; transform: translateX(-50%) scaleY(1.05); }
      }

      .hamza-aurora-one { animation: hamzaAuroraOne 18s ease-in-out infinite; }
      .hamza-aurora-two { animation: hamzaAuroraTwo 22s ease-in-out infinite; }
      .hamza-hero-orbit { animation: hamzaHeroOrbit 18s ease-in-out infinite; }
      .hamza-hero-beam { animation: hamzaHeroBeam 10s ease-in-out infinite; }

      @media (max-width: 768px) {
        .hamza-aurora-one,
        .hamza-aurora-two,
        .hamza-hero-orbit,
        .hamza-hero-beam {
          animation: none !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .hamza-marquee-track,
        .hamza-aurora-one,
        .hamza-aurora-two,
        .hamza-hero-orbit,
        .hamza-hero-beam {
          animation: none !important;
        }
      }
    `}</style>
  );
}
