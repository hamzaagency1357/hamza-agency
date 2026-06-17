"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type PageRow = {
  id: number;
  title: string | null;
  slug: string | null;
  is_published: boolean | null;
  sort_order: number | null;
};

type SectionSettings = Record<string, unknown>;

type SectionRow = {
  id: number;
  page_id: number | null;
  section_key: string | null;
  section_type: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  settings: SectionSettings | null;
  created_at: string | null;
  updated_at: string | null;
};

type SectionForm = {
  page_id: string;
  section_key: string;
  section_type: string;
  title: string;
  subtitle: string;
  content: string;
  sort_order: string;
  is_visible: boolean;
  settings: string;
};

type JsonParseResult =
  | { ok: true; data: SectionSettings }
  | { ok: false; message: string };

const sectionTypes = [
  { value: "hero", label: "Hero" },
  { value: "content", label: "Content" },
  { value: "text", label: "Text" },
  { value: "cards", label: "Cards" },
  { value: "features", label: "Features" },
  { value: "stats", label: "Stats" },
  { value: "steps", label: "Steps" },
  { value: "cta", label: "CTA" },
  { value: "faq", label: "FAQ" },
  { value: "media", label: "Media" },
  { value: "custom", label: "Custom" },
];

const settingsExamples: Record<string, string> = {
  hero: JSON.stringify(
    {
      eyebrow: "HAMZA AGENCY",
      buttonText: "انضم الآن",
      buttonUrl: "/apply",
      backgroundMediaUrl: "",
    },
    null,
    2
  ),
  cta: JSON.stringify(
    {
      buttonText: "تواصل عبر واتساب",
      buttonUrl: "https://wa.me/",
      variant: "primary",
    },
    null,
    2
  ),
  media: JSON.stringify(
    {
      imageUrl: "",
      alt: "HAMZA AGENCY",
      caption: "",
    },
    null,
    2
  ),
  cards: JSON.stringify(
    {
      cards: [
        { title: "الميزة الأولى", text: "شرح مختصر" },
        { title: "الميزة الثانية", text: "شرح مختصر" },
      ],
    },
    null,
    2
  ),
  faq: JSON.stringify(
    {
      items: [
        { question: "السؤال الأول؟", answer: "الإجابة المختصرة." },
        { question: "السؤال الثاني؟", answer: "الإجابة المختصرة." },
      ],
    },
    null,
    2
  ),
  default: "{}",
};

function createEmptyForm(pageId = "", sortOrder = "1"): SectionForm {
  return {
    page_id: pageId,
    section_key: "",
    section_type: "content",
    title: "",
    subtitle: "",
    content: "",
    sort_order: sortOrder,
    is_visible: true,
    settings: "{}",
  };
}

function normalizeSectionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/[-_]{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function isSafeSectionKey(value: string) {
  return /^[a-z0-9][a-z0-9_-]{0,119}$/.test(value);
}

function normalizeSectionType(value: string) {
  const normalized = normalizeSectionKey(value);
  return normalized || "content";
}

function parseSettingsJson(value: string): JsonParseResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: true, data: {} };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      return {
        ok: false,
        message: "حقل settings يجب أن يكون JSON Object مثل {} وليس نصاً أو رقماً أو قائمة.",
      };
    }

    return { ok: true, data: parsed as SectionSettings };
  } catch {
    return {
      ok: false,
      message: "حقل settings يحتوي JSON غير صحيح. صحح الأقواس أو الفواصل ثم أعد الحفظ.",
    };
  }
}

