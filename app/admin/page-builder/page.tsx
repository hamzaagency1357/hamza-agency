"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SectionType = "hero" | "text" | "cards" | "cta" | "faq";
type PageStatus = "draft" | "review" | "ready";
type Tone = "purple" | "green" | "yellow" | "cyan" | "red";

type BuilderSection = {
  id: string;
  type: SectionType;
  title: string;
  body: string;
};

type BuilderDraft = {
  pageId: number | null;
  pageTitle: string;
  slug: string;
  status: PageStatus;
  language: string;
  seoTitle: string;
  seoDescription: string;
  sections: BuilderSection[];
};

type PageItem = {
  id: number;
  title: string | null;
  slug: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean | null;
  sort_order: number | null;
};

type PageBuilderSectionRow = {
  id: string;
  page_id: number;
  section_type: SectionType | string;
  section_key: string | null;
  title: string | null;
  body: string | null;
  sort_order: number | null;
  language: string | null;
  is_visible: boolean | null;
};

type PublishedSectionRow = {
  id: number;
  page_id: number | null;
  section_key: string | null;
  section_type: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  settings: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

const STORAGE_KEY = "hamza_page_builder_draft_v1";

const defaultDraft: BuilderDraft = {
  pageId: null,
  pageTitle: "صفحة جديدة",
  slug: "new-page",
  status: "draft",
  language: "ar",
  seoTitle: "",
  seoDescription: "",
  sections: [
    { id: "hero-1", type: "hero", title: "عنوان الصفحة", body: "وصف قصير يظهر في بداية الصفحة." },
    { id: "text-1", type: "text", title: "قسم نصي", body: "اكتب محتوى القسم هنا." },
  ],
};

const sectionTypes: { type: SectionType; label: string }[] = [
  { type: "hero", label: "Hero" },
  { type: "text", label: "Text Section" },
  { type: "cards", label: "Cards" },
  { type: "cta", label: "CTA" },
  { type: "faq", label: "FAQ" },
];

function normalizeDraft(value: Partial<BuilderDraft>): BuilderDraft {
  return {
    ...defaultDraft,
    ...value,
    pageId: typeof value.pageId === "number" ? value.pageId : defaultDraft.pageId,
    language: value.language === "en" || value.language === "tr" ? value.language : "ar",
    sections: Array.isArray(value.sections) && value.sections.length > 0 ? value.sections : defaultDraft.sections,
  };
}

function safeParse(value: string | null): BuilderDraft {
  if (!value) return defaultDraft;
  try {
    return normalizeDraft(JSON.parse(value) as Partial<BuilderDraft>);
  } catch {
    return defaultDraft;
  }
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

function createUniqueSectionKey(baseValue: string, fallback: string, usedKeys: Set<string>) {
  const fallbackKey = normalizeSectionKey(fallback) || "section";
  const baseKey = normalizeSectionKey(baseValue) || fallbackKey;
  let candidate = baseKey;
  let suffix = 2;

  while (usedKeys.has(candidate)) {
    candidate = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  usedKeys.add(candidate);
  return candidate;
}

function newSection(type: SectionType): BuilderSection {
  return {
    id: `${type}-${Date.now()}`,
    type,
    title: sectionTypes.find((item) => item.type === type)?.label || "Section",
    body: "اكتب محتوى هذا القسم هنا.",
  };
}

function pageToDraft(page: PageItem, current: BuilderDraft): BuilderDraft {
  return {
    ...current,
    pageId: page.id,
    pageTitle: page.title || "صفحة بدون عنوان",
    slug: page.slug || "",
    status: page.is_published === false ? "draft" : current.status === "review" ? "review" : "ready",
    seoTitle: page.seo_title || "",
    seoDescription: page.seo_description || "",
  };
}

function sectionRowsToDraftSections(rows: PageBuilderSectionRow[]): BuilderSection[] {
  if (!rows.length) return defaultDraft.sections;

  return rows.map((row, index) => {
    const sectionType = sectionTypes.some((item) => item.type === row.section_type)
      ? (row.section_type as SectionType)
      : "text";

    return {
      id: row.section_key || `${sectionType}-${row.id || index}`,
      type: sectionType,
      title: row.title || sectionTypes.find((item) => item.type === sectionType)?.label || "Section",
      body: row.body || "",
    };
  });
}

export default function AdminPageBuilderPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [pages, setPages] = useState<PageItem[]>([]);
  const [draft, setDraft] = useState<BuilderDraft>(defaultDraft);
  const [storageMode, setStorageMode] = useState("احتياطي محلي");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("pages");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }

      const email = access.profile.email || access.user?.email || "";
      const localDraft = safeParse(window.localStorage.getItem(STORAGE_KEY));

      setAdminEmail(email);
      setDraft(localDraft);
      setIsAuthorized(true);
      setIsCheckingAuth(false);

      await loadPages(localDraft);
    }

    checkAccess();
  }, [router]);

  async function loadPages(baseDraft: BuilderDraft) {
    if (!isSupabaseConfigured || !supabase) {
      setStorageMode("احتياطي محلي — Supabase غير مهيأ");
      setError("تعذر تحميل الصفحات لأن Supabase غير مهيأ.");
      return;
    }

    setIsLoadingPages(true);
    setError("");

    const { data, error: pagesError } = await supabase
      .from("pages")
      .select("id, title, slug, content, seo_title, seo_description, is_published, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    setIsLoadingPages(false);

    if (pagesError) {
      setStorageMode("احتياطي محلي — تعذر قراءة pages");
      setError(`تعذر تحميل صفحات CMS: ${pagesError.message}`);
      return;
    }

    const loadedPages = (data || []) as PageItem[];
    setPages(loadedPages);

    if (!loadedPages.length) {
      setStorageMode("Supabase دائم — لا توجد صفحات CMS بعد");
      setError("لا توجد صفحات في جدول pages. أنشئ صفحة أولاً من /admin/pages ثم ارجع إلى Page Builder.");
      return;
    }

    const selectedPage = loadedPages.find((page) => page.id === baseDraft.pageId) || loadedPages[0];
    const nextDraft = pageToDraft(selectedPage, baseDraft);
    setDraft(nextDraft);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
    setStorageMode("Supabase دائم — اختر صفحة واحفظ أقسامها");
  }

  useEffect(() => {
    if (!isAuthorized || !draft.pageId) return;
    loadSections(draft.pageId, draft.language);
  }, [isAuthorized, draft.pageId, draft.language]);

  async function loadSections(pageId: number, language: string) {
    if (!isSupabaseConfigured || !supabase) return;

    setIsLoadingSections(true);
    setError("");

    const { data, error: sectionsError } = await supabase
      .from("page_builder_sections")
      .select("id, page_id, section_type, section_key, title, body, sort_order, language, is_visible")
      .eq("page_id", pageId)
      .eq("language", language)
      .order("sort_order", { ascending: true });

    setIsLoadingSections(false);

    if (sectionsError) {
      setStorageMode("احتياطي محلي — تعذر قراءة الأقسام");
      setError(`تعذر تحميل أقسام Page Builder من Supabase: ${sectionsError.message}`);
      return;
    }

    if (data && data.length > 0) {
      setDraft((current) => {
        const nextDraft = {
          ...current,
          sections: sectionRowsToDraftSections(data as PageBuilderSectionRow[]),
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
        return nextDraft;
      });
      setStorageMode("Supabase دائم");
    } else {
      setDraft((current) => {
        const nextDraft = {
          ...current,
          sections: defaultDraft.sections,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
        return nextDraft;
      });
      setStorageMode("Supabase دائم — لا توجد أقسام محفوظة لهذه الصفحة بعد");
    }
  }

  const completion = useMemo(() => {
    const required = [
      draft.pageTitle,
      draft.slug,
      draft.seoTitle,
      draft.seoDescription,
      ...draft.sections.map((section) => section.title + section.body),
    ];
    const done = required.filter((value) => value.trim()).length;
    return Math.round((done / Math.max(required.length, 1)) * 100);
  }, [draft]);

  function updateDraft(nextDraft: BuilderDraft) {
    setDraft(nextDraft);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
    setMessage("");
    setError("");
  }

  function updateSection(id: string, key: keyof BuilderSection, value: string) {
    updateDraft({
      ...draft,
      sections: draft.sections.map((section) => (section.id === id ? { ...section, [key]: value } : section)),
    });
  }

  function moveSection(id: string, direction: "up" | "down") {
    const sections = [...draft.sections];
    const index = sections.findIndex((section) => section.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) return;
    const [item] = sections.splice(index, 1);
    sections.splice(targetIndex, 0, item);
    updateDraft({ ...draft, sections });
  }

  function removeSection(id: string) {
    updateDraft({ ...draft, sections: draft.sections.filter((section) => section.id !== id) });
  }

  function addSection(type: SectionType) {
    updateDraft({ ...draft, sections: [...draft.sections, newSection(type)] });
  }

  function selectPage(pageId: number) {
    const selectedPage = pages.find((page) => page.id === pageId);
    if (!selectedPage) return;
    const nextDraft = pageToDraft(selectedPage, { ...draft, pageId });
    updateDraft(nextDraft);
  }

  async function saveDraft() {
    setMessage("");
    setError("");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    if (!isSupabaseConfigured || !supabase) {
      setStorageMode("احتياطي محلي — Supabase غير مهيأ");
      setMessage("تم حفظ نسخة احتياطية محلية فقط لأن Supabase غير مهيأ.");
      return;
    }

    if (!draft.pageId) {
      setError("اختر صفحة من صفحات CMS أولاً قبل حفظ الأقسام.");
      return;
    }

    setIsSaving(true);

    const deleteResult = await supabase
      .from("page_builder_sections")
      .delete()
      .eq("page_id", draft.pageId)
      .eq("language", draft.language);

    if (deleteResult.error) {
      setIsSaving(false);
      setStorageMode("احتياطي محلي — فشل تنظيف الأقسام القديمة");
      setError(`تعذر تحديث الأقسام القديمة: ${deleteResult.error.message}`);
      return;
    }

    if (draft.sections.length > 0) {
      const payload = draft.sections.map((section, index) => ({
        page_id: draft.pageId,
        section_type: section.type,
        section_key: section.id,
        title: section.title.trim(),
        body: section.body.trim(),
        sort_order: index + 1,
        language: draft.language,
        is_visible: true,
        created_by: adminEmail || null,
        updated_by: adminEmail || null,
      }));

      const insertResult = await supabase.from("page_builder_sections").insert(payload);

      if (insertResult.error) {
        setIsSaving(false);
        setStorageMode("احتياطي محلي — فشل حفظ Supabase");
        setError(`تم حفظ نسخة احتياطية محلية، لكن فشل حفظ الأقسام في Supabase: ${insertResult.error.message}`);
        return;
      }
    }

    setIsSaving(false);
    setStorageMode("Supabase دائم");
    setMessage("تم حفظ أقسام Page Builder في Supabase مع تحديث النسخة الاحتياطية المحلية. لم يتم نشر أي تغيير على الموقع العام بعد.");
  }

  async function publishDraftToSections() {
    setMessage("");
    setError("");

    if (!isSupabaseConfigured || !supabase) {
      setStorageMode("احتياطي محلي — Supabase غير مهيأ");
      setError("لا يمكن النشر لأن Supabase غير مهيأ.");
      return;
    }

    if (!draft.pageId) {
      setError("اختر صفحة من صفحات CMS قبل النشر إلى الأقسام المنشورة.");
      return;
    }

    if (!draft.sections.length) {
      setError("لا توجد أقسام في Page Builder لنشرها.");
      return;
    }

    const confirmed = window.confirm(
      "سيتم نشر أقسام Page Builder الحالية إلى جدول sections لهذه الصفحة.\n\nسيتم تحديث الأقسام المطابقة حسب section_key، وإضافة الأقسام الجديدة، وإخفاء الأقسام المنشورة القديمة غير الموجودة في المسودة بدون حذف نهائي.\n\nهل تريد المتابعة؟"
    );

    if (!confirmed) return;

    setIsPublishing(true);
    setStorageMode("Supabase دائم — جاري النشر إلى sections");

    const { data: existingData, error: existingError } = await supabase
      .from("sections")
      .select("id, page_id, section_key, section_type, title, subtitle, content, sort_order, is_visible, settings, created_at, updated_at")
      .eq("page_id", draft.pageId)
      .order("sort_order", { ascending: true });

    if (existingError) {
      setIsPublishing(false);
      setStorageMode("Supabase دائم — فشل قراءة الأقسام المنشورة");
      setError(`تعذر قراءة جدول sections قبل النشر: ${existingError.message}`);
      return;
    }

    const existingSections = (existingData || []) as PublishedSectionRow[];
    const existingByKey = new Map<string, PublishedSectionRow>();
    existingSections.forEach((section) => {
      if (section.section_key && !existingByKey.has(section.section_key)) {
        existingByKey.set(section.section_key, section);
      }
    });

    const now = new Date().toISOString();
    const publishedKeys = new Set<string>();
    const usedKeys = new Set<string>();
    let createdCount = 0;
    let updatedCount = 0;
    let hiddenCount = 0;

    for (const [index, section] of draft.sections.entries()) {
      const sectionKey = createUniqueSectionKey(section.id, `${section.type}-${index + 1}`, usedKeys);
      publishedKeys.add(sectionKey);

      const existingSection = existingByKey.get(sectionKey);
      const payload = {
        page_id: draft.pageId,
        section_key: sectionKey,
        section_type: section.type,
        title: section.title.trim() || sectionTypes.find((item) => item.type === section.type)?.label || "Section",
        subtitle: "",
        content: section.body.trim(),
        sort_order: index + 1,
        is_visible: true,
        settings: {
          source: "page_builder",
          language: draft.language,
          page_slug: draft.slug,
          builder_section_id: section.id,
          published_at: now,
        },
        updated_at: now,
      };

      const result = existingSection
        ? await supabase.from("sections").update(payload).eq("id", existingSection.id)
        : await supabase.from("sections").insert(payload);

      if (result.error) {
        setIsPublishing(false);
        setStorageMode("Supabase دائم — فشل النشر إلى sections");
        setError(`فشل نشر القسم "${section.title || sectionKey}": ${result.error.message}`);
        return;
      }

      if (existingSection) updatedCount += 1;
      else createdCount += 1;
    }

    const sectionsToHide = existingSections.filter(
      (section) => section.section_key && !publishedKeys.has(section.section_key) && section.is_visible !== false
    );

    for (const section of sectionsToHide) {
      const result = await supabase
        .from("sections")
        .update({
          is_visible: false,
          updated_at: now,
        })
        .eq("id", section.id);

      if (result.error) {
        setIsPublishing(false);
        setStorageMode("Supabase دائم — تم النشر جزئياً مع فشل إخفاء قسم قديم");
        setError(`تم نشر الأقسام الجديدة، لكن فشل إخفاء القسم القديم "${section.section_key}": ${result.error.message}`);
        return;
      }

      hiddenCount += 1;
    }

    await logActivity(
      "publish_page_builder_to_sections",
      "sections",
      String(draft.pageId),
      JSON.stringify(existingSections),
      JSON.stringify({ page_id: draft.pageId, language: draft.language, createdCount, updatedCount, hiddenCount, publishedKeys: Array.from(publishedKeys) })
    );

    setIsPublishing(false);
    setStorageMode("Supabase دائم — تم النشر إلى sections");
    setMessage(
      `تم النشر إلى الأقسام المنشورة بنجاح. تم تحديث ${updatedCount}، إضافة ${createdCount}، وإخفاء ${hiddenCount} بدون حذف نهائي.`
    );
  }

  async function logActivity(action: string, entityType: string, entityId: string, oldData: string, newData: string) {
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

  function exportDraft() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `page-builder-${draft.slug || "draft"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          جاري التحقق من صلاحيات الإدارة...
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
              Advanced Page Builder
            </div>
            <h1 className="text-4xl font-black md:text-5xl">منشئ الصفحات المتقدم</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              محرر أقسام دائم مرتبط بصفحات CMS الموجودة. الحفظ يتم في Page Builder، ويمكن نشر النسخة الجاهزة إلى جدول sections بخطوة إدارية مستقلة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={saveDraft} disabled={isSaving || isPublishing || isLoadingPages || isLoadingSections} className="rounded-full bg-gradient-to-r from-purple-600 to-yellow-500 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? "جارٍ الحفظ..." : "حفظ دائم"}
            </button>
            <button onClick={publishDraftToSections} disabled={isSaving || isPublishing || isLoadingPages || isLoadingSections || !draft.pageId} className="rounded-full border border-green-400/25 bg-green-500/10 px-6 py-3 font-black text-green-100 disabled:cursor-not-allowed disabled:opacity-60">
              {isPublishing ? "جارٍ النشر..." : "نشر إلى الأقسام المنشورة"}
            </button>
            <button onClick={exportDraft} className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              تصدير JSON
            </button>
            <Link href="/admin/sections" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              الأقسام المنشورة
            </Link>
            <Link href="/admin/pages" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              إدارة الصفحات
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
            حساب الإدارة: <span className="text-white">{adminEmail}</span>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
            مصدر الحفظ: <span className="text-white">{storageMode}</span>
          </div>
        </div>

        {(message || error) && (
          <div className={`mb-6 rounded-3xl border p-5 ${error ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-green-400/25 bg-green-500/10 text-green-100"}`}>
            {error || message}
          </div>
        )}

        <div className="mb-8 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-100">
          النشر إلى sections يؤثر على جدول النشر العام للأقسام. لا يتم حذف أي قسم نهائياً: الأقسام القديمة غير الموجودة في المسودة يتم إخفاؤها فقط، ويمكن مراجعتها من صفحة الأقسام المنشورة.
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="نسبة الجاهزية" value={completion} suffix="%" tone="green" />
          <StatCard label="عدد الأقسام" value={draft.sections.length} tone="purple" />
          <StatCard label="صفحات CMS" value={pages.length} tone="yellow" />
          <StatCard label="اللغة" value={draft.language === "ar" ? 1 : draft.language === "en" ? 2 : 3} tone="cyan" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <label className="grid gap-2 text-sm font-black text-white/70">
              الصفحة المرتبطة من CMS
              <select
                value={draft.pageId || ""}
                onChange={(event) => selectPage(Number(event.target.value))}
                className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none"
              >
                {pages.length === 0 && <option value="">لا توجد صفحات</option>}
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title || "بدون عنوان"} — /{page.slug || ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnlyField label="عنوان الصفحة" value={draft.pageTitle} />
              <ReadOnlyField label="رابط الصفحة / Slug" value={`/${draft.slug}`} />
              <ReadOnlyField label="SEO Title" value={draft.seoTitle || "غير مكتمل"} />
              <ReadOnlyField label="SEO Description" value={draft.seoDescription || "غير مكتمل"} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-white/70">
                حالة تجهيز الأقسام
                <select value={draft.status} onChange={(event) => updateDraft({ ...draft, status: event.target.value as PageStatus })} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="draft">مسودة</option>
                  <option value="review">مراجعة</option>
                  <option value="ready">جاهزة</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black text-white/70">
                لغة الأقسام
                <select value={draft.language} onChange={(event) => updateDraft({ ...draft, language: event.target.value })} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 text-sm font-black text-white/70">إضافة قسم جاهز</div>
              <div className="flex flex-wrap gap-3">
                {sectionTypes.map((item) => (
                  <button key={item.type} type="button" onClick={() => addSection(item.type)} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-black text-white/75 hover:border-yellow-300/35">
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {draft.sections.map((section, index) => (
              <article key={section.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
                      {index + 1} / {section.type}
                    </span>
                    <span className="mr-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/45" dir="ltr">
                      {normalizeSectionKey(section.id)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => moveSection(section.id, "up")} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/70">أعلى</button>
                    <button type="button" onClick={() => moveSection(section.id, "down")} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/70">أسفل</button>
                    <button type="button" onClick={() => removeSection(section.id)} className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-100">حذف من المسودة</button>
                  </div>
                </div>

                <div className="grid gap-4">
                  <Field label="عنوان القسم" value={section.title} onChange={(value) => updateSection(section.id, "title", value)} />
                  <label className="grid gap-2 text-sm font-black text-white/70">
                    محتوى القسم
                    <textarea value={section.body} onChange={(event) => updateSection(section.id, "body", event.target.value)} className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none" />
                  </label>
                </div>
              </article>
            ))}
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 xl:sticky xl:top-6 xl:self-start">
            <h2 className="text-2xl font-black">معاينة مختصرة</h2>
            <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
              <div className="text-xs font-black text-yellow-100">/{draft.slug}</div>
              <h3 className="mt-3 text-2xl font-black">{draft.pageTitle}</h3>
              <p className="mt-3 leading-7 text-white/55">{draft.seoDescription || "وصف SEO غير مكتمل."}</p>
            </div>
            <div className="mt-5 grid gap-3">
              {draft.sections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs font-black text-purple-100">{section.type}</div>
                  <div className="mt-2 font-black">{section.title}</div>
                  <div className="mt-2 text-xs text-white/35" dir="ltr">{normalizeSectionKey(section.id)}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-black text-white/70">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-14 rounded-2xl border border-white/10 bg-black/30 px-5 text-white outline-none" />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-white/70">
      {label}
      <input value={value} readOnly className="h-14 rounded-2xl border border-white/10 bg-black/20 px-5 text-white/60 outline-none" />
    </label>
  );
}

function StatCard({ label, value, tone, suffix = "" }: { label: string; value: number; tone: Tone; suffix?: string }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}{suffix}</div>
    </div>
  );
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
  };
  return classes[tone];
}
