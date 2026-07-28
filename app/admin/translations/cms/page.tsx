"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type TranslationField = "title" | "summary" | "content";
type GenericRow = Record<string, unknown>;

type CmsPage = {
  id: string;
  key: string;
  title: string;
  slug: string;
  content: string;
  seoDescription: string;
  isPublished: boolean;
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

type TranslationState = {
  values: Partial<Record<TranslationField, string>>;
  reviewed: boolean;
  published: boolean;
};

type TranslationPack = Record<string, Partial<Record<LanguageCode, TranslationState>>>;

const fields: Array<{ key: TranslationField; label: string; helper: string }> = [
  { key: "title", label: "عنوان الصفحة", helper: "العنوان الرئيسي الظاهر للزائر." },
  { key: "summary", label: "وصف SEO", helper: "الوصف المختصر المرتبط بالصفحة في CMS." },
  { key: "content", label: "محتوى الصفحة", helper: "المحتوى الأساسي للصفحة في CMS." },
];

const languages: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

function makeKey(id: string) {
  return `pages:${id}`;
}

function text(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function isField(value: string | null): value is TranslationField {
  return fields.some((field) => field.key === value);
}

function emptyState(): TranslationState {
  return { values: {}, reviewed: false, published: false };
}

function sourceValue(page: CmsPage, field: TranslationField) {
  if (field === "title") return page.title;
  if (field === "summary") return page.seoDescription;
  return page.content;
}

function activeFields(page: CmsPage) {
  return fields.filter((field) => Boolean(sourceValue(page, field.key).trim()));
}

function completion(page: CmsPage, state: TranslationState) {
  const active = activeFields(page);
  if (active.length === 0) return 0;
  return Math.round((active.filter((field) => Boolean(state.values[field.key]?.trim())).length / active.length) * 100);
}

function isComplete(page: CmsPage, state: TranslationState) {
  const active = activeFields(page);
  return active.length > 0 && active.every((field) => Boolean(state.values[field.key]?.trim()));
}

function buildPack(pages: CmsPage[], rows: TranslationRow[]): TranslationPack {
  const next: TranslationPack = {};

  pages.forEach((page) => {
    next[page.key] = {};

    languages.forEach(({ code }) => {
      const pageRows = rows.filter(
        (row) => String(row.source_id ?? "") === page.id && row.language === code && isField(row.field_name)
      );
      const values: Partial<Record<TranslationField, string>> = {};
      pageRows.forEach((row) => {
        if (isField(row.field_name)) values[row.field_name] = row.translated_value || "";
      });

      const active = activeFields(page);
      const allReviewed =
        active.length > 0 &&
        active.every((field) => {
          const row = pageRows.find((candidate) => candidate.field_name === field.key);
          return Boolean(row?.reviewed);
        });
      const allPublished =
        allReviewed &&
        active.every((field) => {
          const row = pageRows.find((candidate) => candidate.field_name === field.key);
          return Boolean(row?.is_published || row?.status === "published");
        });

      next[page.key][code] = { values, reviewed: allReviewed, published: allPublished };
    });
  });

  return next;
}

function statusLabel(page: CmsPage, state: TranslationState) {
  const value = completion(page, state);
  if (state.published && state.reviewed && value === 100) return "منشور";
  if (state.reviewed && value === 100) return "مكتمل ومراجع";
  if (value === 100) return "جاهز للمراجعة";
  if (value > 0) return "ترجمة جزئية";
  return "بانتظار الترجمة";
}

function statusClass(page: CmsPage, state: TranslationState) {
  const value = completion(page, state);
  if (state.published && state.reviewed && value === 100) return "border-green-400/30 bg-green-500/10 text-green-100";
  if (state.reviewed && value === 100) return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
  if (value === 100) return "border-yellow-400/30 bg-yellow-500/10 text-yellow-100";
  if (value > 0) return "border-orange-400/30 bg-orange-500/10 text-orange-100";
  return "border-white/15 bg-white/[0.04] text-white/65";
}

export default function CmsPageTranslationsPage() {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [pack, setPack] = useState<TranslationPack>({});
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    if (!isAuthorized) return;
    void loadContent();
  }, [isAuthorized]);

  async function loadContent() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    const [pagesResult, translationsResult] = await Promise.all([
      supabase
        .from("pages")
        .select("id, title, slug, content, seo_description, is_published, sort_order")
        .order("sort_order", { ascending: true })
        .limit(300),
      supabase
        .from("content_translations")
        .select("source_id, field_name, language, translated_value, status, reviewed, is_published")
        .eq("source_type", "pages")
        .in("field_name", fields.map((field) => field.key))
        .in("language", ["en", "tr"])
        .limit(3000),
    ]);

    setIsLoading(false);

    if (pagesResult.error) {
      setError(`تعذر تحميل صفحات CMS: ${pagesResult.error.message}`);
      return;
    }

    const loadedPages = ((pagesResult.data || []) as GenericRow[]).map((row, index) => {
      const id = text(row, "id", `page-${index}`);
      return {
        id,
        key: makeKey(id),
        title: text(row, "title", "صفحة بدون عنوان"),
        slug: text(row, "slug", "page"),
        content: text(row, "content"),
        seoDescription: text(row, "seo_description"),
        isPublished: row.is_published !== false,
      };
    });

    setPages(loadedPages);
    setPack(buildPack(loadedPages, (translationsResult.data || []) as TranslationRow[]));
    setSelectedKey((current) => current || loadedPages[0]?.key || "");

    if (translationsResult.error) {
      setError(`تم تحميل الصفحات، لكن تعذر تحميل ترجماتها: ${translationsResult.error.message}`);
    }
  }

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pages;
    return pages.filter((page) => `${page.title} ${page.slug}`.toLowerCase().includes(query));
  }, [pages, search]);

  const selectedPage = filteredPages.find((page) => page.key === selectedKey) || filteredPages[0] || null;
  const selectedState = selectedPage ? pack[selectedPage.key]?.[language] || emptyState() : emptyState();
  const selectedComplete = selectedPage ? isComplete(selectedPage, selectedState) : false;
  const reviewedCount = pages.filter((page) => {
    const state = pack[page.key]?.[language] || emptyState();
    return state.reviewed && isComplete(page, state);
  }).length;
  const publishedCount = pages.filter((page) => {
    const state = pack[page.key]?.[language] || emptyState();
    return state.published && state.reviewed && isComplete(page, state);
  }).length;

  function updateText(field: TranslationField, value: string) {
    if (!selectedPage) return;
    setPack((current) => {
      const previous = current[selectedPage.key]?.[language] || emptyState();
      return {
        ...current,
        [selectedPage.key]: {
          ...(current[selectedPage.key] || {}),
          [language]: {
            values: { ...previous.values, [field]: value },
            reviewed: false,
            published: false,
          },
        },
      };
    });
  }

  function setReviewed(reviewed: boolean) {
    if (!selectedPage || (reviewed && !selectedComplete)) return;
    setPack((current) => {
      const previous = current[selectedPage.key]?.[language] || emptyState();
      return {
        ...current,
        [selectedPage.key]: {
          ...(current[selectedPage.key] || {}),
          [language]: { ...previous, reviewed, published: reviewed ? previous.published : false },
        },
      };
    });
  }

  function setPublished(published: boolean) {
    if (!selectedPage || !selectedComplete || !selectedState.reviewed) return;
    setPack((current) => {
      const previous = current[selectedPage.key]?.[language] || emptyState();
      return {
        ...current,
        [selectedPage.key]: {
          ...(current[selectedPage.key] || {}),
          [language]: { ...previous, published },
        },
      };
    });
  }

  async function saveSelected() {
    if (!supabase || !selectedPage) {
      setError("اختر صفحة CMS أولاً.");
      return;
    }

    const active = activeFields(selectedPage);
    const hasAnyText = active.some((field) => Boolean(selectedState.values[field.key]?.trim()));
    if (!hasAnyText) {
      setError("أدخل ترجمة واحدة على الأقل قبل الحفظ.");
      return;
    }

    if (selectedState.reviewed && !selectedComplete) {
      setError("لا يمكن اعتبار الترجمة مراجعة قبل اكتمال كل الحقول العربية المتوفرة وترجمتها.");
      return;
    }

    const reviewed = Boolean(selectedState.reviewed && selectedComplete);
    const published = Boolean(selectedState.published && reviewed && selectedComplete);
    const status = published ? "published" : reviewed ? "reviewed" : "needs_review";

    const rows = active.map((field) => ({
      source_type: "pages",
      source_id: selectedPage.id,
      field_name: field.key,
      language,
      translated_value: selectedState.values[field.key] || "",
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
      setError(`تعذر حفظ الترجمة: ${saveError.message}`);
      return;
    }

    setPack((current) => ({
      ...current,
      [selectedPage.key]: {
        ...(current[selectedPage.key] || {}),
        [language]: { ...selectedState, reviewed, published },
      },
    }));

    setMessage(
      published
        ? "تم حفظ ونشر ترجمة صفحة CMS. لا تظهر للزوار قبل ربط الصفحة العامة بقارئ الترجمات في مرحلة مستقلة."
        : reviewed
          ? "تم حفظ الترجمة بحالة مكتمل ومراجع. يمكنك نشرها بعد التحقق النهائي."
          : "تم حفظ الترجمة بحالة تحتاج مراجعة. لن تظهر للعامة قبل المراجعة والنشر اليدوي."
    );
  }

  if (isCheckingAccess || isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">
          جاري تجهيز ترجمة صفحات CMS...
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
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-50">
              CMS Page Translation Review
            </div>
            <h1 className="text-4xl font-black md:text-5xl">ترجمة صفحات CMS</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              إدارة عنوان الصفحة ووصف SEO والمحتوى من مصدر واحد. لا يتم تغيير الصفحة العربية أو إظهار الترجمة للعامة ضمن هذه الخطوة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations/automation" className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 font-bold text-fuchsia-100">
              الترجمة التلقائية
            </Link>
            <Link href="/admin/translations" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">
              لوحة الترجمات العامة
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-sm text-white/55">إجمالي صفحات CMS</div>
            <div className="mt-2 text-3xl font-black">{pages.length}</div>
          </div>
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5">
            <div className="text-sm text-cyan-100/75">مكتملة ومراجعة — {language === "en" ? "English" : "Türkçe"}</div>
            <div className="mt-2 text-3xl font-black">{reviewedCount}</div>
          </div>
          <div className="rounded-3xl border border-green-400/20 bg-green-500/10 p-5">
            <div className="text-sm text-green-100/75">منشورة — {language === "en" ? "English" : "Türkçe"}</div>
            <div className="mt-2 text-3xl font-black">{publishedCount}</div>
          </div>
        </div>

        {message && <div className="mt-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mt-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="mt-6 flex flex-wrap gap-3">
          {languages.map((item) => {
            const active = language === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                className={`rounded-full border px-6 py-3 font-bold transition ${active ? "border-cyan-300/70 bg-cyan-500/20 text-white" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-cyan-300/35"}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <label className="text-sm font-bold text-white/70">البحث في صفحات CMS</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="عنوان الصفحة أو slug"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
            />

            <div className="mt-5 grid gap-3">
              {filteredPages.map((page) => {
                const state = pack[page.key]?.[language] || emptyState();
                const active = selectedPage?.key === page.key;
                return (
                  <button
                    key={page.key}
                    type="button"
                    onClick={() => {
                      setSelectedKey(page.key);
                      setMessage("");
                      setError("");
                    }}
                    className={`rounded-2xl border p-4 text-right transition ${active ? "border-cyan-300/70 bg-cyan-500/15" : "border-white/10 bg-black/20 hover:border-cyan-300/35"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-black">{page.title}</span>
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${statusClass(page, state)}`}>
                        {completion(page, state)}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-white/45">/{page.slug}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${statusClass(page, state)}`}>{statusLabel(page, state)}</span>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${page.isPublished ? "border-green-400/25 bg-green-500/10 text-green-100" : "border-white/10 bg-white/[0.04] text-white/55"}`}>{page.isPublished ? "منشورة عربياً" : "مسودة عربية"}</span>
                    </div>
                  </button>
                );
              })}

              {filteredPages.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/50">لا توجد صفحات مطابقة للبحث.</div>}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-7">
            {!selectedPage ? (
              <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/55">اختر صفحة CMS لبدء المراجعة.</div>
            ) : (
              <>
                <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-3xl font-black">{selectedPage.title}</h2>
                    <p className="mt-2 text-white/55">/{selectedPage.slug}</p>
                  </div>
                  <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${statusClass(selectedPage, selectedState)}`}>
                    {statusLabel(selectedPage, selectedState)} — {completion(selectedPage, selectedState)}%
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5 text-cyan-50/90">
                  يتم حفظ الحقول العربية المتوفرة فقط. الحقل العربي الفارغ لا يحتاج ترجمة ولا يمنع اكتمال المراجعة. هذه اللوحة لا تربط الترجمات بالصفحات العامة بعد.
                </div>

                <div className="mt-6 space-y-5">
                  {fields.map((field) => {
                    const source = sourceValue(selectedPage, field.key);
                    const sourceMissing = !source.trim();
                    return (
                      <div key={field.key} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-xl font-black">{field.label}</h3>
                            <p className="mt-1 text-sm text-white/50">{field.helper}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${sourceMissing ? "border-white/10 bg-white/[0.04] text-white/50" : "border-cyan-400/25 bg-cyan-500/10 text-cyan-50"}`}>
                            {sourceMissing ? "الأصل العربي غير متوفر — غير مطلوب" : "الأصل العربي متوفر"}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-4 xl:grid-cols-2">
                          <div>
                            <div className="mb-2 text-sm font-bold text-purple-100/80">العربية — المصدر</div>
                            <textarea
                              value={source}
                              readOnly
                              rows={field.key === "content" ? 10 : 5}
                              className="w-full resize-y rounded-2xl border border-white/10 bg-black/35 p-4 leading-7 text-white/70 outline-none"
                            />
                          </div>
                          <div>
                            <div className="mb-2 text-sm font-bold text-cyan-100/90">{language === "en" ? "English" : "Türkçe"} — الترجمة</div>
                            <textarea
                              dir="ltr"
                              value={selectedState.values[field.key] || ""}
                              onChange={(event) => updateText(field.key, event.target.value)}
                              disabled={sourceMissing}
                              rows={field.key === "content" ? 10 : 5}
                              placeholder={sourceMissing ? "لا يوجد مصدر عربي لهذا الحقل" : "أدخل الترجمة هنا"}
                              className="w-full resize-y rounded-2xl border border-white/10 bg-black/35 p-4 leading-7 text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xl font-black">المراجعة والنشر</div>
                  <p className="mt-2 leading-7 text-white/60">كل تعديل يعيد الحالة إلى تحتاج مراجعة. لا يمكن المراجعة أو النشر قبل ترجمة كل الحقول العربية المتوفرة لهذه الصفحة.</p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${selectedComplete ? "border-cyan-400/25 bg-cyan-500/10" : "border-white/10 bg-white/[0.03] opacity-60"}`}>
                      <input type="checkbox" checked={selectedState.reviewed} disabled={!selectedComplete} onChange={(event) => setReviewed(event.target.checked)} className="mt-1 h-4 w-4" />
                      <span>
                        <span className="block font-black">تمت المراجعة النهائية</span>
                        <span className="mt-1 block text-sm leading-6 text-white/60">يتطلب اكتمال جميع الحقول العربية المتوفرة وترجمتها.</span>
                      </span>
                    </label>

                    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${selectedComplete && selectedState.reviewed ? "border-green-400/25 bg-green-500/10" : "border-white/10 bg-white/[0.03] opacity-60"}`}>
                      <input type="checkbox" checked={selectedState.published} disabled={!selectedComplete || !selectedState.reviewed} onChange={(event) => setPublished(event.target.checked)} className="mt-1 h-4 w-4" />
                      <span>
                        <span className="block font-black">نشر هذه اللغة</span>
                        <span className="mt-1 block text-sm leading-6 text-white/60">النشر يحفظ حالة جاهزة فقط؛ الربط العام سيأتي في خطوة منفصلة.</span>
                      </span>
                    </label>
                  </div>

                  <button type="button" disabled={isSaving} onClick={() => void saveSelected()} className="mt-6 w-full rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-7 py-4 text-lg font-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? "جارٍ الحفظ..." : "حفظ حالة هذه اللغة"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
