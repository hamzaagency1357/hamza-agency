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

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
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
        </div>
      </nav>

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

      <footer className="relative z-20 border-t border-white/10 px-5 py-8 text-center text-white/50">
        {publicSettings.footerText}
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
          className="h-full w-full object-cover opacity-50"
          src={url}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-[#070009]/65" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.35),transparent_45%)]" />
      </div>
    );
  }

  if (isUsableUrl && isImage) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: `url("${url}")` }}
        />
        <div className="absolute inset-0 bg-[#070009]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.35),transparent_45%)]" />
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

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.45)_0%,rgba(76,29,149,0.2)_28%,rgba(7,0,9,0.95)_72%)]" />

      <div className="hamza-aurora-one absolute -left-32 top-10 h-[520px] w-[520px] rounded-full bg-purple-600/35 blur-[90px]" />
      <div className="hamza-aurora-two absolute -right-40 top-40 h-[560px] w-[560px] rounded-full bg-fuchsia-500/25 blur-[100px]" />
      <div className="hamza-aurora-three absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-yellow-400/14 blur-[110px]" />

      <div className="hamza-wave absolute left-1/2 top-[18%] h-[520px] w-[900px] -translate-x-1/2 rounded-full border border-purple-400/25" />
      <div className="hamza-wave-two absolute left-1/2 top-[22%] h-[420px] w-[720px] -translate-x-1/2 rounded-full border border-yellow-300/15" />

      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.45)_1px,transparent_0)] [background-size:38px_38px]" />

      <div className="hamza-scan absolute inset-0 opacity-20 [background:linear-gradient(180deg,transparent,rgba(168,85,247,0.18),transparent)]" />

      <div className="hamza-particle hamza-particle-one absolute h-3 w-3 rounded-full bg-purple-300/80 shadow-[0_0_25px_rgba(216,180,254,0.9)]" />
      <div className="hamza-particle hamza-particle-two absolute h-2 w-2 rounded-full bg-yellow-200/80 shadow-[0_0_25px_rgba(254,240,138,0.9)]" />
      <div className="hamza-particle hamza-particle-three absolute h-3 w-3 rounded-full bg-fuchsia-300/75 shadow-[0_0_25px_rgba(240,171,252,0.9)]" />
      <div className="hamza-particle hamza-particle-four absolute h-2 w-2 rounded-full bg-cyan-200/65 shadow-[0_0_25px_rgba(165,243,252,0.75)]" />

      {normalized.includes("programs") && (
        <>
          <div className="hamza-floating-card absolute left-[10%] top-[28%] h-24 w-24 rounded-3xl border border-purple-400/30 bg-purple-500/10 backdrop-blur" />
          <div className="hamza-floating-card-two absolute right-[12%] top-[42%] h-28 w-28 rounded-full border border-yellow-300/25 bg-yellow-400/10 backdrop-blur" />
        </>
      )}
    </div>
  );
}

function HeroVideoVisual() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[520px] max-w-6xl overflow-hidden opacity-90">
      <div className="hamza-hero-orbit absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-purple-400/20" />
      <div className="hamza-hero-orbit-two absolute left-1/2 top-20 h-[300px] w-[300px] -translate-x-1/2 rounded-full border border-yellow-300/15" />
      <div className="absolute left-1/2 top-28 h-56 w-56 -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
      <div className="hamza-hero-beam absolute left-1/2 top-0 h-[520px] w-24 -translate-x-1/2 bg-gradient-to-b from-purple-400/0 via-purple-400/20 to-transparent blur-2xl" />
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
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
        50% { transform: translate(95px, 65px) scale(1.22); opacity: 0.9; }
      }

      @keyframes hamzaAuroraTwo {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
        50% { transform: translate(-105px, 45px) scale(1.18); opacity: 0.85; }
      }

      @keyframes hamzaAuroraThree {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
        50% { transform: translate(40px, -90px) scale(1.2); opacity: 0.7; }
      }

      @keyframes hamzaWave {
        0% { transform: translateX(-50%) rotate(0deg) scale(0.95); opacity: 0.15; }
        50% { transform: translateX(-50%) rotate(180deg) scale(1.12); opacity: 0.45; }
        100% { transform: translateX(-50%) rotate(360deg) scale(0.95); opacity: 0.15; }
      }

      @keyframes hamzaScan {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }

      @keyframes hamzaParticle {
        0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.25; }
        35% { opacity: 1; }
        100% { transform: translate3d(var(--x), var(--y), 0) scale(0.7); opacity: 0.15; }
      }

      @keyframes hamzaFloatCard {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-35px) rotate(8deg); }
      }

      @keyframes hamzaHeroOrbit {
        0% { transform: translateX(-50%) rotate(0deg) scale(1); opacity: 0.25; }
        50% { transform: translateX(-50%) rotate(180deg) scale(1.06); opacity: 0.55; }
        100% { transform: translateX(-50%) rotate(360deg) scale(1); opacity: 0.25; }
      }

      @keyframes hamzaHeroBeam {
        0%, 100% { opacity: 0.2; transform: translateX(-50%) scaleY(0.9); }
        50% { opacity: 0.7; transform: translateX(-50%) scaleY(1.12); }
      }

      .hamza-aurora-one { animation: hamzaAuroraOne 10s ease-in-out infinite; }
      .hamza-aurora-two { animation: hamzaAuroraTwo 13s ease-in-out infinite; }
      .hamza-aurora-three { animation: hamzaAuroraThree 16s ease-in-out infinite; }

      .hamza-wave { animation: hamzaWave 22s linear infinite; }
      .hamza-wave-two { animation: hamzaWave 28s linear infinite reverse; }

      .hamza-scan { animation: hamzaScan 9s linear infinite; }

      .hamza-particle { animation: hamzaParticle 9s ease-in-out infinite; }
      .hamza-particle-one { left: 18%; top: 22%; --x: 260px; --y: 180px; }
      .hamza-particle-two { right: 16%; top: 32%; --x: -280px; --y: 220px; animation-delay: -2s; }
      .hamza-particle-three { left: 40%; bottom: 18%; --x: 180px; --y: -260px; animation-delay: -4s; }
      .hamza-particle-four { right: 38%; bottom: 24%; --x: -220px; --y: -200px; animation-delay: -6s; }

      .hamza-floating-card { animation: hamzaFloatCard 10s ease-in-out infinite; }
      .hamza-floating-card-two { animation: hamzaFloatCard 13s ease-in-out infinite reverse; }

      .hamza-hero-orbit { animation: hamzaHeroOrbit 18s linear infinite; }
      .hamza-hero-orbit-two { animation: hamzaHeroOrbit 24s linear infinite reverse; }
      .hamza-hero-beam { animation: hamzaHeroBeam 6s ease-in-out infinite; }
    `}</style>
  );
}