function formatSettings(value: SectionSettings | null) {
  if (!value) return "{}";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function formatDate(value: string | null) {
  if (!value) return "غير متوفر";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPublicPath(slug: string | null) {
  if (!slug || slug === "home" || slug === "homepage") return "/";
  return `/${slug}`;
}

function getPageLabel(page: PageRow | null) {
  if (!page) return "اختر صفحة";
  return `${page.title || "بدون عنوان"} — ${getPublicPath(page.slug)}`;
}

function getSettingsExample(sectionType: string) {
  return settingsExamples[sectionType] || settingsExamples.default;
}

export default function AdminPublishedSectionsPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [pages, setPages] = useState<PageRow[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [editingSection, setEditingSection] = useState<SectionRow | null>(null);
  const [form, setForm] = useState<SectionForm>(createEmptyForm());

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("pages");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadPages();
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || !selectedPageId) return;
    loadSections(Number(selectedPageId));
  }, [isAuthorized, selectedPageId]);

  const selectedPage = useMemo(
    () => pages.find((page) => String(page.id) === selectedPageId) || null,
    [pages, selectedPageId]
  );

  const filteredSections = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sections.filter((section) => {
      const sectionText = `${section.section_key || ""} ${section.section_type || ""} ${section.title || ""} ${
        section.subtitle || ""
      } ${section.content || ""}`.toLowerCase();

      return !normalizedSearch || sectionText.includes(normalizedSearch);
    });
  }, [sections, search]);

  const nextSortOrder = useMemo(() => {
    const maxSortOrder = sections.reduce((max, section) => {
      const value = Number(section.sort_order || 0);
      return Number.isFinite(value) && value > max ? value : max;
    }, 0);

    return String(maxSortOrder + 1);
  }, [sections]);

  const stats = useMemo(() => {
    const visible = sections.filter((section) => section.is_visible !== false).length;
    const hidden = sections.filter((section) => section.is_visible === false).length;

    return {
      total: sections.length,
      visible,
      hidden,
      pages: pages.length,
    };
  }, [sections, pages]);

  const normalizedKeyPreview = useMemo(() => normalizeSectionKey(form.section_key), [form.section_key]);
  const settingsValidation = useMemo(() => parseSettingsJson(form.settings), [form.settings]);
  const isSectionKeyReady = Boolean(normalizedKeyPreview && isSafeSectionKey(normalizedKeyPreview));
  const isEditingKeyChanged = Boolean(
    editingSection && normalizedKeyPreview && normalizedKeyPreview !== (editingSection.section_key || "")
  );

  async function loadPages() {
    if (!isSupabaseConfigured || !supabase) {
      showError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setIsLoadingPages(true);
    setError("");

    const { data, error: pagesError } = await supabase
      .from("pages")
      .select("id, title, slug, is_published, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    setIsLoadingPages(false);

    if (pagesError) {
      showError("تعذر تحميل الصفحات. تحقق من صلاحيات جدول pages.");
      return;
    }

    const loadedPages = (data || []) as PageRow[];
    setPages(loadedPages);

    if (!loadedPages.length) {
      setSelectedPageId("");
      setSections([]);
      setForm(createEmptyForm());
      showError("لا توجد صفحات في جدول pages. أنشئ الصفحات الأساسية أولاً من إدارة الصفحات.");
      return;
    }

    const currentPage = loadedPages.find((page) => String(page.id) === selectedPageId);
    const nextPage = currentPage || loadedPages[0];
    const nextPageId = String(nextPage.id);

    setSelectedPageId(nextPageId);
    setForm((current) => ({
      ...current,
      page_id: current.page_id || nextPageId,
    }));
  }

  async function loadSections(pageId: number) {
    if (!isSupabaseConfigured || !supabase) {
      showError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setIsLoadingSections(true);
    setError("");

    const { data, error: sectionsError } = await supabase
      .from("sections")
      .select(
        "id, page_id, section_key, section_type, title, subtitle, content, sort_order, is_visible, settings, created_at, updated_at"
      )
      .eq("page_id", pageId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    setIsLoadingSections(false);

    if (sectionsError) {
      setSections([]);
      showError("تعذر تحميل أقسام الصفحة من جدول sections. إذا ظهرت هذه المشكلة أثناء الاختبار نراجع SQL في خطوة مستقلة.");
      return;
    }

    const loadedSections = (data || []) as SectionRow[];
    setSections(loadedSections);

    if (!editingSection) {
      const maxSortOrder = loadedSections.reduce((max, section) => {
        const value = Number(section.sort_order || 0);
        return Number.isFinite(value) && value > max ? value : max;
      }, 0);

      setForm(createEmptyForm(String(pageId), String(maxSortOrder + 1)));
    }
  }

  function showSuccess(text: string) {
    setError("");
    setMessage(text);
  }

  function showError(text: string) {
    setMessage("");
    setError(text);
  }

  function updateField(key: keyof SectionForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function selectPage(pageId: string) {
    setSelectedPageId(pageId);
    setEditingSection(null);
    setSections([]);
    setMessage("");
    setError("");
    setForm(createEmptyForm(pageId));
  }

  function startNewSection() {
    if (!selectedPageId) {
      showError("اختر صفحة قبل إضافة قسم جديد.");
      return;
    }

    setEditingSection(null);
    setMessage("");
    setError("");
    setForm(createEmptyForm(selectedPageId, nextSortOrder));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editSection(section: SectionRow) {
    const pageId = section.page_id ? String(section.page_id) : selectedPageId;

    setEditingSection(section);
    setMessage(`أنت الآن تعدّل القسم: ${section.title || section.section_key || "بدون عنوان"}`);
    setError("");
    setForm({
      page_id: pageId,
      section_key: section.section_key || "",
      section_type: section.section_type || "content",
      title: section.title || "",
      subtitle: section.subtitle || "",
      content: section.content || "",
      sort_order: String(section.sort_order || 1),
      is_visible: section.is_visible !== false,
      settings: formatSettings(section.settings),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applySettingsExample() {
    setForm((current) => ({
      ...current,
      settings: getSettingsExample(current.section_type),
    }));
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      showError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setMessage("");
    setError("");

    const pageId = Number(form.page_id || selectedPageId);
    const sectionKey = normalizeSectionKey(form.section_key);
    const sectionType = normalizeSectionType(form.section_type);
    const sortOrder = Number(form.sort_order);
    const settingsResult = parseSettingsJson(form.settings);

    if (!pageId || !pages.some((page) => page.id === pageId)) {
      showError("اختر صفحة صحيحة قبل حفظ القسم.");
      return;
    }

    if (!sectionKey || !isSafeSectionKey(sectionKey)) {
      showError("section_key مطلوب ويجب أن يكون آمناً بالإنجليزية، مثل: home-hero أو services_cta.");
      return;
    }

    if (!sectionType || !isSafeSectionKey(sectionType)) {
      showError("section_type مطلوب ويجب أن يكون آمناً، مثل: hero أو content أو cta.");
      return;
    }

    if (!form.title.trim()) {
      showError("يرجى كتابة عنوان القسم.");
      return;
    }

    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      showError("sort_order يجب أن يكون رقماً صحيحاً أكبر من أو يساوي صفر.");
      return;
    }

    if (!settingsResult.ok) {
      showError(settingsResult.message);
      return;
    }

    const duplicate = sections.find(
      (section) => section.section_key === sectionKey && section.id !== editingSection?.id
    );

    if (duplicate) {
      showError("يوجد قسم آخر بنفس section_key داخل هذه الصفحة. اختر مفتاحاً مختلفاً.");
      return;
    }

    setIsSaving(true);

    const payload = {
      page_id: pageId,
      section_key: sectionKey,
      section_type: sectionType,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      content: form.content.trim(),
      sort_order: Math.floor(sortOrder),
      is_visible: form.is_visible,
      settings: settingsResult.data,
      updated_at: new Date().toISOString(),
    };

    const result = editingSection
      ? await supabase.from("sections").update(payload).eq("id", editingSection.id)
      : await supabase.from("sections").insert(payload);

    setIsSaving(false);

    if (result.error) {
      showError("فشل حفظ القسم. تحقق من صلاحيات جدول sections. إذا كانت المشكلة SQL نوقف ونراجعها في خطوة مستقلة.");
      return;
    }

    await logActivity(
      editingSection ? "update_published_section" : "create_published_section",
      "sections",
      editingSection?.id ? String(editingSection.id) : sectionKey,
      editingSection ? JSON.stringify(editingSection) : "",
      JSON.stringify(payload)
    );

    setEditingSection(null);
    setForm(createEmptyForm(String(pageId)));
    showSuccess(editingSection ? "تم تحديث القسم المنشور بنجاح." : "تمت إضافة القسم المنشور بنجاح.");
    await loadSections(pageId);
  }

  async function toggleSectionVisibility(section: SectionRow) {
    if (!isSupabaseConfigured || !supabase) {
      showError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setMessage("");
    setError("");

    const nextValue = section.is_visible === false;
    const payload = {
      is_visible: nextValue,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from("sections").update(payload).eq("id", section.id);

    if (updateError) {
      showError("فشل تحديث حالة القسم. تحقق من صلاحيات جدول sections.");
      return;
    }

    await logActivity(
      "toggle_published_section_visibility",
      "sections",
      String(section.id),
      JSON.stringify(section),
      JSON.stringify(payload)
    );

    showSuccess(nextValue ? "تم إظهار القسم بنجاح." : "تم إخفاء القسم بنجاح بدون حذف.");
    await loadSections(section.page_id || Number(selectedPageId));
  }

  async function logActivity(
    action: string,
    entityType: string,
    entityId: string,
    oldData: string,
    newData: string
  ) {
    if (!isSupabaseConfigured || !supabase) return;

    await supabase.from("activity_logs").insert({
      admin_email: adminEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      ip_address: "",
    });
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white">
        <div className="rounded-[2rem] border border-purple-500/25 bg-black/45 p-8 text-center shadow-[0_0_80px_rgba(124,58,237,0.18)]">
          <div className="mb-3 text-sm font-black tracking-[0.25em] text-yellow-200">HAMZA AGENCY</div>
          <div className="text-2xl font-black">جاري التحقق من صلاحية إدارة الأقسام...</div>
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(135deg,rgba(212,175,55,0.07),transparent_30%,rgba(124,58,237,0.09)_70%,transparent)]" />

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-purple-500/20 bg-black/40 p-6 shadow-[0_0_80px_rgba(124,58,237,0.14)] backdrop-blur-xl md:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-4 py-2 text-sm font-bold text-purple-100">
                  16D — CMS Safety UX
                </span>
                <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100">
                  إدارة آمنة للأقسام المنشورة
                </span>
              </div>

              <h1 className="text-4xl font-black leading-tight md:text-5xl">إدارة الأقسام المنشورة</h1>
              <p className="mt-4 max-w-3xl leading-8 text-white/62">
                صفحة إدارة دائمة للأقسام التي يقرأها الموقع من جدول sections. تم تحسينها لتقليل أخطاء الإدخال، توضيح مفاتيح الأقسام، وفحص JSON قبل الحفظ.
              </p>
              <p className="mt-3 text-sm text-white/45">الأدمن: {adminEmail || "غير متوفر"}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <button
                type="button"
                onClick={loadPages}
                disabled={isLoadingPages || isLoadingSections}
                className="rounded-2xl border border-purple-300/25 bg-purple-500/10 px-5 py-3 font-black text-purple-100 transition hover:bg-purple-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingPages || isLoadingSections ? "جاري التحديث..." : "تحديث البيانات"}
              </button>
              <Link
                href="/admin/pages"
                className="rounded-2xl border border-yellow-400/25 bg-yellow-500/10 px-5 py-3 text-center font-bold text-yellow-100 transition hover:bg-yellow-500/15"
              >
                إدارة الصفحات
              </Link>
              <Link
                href="/admin"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center font-bold text-white/80 transition hover:bg-white/10"
              >
                لوحة التحكم
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-bold text-red-100 transition hover:bg-red-500/20"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          <SafetyNotice
            title="لا يوجد حذف نهائي"
            text="الإدارة هنا تسمح بالإضافة، التعديل، والإخفاء فقط. الحذف النهائي مؤجل حتى نظام سلة محذوفات كامل للأقسام."
          />
          <SafetyNotice
            title="section_key مفتاح حساس"
            text="لا تغيّر مفتاح قسم منشور إذا كانت الواجهة العامة تعتمد عليه. غيّر النصوص والمحتوى بدلاً منه."
          />
          <SafetyNotice
            title="settings كائن JSON فقط"
            text="استخدم {} أو كائناً منظماً للصور والأزرار والروابط. أي JSON خاطئ سيتم منعه قبل الحفظ."
          />
        </section>

        {(message || error) && (
          <section
            className={`mb-6 rounded-[2rem] border p-5 font-bold leading-8 ${
              error
                ? "border-red-400/30 bg-red-500/10 text-red-100"
                : "border-green-400/30 bg-green-500/10 text-green-100"
            }`}
          >
            {error || message}
          </section>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="صفحات CMS" value={stats.pages} />
          <StatCard label="أقسام هذه الصفحة" value={stats.total} />
          <StatCard label="أقسام ظاهرة" value={stats.visible} />
          <StatCard label="أقسام مخفية" value={stats.hidden} />
        </section>

        <section className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-black/35 p-5 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
          <label className="grid gap-2 text-sm font-black text-white/70">
            الصفحة المراد إدارة أقسامها
            <select
              value={selectedPageId}
              onChange={(event) => selectPage(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none"
            >
              {pages.length === 0 && <option value="">لا توجد صفحات</option>}
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {getPageLabel(page)} {page.is_published === false ? "— غير منشورة" : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4 text-sm leading-7 text-purple-50">
            <div className="font-black">الصفحة الحالية</div>
            <div className="mt-1 text-white/80">{getPageLabel(selectedPage)}</div>
            <div className="mt-1 text-white/50">الأقسام تعرض حسب sort_order من الأصغر إلى الأكبر.</div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <form onSubmit={saveSection} className="rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">{editingSection ? "تعديل قسم منشور" : "إضافة قسم منشور"}</h2>
                <p className="mt-2 text-sm leading-7 text-white/50">
                  الحقول التقنية محفوظة كما هي في قاعدة البيانات، لكن تمت إضافة فحص مباشر وملاحظات حتى لا يتم كسر الأقسام المنشورة بالخطأ.
                </p>
              </div>
              <button
                type="button"
                onClick={startNewSection}
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-bold text-white/80 transition hover:bg-white/10"
              >
                قسم جديد
              </button>
            </div>

            <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-7 text-cyan-50">
              <strong>طريقة العمل الآمنة:</strong> اختر الصفحة، اكتب مفتاحاً ثابتاً بالإنجليزية، اكتب النصوص، ثم احفظ. استخدم الإخفاء بدلاً من الحذف عندما تريد تعطيل قسم مؤقتاً.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-white/70">
                الصفحة المرتبطة — page_id
                <select
                  value={form.page_id}
                  onChange={(event) => updateField("page_id", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none"
                >
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {getPageLabel(page)}
                    </option>
                  ))}
                </select>
              </label>

              <AdminInput
                label="ترتيب الظهور — sort_order"
                value={form.sort_order}
                onChange={(value) => updateField("sort_order", value)}
                type="number"
                min="0"
                placeholder="1"
                help="الأصغر يظهر أولاً. استخدم 10، 20، 30 لتسهيل إدخال أقسام بينية لاحقاً."
              />

              <AdminInput
                label="مفتاح القسم — section_key"
                value={form.section_key}
                onChange={(value) => updateField("section_key", value)}
                placeholder="home-hero"
                dir="ltr"
                help="حروف إنجليزية صغيرة، أرقام، شرطة - أو underscore فقط. لا تستخدم مسافات أو رموز."
              />

              <label className="grid gap-2 text-sm font-black text-white/70">
                نوع القسم — section_type
                <select
                  value={form.section_type}
                  onChange={(event) => updateField("section_type", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none"
                >
                  {sectionTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label} — {item.value}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-6 text-white/40">اختر النوع الأقرب لطبيعة القسم حتى يسهل ربطه بالواجهة لاحقاً.</span>
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ValidationBox
                label="معاينة section_key بعد التنظيف"
                value={normalizedKeyPreview || "لم يتم إدخال مفتاح بعد"}
                ok={isSectionKeyReady}
                message={isSectionKeyReady ? "المفتاح آمن للحفظ." : "اكتب مفتاحاً آمناً قبل الحفظ."}
              />
              <ValidationBox
                label="حالة settings JSON"
                value={settingsValidation.ok ? "JSON صحيح" : "JSON غير صحيح"}
                ok={settingsValidation.ok}
                message={settingsValidation.ok ? "يمكن حفظ settings بأمان." : settingsValidation.message}
              />
            </div>

            {isEditingKeyChanged && (
              <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm font-bold leading-7 text-yellow-100">
                تنبيه: أنت تغيّر section_key لقسم موجود. لا تفعل ذلك إلا إذا كنت متأكداً أن الواجهة العامة لا تعتمد على المفتاح القديم.
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AdminInput
                label="العنوان الظاهر — title"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                placeholder="عنوان القسم"
                help="هذا النص هو العنوان الإداري/الظاهر للقسم."
              />

              <AdminInput
                label="الوصف الفرعي — subtitle"
                value={form.subtitle}
                onChange={(value) => updateField("subtitle", value)}
                placeholder="وصف قصير أو سطر فرعي"
                help="اختياري، ويمكن تركه فارغاً."
              />
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-black text-white/70">
                المحتوى الرئيسي — content
                <textarea
                  value={form.content}
                  onChange={(event) => updateField("content", event.target.value)}
                  rows={7}
                  className="resize-y rounded-2xl border border-white/10 bg-black/40 px-5 py-4 leading-8 text-white outline-none placeholder:text-white/25"
                  placeholder="اكتب محتوى القسم هنا..."
                />
                <span className="text-xs leading-6 text-white/40">استخدم هذا الحقل للنص الرئيسي. التفاصيل المركبة مثل الأزرار والصور مكانها settings.</span>
              </label>

              <label className="grid gap-2 text-sm font-black text-white/70">
                إعدادات متقدمة — settings JSON
                <textarea
                  value={form.settings}
                  onChange={(event) => updateField("settings", event.target.value)}
                  rows={8}
                  dir="ltr"
                  className="resize-y rounded-2xl border border-white/10 bg-black/40 px-5 py-4 font-mono text-sm leading-7 text-white outline-none placeholder:text-white/25"
                  placeholder={'{"buttonText":"انضم الآن","buttonUrl":"/apply"}'}
                />
              </label>

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="text-sm leading-7 text-white/55">
                  مثال مناسب لنوع القسم الحالي: <span className="font-bold text-white">{form.section_type}</span>. يمكن تطبيق المثال ثم تعديله حسب الحاجة.
                </div>
                <button
                  type="button"
                  onClick={applySettingsExample}
                  className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/15"
                >
                  تطبيق مثال settings
                </button>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-black text-white/75">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(event) => updateField("is_visible", event.target.checked)}
                  className="h-5 w-5 accent-purple-500"
                />
                إظهار القسم على الموقع عندما تقرأ الصفحة العامة من sections
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving || !selectedPageId}
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-yellow-500 px-6 py-4 font-black text-white shadow-[0_18px_40px_rgba(124,58,237,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "جارٍ الحفظ..." : editingSection ? "حفظ التعديل" : "إضافة القسم"}
              </button>
              <button
                type="button"
                onClick={startNewSection}
                className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-bold text-white/75 transition hover:bg-white/10"
              >
                إلغاء/تفريغ النموذج
              </button>
            </div>
          </form>

          <aside className="grid gap-4 rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-6">
            <div>
              <h2 className="text-2xl font-black">دليل سريع للأدمن</h2>
              <p className="mt-2 text-sm leading-7 text-white/50">هذه الملاحظات تمنع الأخطاء التي قد تكسر الربط لاحقاً عند تحويل الصفحات إلى No-Code كامل.</p>
            </div>
            <GuideItem title="section_key" text="ثبّته مرة واحدة ولا تغيّره بعد ربطه بالواجهة العامة. مثال: home-hero أو about-values." />
            <GuideItem title="section_type" text="استخدم نوعاً واضحاً: hero، content، cards، cta، faq. هذا يساعد مرحلة الربط العامة لاحقاً." />
            <GuideItem title="settings" text="مكان الأزرار، الروابط، الصور، الخلفيات، والقوائم المركبة. يجب أن يبقى JSON Object صحيحاً." />
            <GuideItem title="is_visible" text="استخدمه لإخفاء قسم مؤقتاً بدون حذف أو تخريب البيانات." />
          </aside>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">أقسام الصفحة المحددة</h2>
              <p className="mt-2 text-sm text-white/50">{getPageLabel(selectedPage)}</p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث داخل الأقسام..."
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-white/25 md:max-w-sm"
            />
          </div>

          {isLoadingSections ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-white/60">
              جاري تحميل الأقسام...
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-white/60">
              لا توجد أقسام مطابقة لهذه الصفحة حالياً.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSections.map((section) => (
                <article
                  key={section.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-purple-300/25"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <StatusBadge visible={section.is_visible !== false} />
                        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold text-white/60">
                          sort_order: {section.sort_order ?? 0}
                        </span>
                        <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-100">
                          {section.section_type || "content"}
                        </span>
                      </div>

                      <h3 className="break-words text-xl font-black text-white">{section.title || "بدون عنوان"}</h3>
                      <p className="mt-2 break-words text-sm text-yellow-100/80" dir="ltr">
                        {section.section_key || "no-key"}
                      </p>
                      {section.subtitle && <p className="mt-3 leading-7 text-white/55">{section.subtitle}</p>}
                      {section.content && <p className="mt-3 line-clamp-3 leading-7 text-white/45">{section.content}</p>}

                      <div className="mt-4 grid gap-2 text-xs text-white/35 md:grid-cols-2">
                        <div>Created: {formatDate(section.created_at)}</div>
                        <div>Updated: {formatDate(section.updated_at)}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <button
                        type="button"
                        onClick={() => editSection(section)}
                        className="rounded-2xl border border-purple-300/25 bg-purple-500/10 px-5 py-3 font-bold text-purple-100 transition hover:bg-purple-500/15"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSectionVisibility(section)}
                        className={`rounded-2xl border px-5 py-3 font-bold transition ${
                          section.is_visible === false
                            ? "border-green-400/25 bg-green-500/10 text-green-100 hover:bg-green-500/15"
                            : "border-yellow-400/25 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/15"
                        }`}
                      >
                        {section.is_visible === false ? "إظهار" : "إخفاء"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
      <div className="text-sm font-bold text-white/45">{label}</div>
      <div className="mt-2 text-4xl font-black text-white">{value}</div>
    </div>
  );
}

function AdminInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  dir,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  dir?: "ltr" | "rtl" | "auto";
  help?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-white/70">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        min={min}
        dir={dir}
        className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-white/25"
        placeholder={placeholder}
      />
      {help && <span className="text-xs leading-6 text-white/40">{help}</span>}
    </label>
  );
}

function StatusBadge({ visible }: { visible: boolean }) {
  return visible ? (
    <span className="rounded-full border border-green-400/25 bg-green-500/10 px-3 py-1 text-xs font-black text-green-100">
      ظاهر
    </span>
  ) : (
    <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-xs font-black text-red-100">
      مخفي
    </span>
  );
}

function SafetyNotice({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-5 leading-7 text-yellow-50">
      <div className="font-black">{title}</div>
      <p className="mt-2 text-sm text-yellow-50/75">{text}</p>
    </div>
  );
}

function ValidationBox({
  label,
  value,
  ok,
  message,
}: {
  label: string;
  value: string;
  ok: boolean;
  message: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm leading-7 ${
        ok ? "border-green-400/25 bg-green-500/10 text-green-100" : "border-yellow-400/25 bg-yellow-500/10 text-yellow-100"
      }`}
    >
      <div className="font-black">{label}</div>
      <div className="mt-1 break-words font-mono text-xs" dir="ltr">
        {value}
      </div>
      <div className="mt-2 text-xs opacity-80">{message}</div>
    </div>
  );
}

function GuideItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="font-black text-white">{title}</div>
      <p className="mt-2 text-sm leading-7 text-white/55">{text}</p>
    </div>
  );
}
