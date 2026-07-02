"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type FieldName = "title" | "summary" | "content";
type RawRow = Record<string, unknown>;

type CmsPageOption = {
  id: string;
  title: string;
  slug: string;
};

type CmsSection = {
  id: string;
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  sectionKey: string;
  sectionType: string;
  title: string;
  subtitle: string;
  content: string;
  sortOrder: number;
  visible: boolean;
};

type TranslationRow = {
  source_id: string | number | null;
  field_name: string | null;
  language: string | null;
  translated_value: string | null;
  reviewed: boolean | null;
  is_published: boolean | null;
  status: string | null;
};

type SectionState = {
  values: Partial<Record<FieldName, string>>;
  reviewed: boolean;
  published: boolean;
};

const fields: Array<{ key: FieldName; label: string; helper: string }> = [
  { key: "title", label: "عنوان القسم", helper: "العنوان الظاهر داخل القسم." },
  { key: "summary", label: "العنوان الفرعي", helper: "الحقل subtitle داخل القسم." },
  { key: "content", label: "محتوى القسم", helper: "المحتوى الأساسي داخل القسم." },
];

const languageLabels: Record<LanguageCode, string> = {
  en: "English",
  tr: "Türkçe",
};

function getText(row: RawRow, key: string, fallback = "") {
  const value = row[key];
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function isFieldName(value: string | null): value is FieldName {
  return fields.some((field) => field.key === value);
}

function emptyState(): SectionState {
  return { values: {}, reviewed: false, published: false };
}

function sourceValue(section: CmsSection, field: FieldName) {
  if (field === "title") return section.title;
  if (field === "summary") return section.subtitle;
  return section.content;
}

function activeFields(section: CmsSection) {
  return fields.filter((field) => Boolean(sourceValue(section, field.key).trim()));
}

function buildState(section: CmsSection, language: LanguageCode, rows: TranslationRow[]): SectionState {
  const matchedRows = rows.filter(
    (row) => String(row.source_id ?? "") === section.id && row.language === language && isFieldName(row.field_name)
  );
  const values: Partial<Record<FieldName, string>> = {};

  matchedRows.forEach((row) => {
    if (isFieldName(row.field_name)) values[row.field_name] = row.translated_value || "";
  });

  const available = activeFields(section);
  const reviewed =
    available.length > 0 &&
    available.every((field) => matchedRows.some((row) => row.field_name === field.key && row.reviewed));
  const published =
    reviewed &&
    available.every((field) =>
      matchedRows.some(
        (row) => row.field_name === field.key && (row.is_published || row.status === "published")
      )
    );

  return { values, reviewed, published };
}

function completion(section: CmsSection, state: SectionState) {
  const available = activeFields(section);
  if (available.length === 0) return 0;
  return Math.round(
    (available.filter((field) => Boolean(state.values[field.key]?.trim())).length / available.length) * 100
  );
}

function complete(section: CmsSection, state: SectionState) {
  const available = activeFields(section);
  return available.length > 0 && available.every((field) => Boolean(state.values[field.key]?.trim()));
}

function stateLabel(section: CmsSection, state: SectionState) {
  const percent = completion(section, state);
  if (state.published && state.reviewed && percent === 100) return "منشور";
  if (state.reviewed && percent === 100) return "مكتمل ومراجع";
  if (percent === 100) return "جاهز للمراجعة";
  if (percent > 0) return "ترجمة جزئية";
  return "بانتظار الترجمة";
}

function stateClass(section: CmsSection, state: SectionState) {
  const percent = completion(section, state);
  if (state.published && state.reviewed && percent === 100) return "border-green-400/30 bg-green-500/10 text-green-100";
  if (state.reviewed && percent === 100) return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
  if (percent === 100) return "border-yellow-400/30 bg-yellow-500/10 text-yellow-100";
  if (percent > 0) return "border-orange-400/30 bg-orange-500/10 text-orange-100";
  return "border-white/15 bg-white/[0.04] text-white/65";
}

export default function CmsSectionTranslationsPage() {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [pages, setPages] = useState<CmsPageOption[]>([]);
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [translationRows, setTranslationRows] = useState<TranslationRow[]>([]);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [pageId, setPageId] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<SectionState>(emptyState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized || !access.profile) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        setIsCheckingAccess(false);
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAccess(false);
    }

    void checkAccess();
  }, [router]);

  useEffect(() => {
    if (isAuthorized) void loadData();
  }, [isAuthorized]);

  async function loadData() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    const [pagesResult, sectionsResult, translationsResult] = await Promise.all([
      supabase.from("pages").select("id, title, slug, sort_order").order("sort_order", { ascending: true }).limit(300),
      supabase
        .from("sections")
        .select("id, page_id, section_key, section_type, title, subtitle, content, sort_order, is_visible")
        .order("page_id", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(1000),
      supabase
        .from("content_translations")
        .select("source_id, field_name, language, translated_value, status, reviewed, is_published")
        .eq("source_type", "sections")
        .in("field_name", fields.map((field) => field.key))
        .in("language", ["en", "tr"])
        .limit(5000),
    ]);

    if (pagesResult.error || sectionsResult.error) {
      setError(`تعذر تحميل أقسام CMS: ${pagesResult.error?.message || sectionsResult.error?.message || "خطأ غير معروف"}`);
      setIsLoading(false);
      return;
    }

    const nextPages = ((pagesResult.data || []) as RawRow[]).map((row, index) => ({
      id: getText(row, "id", `page-${index}`),
      title: getText(row, "title", "صفحة بدون عنوان"),
      slug: getText(row, "slug", "page"),
    }));
    const pageMap = new Map(nextPages.map((page) => [page.id, page]));
    const nextSections = ((sectionsResult.data || []) as RawRow[]).map((row, index) => {
      const linkedPage = pageMap.get(getText(row, "page_id"));
      return {
        id: getText(row, "id", `section-${index}`),
        pageId: getText(row, "page_id"),
        pageTitle: linkedPage?.title || "صفحة غير معروفة",
        pageSlug: linkedPage?.slug || "",
        sectionKey: getText(row, "section_key", "قسم بدون مفتاح"),
        sectionType: getText(row, "section_type", "section"),
        title: getText(row, "title"),
        subtitle: getText(row, "subtitle"),
        content: getText(row, "content"),
        sortOrder: Number(row.sort_order || 0),
        visible: row.is_visible !== false,
      };
    });

    setPages(nextPages);
    setSections(nextSections);
    setTranslationRows((translationsResult.data || []) as TranslationRow[]);
    setSelectedId((current) => current || nextSections[0]?.id || "");
    setIsLoading(false);

    if (translationsResult.error) {
      setError(
        "تم تحميل الأقسام، لكن قاعدة البيانات لم تتعرف على مصدر sections بعد. طبّق Migration Sections أولاً ثم أعد تحميل الصفحة."
      );
    }
  }

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => {
      const matchesPage = pageId === "all" || section.pageId === pageId;
      const matchesSearch = !query || `${section.pageTitle} ${section.sectionKey} ${section.title} ${section.sectionType}`.toLowerCase().includes(query);
      return matchesPage && matchesSearch;
    });
  }, [pageId, search, sections]);

  const selectedSection = filteredSections.find((section) => section.id === selectedId) || filteredSections[0] || null;

  useEffect(() => {
    if (!selectedSection) {
      setDraft(emptyState());
      return;
    }

    setSelectedId(selectedSection.id);
    setDraft(buildState(selectedSection, language, translationRows));
  }, [language, selectedSection?.id, translationRows]);

  function updateField(field: FieldName, value: string) {
    setDraft((current) => ({
      values: { ...current.values, [field]: value },
      reviewed: false,
      published: false,
    }));
  }

  function updateReviewed(value: boolean) {
    if (!selectedSection || (value && !complete(selectedSection, draft))) return;
    setDraft((current) => ({ ...current, reviewed: value, published: value ? current.published : false }));
  }

  function updatePublished(value: boolean) {
    if (!selectedSection || !complete(selectedSection, draft) || !draft.reviewed) return;
    setDraft((current) => ({ ...current, published: value }));
  }

  async function save() {
    if (!supabase || !selectedSection) {
      setError("اختر قسماً أولاً.");
      return;
    }

    const available = activeFields(selectedSection);
    if (!available.some((field) => Boolean(draft.values[field.key]?.trim()))) {
      setError("أدخل ترجمة واحدة على الأقل قبل الحفظ.");
      return;
    }

    const isComplete = complete(selectedSection, draft);
    if (draft.reviewed && !isComplete) {
      setError("لا يمكن اعتماد المراجعة قبل إكمال كل الحقول العربية المتوفرة لهذا القسم.");
      return;
    }

    const reviewed = Boolean(draft.reviewed && isComplete);
    const published = Boolean(draft.published && reviewed && isComplete);
    const status = published ? "published" : reviewed ? "reviewed" : "needs_review";

    const rows = available.map((field) => ({
      source_type: "sections",
      source_id: selectedSection.id,
      field_name: field.key,
      language,
      translated_value: draft.values[field.key] || "",
      status,
      reviewed,
      is_published: published,
      created_by: adminEmail,
      updated_by: adminEmail,
      updated_at: new Date().toISOString(),
    }));

    setIsSaving(true);
    setError("");
    setMessage("");
    const { error: saveError } = await supabase.from("content_translations").upsert(rows, {
      onConflict: "source_type,source_id,field_name,language",
    });
    setIsSaving(false);

    if (saveError) {
      setError(
        saveError.message.includes("source_type")
          ? "تعذر الحفظ لأن Migration Sections لم تُطبّق بعد في Supabase. طبّق ملف Migration المرفق في PR ثم أعد الحفظ."
          : `تعذر حفظ الترجمة: ${saveError.message}`
      );
      return;
    }

    setTranslationRows((current) => {
      const retained = current.filter(
        (row) => !(String(row.source_id ?? "") === selectedSection.id && row.language === language && isFieldName(row.field_name))
      );
      return [...retained, ...rows];
    });
    setMessage(
      published
        ? "تم حفظ ترجمة القسم ونشرها. لن تظهر للزوار قبل ربط الأقسام العامة بقارئ الترجمات في مرحلة مستقلة."
        : reviewed
          ? "تم حفظ ترجمة القسم بحالة مكتمل ومراجع."
          : "تم حفظ ترجمة القسم بحالة تحتاج مراجعة، ولن تظهر للعامة تلقائياً."
    );
  }

  const reviewedTotal = sections.filter((section) => {
    const state = buildState(section, language, translationRows);
    return state.reviewed && complete(section, state);
  }).length;
  const publishedTotal = sections.filter((section) => {
    const state = buildState(section, language, translationRows);
    return state.published && state.reviewed && complete(section, state);
  }).length;

  if (isCheckingAccess || isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">
          جاري تجهيز ترجمة أقسام CMS...
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-32 text-white md:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
              CMS Section Translation Review
            </div>
            <h1 className="text-4xl font-black md:text-5xl">ترجمة أقسام CMS</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              إدارة عناوين الأقسام والعناوين الفرعية والمحتوى لكل صفحة. لا يتم تغيير العربية ولا تظهر الترجمة للزوار ضمن هذه المرحلة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations/cms" className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-3 font-bold text-cyan-50">ترجمة صفحات CMS</Link>
            <Link href="/admin/translations/automation" className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 font-bold text-fuchsia-100">الترجمة التلقائية</Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">لوحة الإدارة</Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-yellow-400/25 bg-yellow-500/10 p-5 leading-8 text-yellow-50/90">
          هذه اللوحة تحتاج تطبيق Migration أقسام CMS مرة واحدة في Supabase قبل حفظ أول ترجمة. لا تطبّق Migration تلقائياً ولا تغيّر RLS أو بيانات عربية قائمة.
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">إجمالي أقسام CMS</div><div className="mt-2 text-3xl font-black">{sections.length}</div></div>
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5"><div className="text-sm text-cyan-100/75">مكتملة ومراجعة — {languageLabels[language]}</div><div className="mt-2 text-3xl font-black">{reviewedTotal}</div></div>
          <div className="rounded-3xl border border-green-400/20 bg-green-500/10 p-5"><div className="text-sm text-green-100/75">منشورة — {languageLabels[language]}</div><div className="mt-2 text-3xl font-black">{publishedTotal}</div></div>
        </div>

        {message && <div className="mt-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mt-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="mt-6 flex flex-wrap gap-3">
          {(["en", "tr"] as LanguageCode[]).map((code) => (
            <button key={code} type="button" onClick={() => setLanguage(code)} className={`rounded-full border px-6 py-3 font-bold transition ${language === code ? "border-purple-300/70 bg-purple-500/20 text-white" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-purple-300/35"}`}>{languageLabels[code]}</button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <label className="text-sm font-bold text-white/70">تصفية حسب الصفحة</label>
            <select value={pageId} onChange={(event) => setPageId(event.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none">
              <option value="all">كل الصفحات</option>
              {pages.map((page) => <option key={page.id} value={page.id}>{page.title} — /{page.slug}</option>)}
            </select>

            <label className="mt-5 block text-sm font-bold text-white/70">البحث في الأقسام</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم الصفحة أو مفتاح القسم" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-purple-300/60" />

            <div className="mt-5 grid gap-3">
              {filteredSections.map((section) => {
                const state = buildState(section, language, translationRows);
                const active = selectedSection?.id === section.id;
                return (
                  <button key={section.id} type="button" onClick={() => { setSelectedId(section.id); setMessage(""); setError(""); }} className={`rounded-2xl border p-4 text-right transition ${active ? "border-purple-300/70 bg-purple-500/15" : "border-white/10 bg-black/20 hover:border-purple-300/35"}`}>
                    <div className="flex items-start justify-between gap-3"><span className="font-black">{section.title || section.sectionKey}</span><span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${stateClass(section, state)}`}>{completion(section, state)}%</span></div>
                    <div className="mt-2 text-xs text-white/45">{section.pageTitle} · {section.sectionKey}</div>
                    <div className="mt-3 flex flex-wrap gap-2"><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${stateClass(section, state)}`}>{stateLabel(section, state)}</span><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${section.visible ? "border-green-400/25 bg-green-500/10 text-green-100" : "border-white/10 bg-white/[0.04] text-white/55"}`}>{section.visible ? "ظاهر عربياً" : "مخفي عربياً"}</span></div>
                  </button>
                );
              })}
              {filteredSections.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/50">لا توجد أقسام مطابقة للبحث.</div>}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-7">
            {!selectedSection ? <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/55">اختر قسماً لبدء المراجعة.</div> : (
              <>
                <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between"><div><h2 className="text-3xl font-black">{selectedSection.title || selectedSection.sectionKey}</h2><p className="mt-2 text-white/55">{selectedSection.pageTitle} · {selectedSection.sectionKey} · {selectedSection.sectionType}</p></div><div className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${stateClass(selectedSection, draft)}`}>{stateLabel(selectedSection, draft)} — {completion(selectedSection, draft)}%</div></div>
                <div className="mt-6 rounded-3xl border border-purple-400/20 bg-purple-500/10 p-5 text-purple-50/90">الحقول العربية الفارغة لا تتطلب ترجمة ولا تمنع اكتمال القسم. أي تعديل في اللغة المستهدفة يعيد الحالة إلى تحتاج مراجعة.</div>

                <div className="mt-6 space-y-5">
                  {fields.map((field) => {
                    const source = sourceValue(selectedSection, field.key);
                    const missing = !source.trim();
                    return <div key={field.key} className="rounded-3xl border border-white/10 bg-black/20 p-5"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><h3 className="text-xl font-black">{field.label}</h3><p className="mt-1 text-sm text-white/50">{field.helper}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${missing ? "border-white/10 bg-white/[0.04] text-white/50" : "border-purple-400/25 bg-purple-500/10 text-purple-50"}`}>{missing ? "الأصل العربي غير متوفر — غير مطلوب" : "الأصل العربي متوفر"}</span></div><div className="mt-5 grid gap-4 xl:grid-cols-2"><div><div className="mb-2 text-sm font-bold text-purple-100/80">العربية — المصدر</div><textarea value={source} readOnly rows={field.key === "content" ? 9 : 4} className="w-full resize-y rounded-2xl border border-white/10 bg-black/35 p-4 leading-7 text-white/70 outline-none" /></div><div><div className="mb-2 text-sm font-bold text-cyan-100/90">{languageLabels[language]} — الترجمة</div><textarea dir="ltr" value={draft.values[field.key] || ""} disabled={missing} onChange={(event) => updateField(field.key, event.target.value)} rows={field.key === "content" ? 9 : 4} placeholder={missing ? "لا يوجد مصدر عربي لهذا الحقل" : "أدخل الترجمة هنا"} className="w-full resize-y rounded-2xl border border-white/10 bg-black/35 p-4 leading-7 text-white outline-none placeholder:text-white/35 focus:border-purple-300/60 disabled:cursor-not-allowed disabled:opacity-45" /></div></div></div>;
                  })}
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5"><div className="text-xl font-black">المراجعة والنشر</div><p className="mt-2 leading-7 text-white/60">لا يمكن المراجعة أو النشر قبل اكتمال كل الحقول العربية المتوفرة. النشر هنا يحفظ الحالة فقط؛ إظهارها للزوار يأتي في خطوة ربط مستقلة.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><label className={`flex items-start gap-3 rounded-2xl border p-4 ${complete(selectedSection, draft) ? "border-cyan-400/25 bg-cyan-500/10" : "border-white/10 bg-white/[0.03] opacity-60"}`}><input type="checkbox" checked={draft.reviewed} disabled={!complete(selectedSection, draft)} onChange={(event) => updateReviewed(event.target.checked)} className="mt-1 h-4 w-4" /><span><span className="block font-black">تمت المراجعة النهائية</span><span className="mt-1 block text-sm leading-6 text-white/60">يتطلب اكتمال الترجمة أولاً.</span></span></label><label className={`flex items-start gap-3 rounded-2xl border p-4 ${complete(selectedSection, draft) && draft.reviewed ? "border-green-400/25 bg-green-500/10" : "border-white/10 bg-white/[0.03] opacity-60"}`}><input type="checkbox" checked={draft.published} disabled={!complete(selectedSection, draft) || !draft.reviewed} onChange={(event) => updatePublished(event.target.checked)} className="mt-1 h-4 w-4" /><span><span className="block font-black">نشر هذه اللغة</span><span className="mt-1 block text-sm leading-6 text-white/60">لا يظهر أي نص عام قبل مرحلة الربط.</span></span></label></div><button type="button" disabled={isSaving} onClick={() => void save()} className="mt-6 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 text-lg font-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "جارٍ الحفظ..." : "حفظ حالة هذه اللغة"}</button></div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
