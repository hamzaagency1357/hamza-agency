"use client";


import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type ProgramField = "title" | "summary" | "content" | "requirements" | "benefits" | "updates" | "faq";
type GenericRow = Record<string, unknown>;

type ProgramItem = {
  id: string;
  key: string;
  name: string;
  slug: string;
  summary: string;
  content: string;
  requirements: string;
  benefits: string;
  updates: string;
  faq: string;
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
  values: Partial<Record<ProgramField, string>>;
  reviewed: boolean;
  published: boolean;
};

type TranslationPack = Record<string, Partial<Record<LanguageCode, TranslationState>>>;

const programFields: Array<{ key: ProgramField; label: string; helper: string }> = [
  { key: "title", label: "العنوان", helper: "اسم البرنامج الظاهر للزائر." },
  { key: "summary", label: "الملخص", helper: "الوصف المختصر للبرنامج." },
  { key: "content", label: "المحتوى", helper: "الوصف التفصيلي للبرنامج." },
  { key: "requirements", label: "شروط القبول", helper: "المتطلبات والشروط اللازمة للانضمام." },
  { key: "benefits", label: "المزايا", helper: "المزايا والدعم المقدم ضمن البرنامج." },
  { key: "updates", label: "التحديثات", helper: "آخر الأخبار أو التعليمات الخاصة بالبرنامج." },
  { key: "faq", label: "الأسئلة الشائعة", helper: "أسئلة وأجوبة البرنامج الخاصة." },
];

const languageOptions: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

function makeKey(id: string) {
  return `programs:${id}`;
}

function getText(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function isProgramField(value: string | null): value is ProgramField {
  return programFields.some((field) => field.key === value);
}

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "en" || value === "tr";
}

function getDefaultState(): TranslationState {
  return { values: {}, reviewed: false, published: false };
}

function getSourceValue(program: ProgramItem, field: ProgramField) {
  if (field === "title") return program.name;
  return program[field];
}

function hasCompleteArabicSource(program: ProgramItem) {
  return programFields.every((field) => Boolean(getSourceValue(program, field.key).trim()));
}

function hasCompleteTranslation(state: TranslationState) {
  return programFields.every((field) => Boolean(state.values[field.key]?.trim()));
}

function getCompletion(state: TranslationState) {
  const complete = programFields.filter((field) => Boolean(state.values[field.key]?.trim())).length;
  return Math.round((complete / programFields.length) * 100);
}

function getStatusLabel(program: ProgramItem, state: TranslationState) {
  const sourceReady = hasCompleteArabicSource(program);
  const completion = getCompletion(state);

  if (state.published && state.reviewed && sourceReady && completion === 100) return "منشور";
  if (state.reviewed && sourceReady && completion === 100) return "مكتمل ومراجع";
  if (!sourceReady) return "المصدر العربي ناقص";
  if (completion === 100) return "جاهز للمراجعة";
  if (completion > 0) return "ترجمة جزئية";
  return "بانتظار الترجمة";
}

function getStatusClass(program: ProgramItem, state: TranslationState) {
  const sourceReady = hasCompleteArabicSource(program);
  const completion = getCompletion(state);

  if (state.published && state.reviewed && sourceReady && completion === 100) {
    return "border-green-400/30 bg-green-500/10 text-green-100";
  }
  if (state.reviewed && sourceReady && completion === 100) {
    return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
  }
  if (!sourceReady) return "border-red-400/30 bg-red-500/10 text-red-100";
  if (completion === 100) return "border-yellow-400/30 bg-yellow-500/10 text-yellow-100";
  if (completion > 0) return "border-orange-400/30 bg-orange-500/10 text-orange-100";
  return "border-white/15 bg-white/[0.04] text-white/65";
}

function buildTranslationPack(programs: ProgramItem[], rows: TranslationRow[]) {
  const grouped: Record<string, Partial<Record<LanguageCode, TranslationState>>> = {};

  rows.forEach((row) => {
    const sourceId = row.source_id === null || row.source_id === undefined ? "" : String(row.source_id).trim();
    if (!sourceId || !isProgramField(row.field_name) || !isLanguageCode(row.language)) return;

    const key = makeKey(sourceId);
    const existing = grouped[key]?.[row.language] || getDefaultState();
    const values = {
      ...existing.values,
      [row.field_name]: row.translated_value || "",
    };

    grouped[key] = {
      ...(grouped[key] || {}),
      [row.language]: {
        values,
        reviewed: existing.reviewed || Boolean(row.reviewed),
        published: existing.published || Boolean(row.is_published || row.status === "published"),
      },
    };
  });

  const pack: TranslationPack = {};

  programs.forEach((program) => {
    pack[program.key] = {};

    languageOptions.forEach(({ code }) => {
      const state = grouped[program.key]?.[code] || getDefaultState();
      const allFieldsReviewed = programFields.every((field) => {
        const row = rows.find(
          (candidate) =>
            String(candidate.source_id ?? "") === program.id &&
            candidate.language === code &&
            candidate.field_name === field.key
        );
        return Boolean(row?.reviewed);
      });
      const allFieldsPublished = allFieldsReviewed && programFields.every((field) => {
        const row = rows.find(
          (candidate) =>
            String(candidate.source_id ?? "") === program.id &&
            candidate.language === code &&
            candidate.field_name === field.key
        );
        return Boolean(row?.is_published || row?.status === "published");
      });

      pack[program.key][code] = {
        values: state.values,
        reviewed: allFieldsReviewed,
        published: allFieldsPublished,
      };
    });
  });

  return pack;
}

export default function ProgramTranslationsPage() {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
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

    const [programsResult, translationsResult] = await Promise.all([
      supabase
        .from("programs")
        .select("id, name, slug, short_description, description, requirements, benefits, updates, faq")
        .order("sort_order", { ascending: true })
        .limit(200),
      supabase
        .from("content_translations")
        .select("source_id, field_name, language, translated_value, status, reviewed, is_published")
        .eq("source_type", "programs")
        .in("field_name", programFields.map((field) => field.key))
        .in("language", ["en", "tr"])
        .limit(5000),
    ]);

    setIsLoading(false);

    if (programsResult.error) {
      setError(`تعذر تحميل البرامج: ${programsResult.error.message}`);
      return;
    }

    const loadedPrograms = ((programsResult.data || []) as GenericRow[]).map((row, index) => {
      const id = getText(row, "id", `program-${index}`);
      return {
        id,
        key: makeKey(id),
        name: getText(row, "name", "برنامج بدون عنوان"),
        slug: getText(row, "slug"),
        summary: getText(row, "short_description"),
        content: getText(row, "description"),
        requirements: getText(row, "requirements"),
        benefits: getText(row, "benefits"),
        updates: getText(row, "updates"),
        faq: getText(row, "faq"),
      };
    });

    setPrograms(loadedPrograms);
    setPack(buildTranslationPack(loadedPrograms, (translationsResult.data || []) as TranslationRow[]));
    setSelectedKey((current) => current || loadedPrograms[0]?.key || "");

    if (translationsResult.error) {
      setError(`تم تحميل البرامج، لكن تعذر تحميل ترجماتها: ${translationsResult.error.message}`);
    }
  }

  const filteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return programs;

    return programs.filter((program) =>
      [program.name, program.slug, program.summary, program.content].join(" ").toLowerCase().includes(query)
    );
  }, [programs, search]);

  const selectedProgram = filteredPrograms.find((program) => program.key === selectedKey) || filteredPrograms[0] || null;
  const selectedState = selectedProgram ? pack[selectedProgram.key]?.[language] || getDefaultState() : getDefaultState();
  const sourceReady = selectedProgram ? hasCompleteArabicSource(selectedProgram) : false;
  const translationReady = hasCompleteTranslation(selectedState);
  const canReview = sourceReady && translationReady;
  const selectedCompletion = getCompletion(selectedState);

  const reviewedCount = programs.filter((program) => {
    const state = pack[program.key]?.[language] || getDefaultState();
    return state.reviewed && hasCompleteArabicSource(program) && hasCompleteTranslation(state);
  }).length;

  const publishedCount = programs.filter((program) => {
    const state = pack[program.key]?.[language] || getDefaultState();
    return state.published && state.reviewed && hasCompleteArabicSource(program) && hasCompleteTranslation(state);
  }).length;

  function updateText(field: ProgramField, value: string) {
    if (!selectedProgram) return;

    setPack((current) => {
      const previous = current[selectedProgram.key]?.[language] || getDefaultState();
      return {
        ...current,
        [selectedProgram.key]: {
          ...(current[selectedProgram.key] || {}),
          [language]: {
            values: {
              ...previous.values,
              [field]: value,
            },
            reviewed: false,
            published: false,
          },
        },
      };
    });
  }

  function setReviewed(reviewed: boolean) {
    if (!selectedProgram || (reviewed && !canReview)) return;

    setPack((current) => {
      const previous = current[selectedProgram.key]?.[language] || getDefaultState();
      return {
        ...current,
        [selectedProgram.key]: {
          ...(current[selectedProgram.key] || {}),
          [language]: {
            ...previous,
            reviewed,
            published: reviewed ? previous.published : false,
          },
        },
      };
    });
  }

  function setPublished(published: boolean) {
    if (!selectedProgram || !canReview || !selectedState.reviewed) return;

    setPack((current) => {
      const previous = current[selectedProgram.key]?.[language] || getDefaultState();
      return {
        ...current,
        [selectedProgram.key]: {
          ...(current[selectedProgram.key] || {}),
          [language]: {
            ...previous,
            published,
          },
        },
      };
    });
  }

  async function saveSelected() {
    if (!supabase || !selectedProgram) {
      setError("اختر برنامجاً أولاً.");
      return;
    }

    const hasAnyTranslation = programFields.some((field) => Boolean(selectedState.values[field.key]?.trim()));
    if (!hasAnyTranslation) {
      setError("أدخل ترجمة واحدة على الأقل قبل الحفظ.");
      return;
    }

    if (selectedState.reviewed && !canReview) {
      setError("لا يمكن اعتبار الترجمة مراجعة قبل اكتمال المصدر العربي والحقول السبعة للغة المختارة.");
      return;
    }

    const reviewed = Boolean(selectedState.reviewed && canReview);
    const published = Boolean(selectedState.published && reviewed && canReview);
    const status = published ? "published" : reviewed ? "reviewed" : "needs_review";
    const now = new Date().toISOString();

    const rows = programFields
      .filter((field) => Boolean(getSourceValue(selectedProgram, field.key).trim()))
      .map((field) => ({
        source_type: "programs",
        source_id: selectedProgram.id,
        field_name: field.key,
        language,
        translated_value: selectedState.values[field.key] || "",
        status,
        reviewed,
        is_published: published,
        created_by: adminEmail,
        updated_by: adminEmail,
        updated_at: now,
      }));

    if (rows.length === 0) {
      setError("لا توجد حقول عربية صالحة لحفظ ترجمتها.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    const { error: saveError } = await adminBoundaryMutation("pr116_translations_programs_page_entity_content_translations_upsert", { values: rows, filters: [], select: undefined, returnMode: "many", options: {
      onConflict: "source_type,source_id,field_name,language",
    } });

    setIsSaving(false);

    if (saveError) {
      setError(`تعذر حفظ الترجمة: ${saveError.message}`);
      return;
    }

    setPack((current) => ({
      ...current,
      [selectedProgram.key]: {
        ...(current[selectedProgram.key] || {}),
        [language]: {
          ...selectedState,
          reviewed,
          published,
        },
      },
    }));

    setMessage(
      published
        ? "تم حفظ ونشر الحقول السبعة للبرنامج. ستظهر هذه اللغة للعامة فقط عندما تكون القراءة العامة مكتملة أيضاً."
        : reviewed
          ? "تم حفظ الترجمة بحالة مكتمل ومراجع. يمكنك نشرها عند تأكيد المراجعة النهائية."
          : "تم حفظ الترجمة بحالة تحتاج مراجعة. لن تظهر للعامة قبل اكتمال الحقول السبعة والمراجعة والنشر."
    );
  }

  if (isCheckingAccess || isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">
          جاري تجهيز لوحة ترجمة البرامج...
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
            <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-2 text-sm font-bold text-fuchsia-100">
              Program Translation Review
            </div>
            <h1 className="text-4xl font-black md:text-5xl">ترجمة البرامج الموحدة</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              إدارة الحقول السبعة لكل برنامج من مكان واحد. لا يمكن اعتبار أي لغة مراجعة أو نشرها قبل اكتمال الأصل العربي والترجمة الكاملة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">
              لوحة الترجمات العامة
            </Link>
            <Link href="/admin/translations/program-details" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">
              لوحة التفاصيل السابقة
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-sm text-white/55">إجمالي البرامج</div>
            <div className="mt-2 text-3xl font-black">{programs.length}</div>
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
          {languageOptions.map((option) => {
            const active = language === option.code;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => setLanguage(option.code)}
                className={`rounded-full border px-6 py-3 font-bold transition ${active ? "border-fuchsia-300/70 bg-fuchsia-500/20 text-white" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-fuchsia-300/35"}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <label className="text-sm font-bold text-white/70">البحث في البرامج</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="اسم البرنامج أو الرابط المختصر"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-fuchsia-300/60"
            />

            <div className="mt-5 grid gap-3">
              {filteredPrograms.map((program) => {
                const state = pack[program.key]?.[language] || getDefaultState();
                const active = selectedProgram?.key === program.key;
                return (
                  <button
                    key={program.key}
                    type="button"
                    onClick={() => {
                      setSelectedKey(program.key);
                      setMessage("");
                      setError("");
                    }}
                    className={`rounded-2xl border p-4 text-right transition ${active ? "border-fuchsia-300/70 bg-fuchsia-500/15" : "border-white/10 bg-black/20 hover:border-fuchsia-300/35"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-black">{program.name}</span>
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${getStatusClass(program, state)}`}>
                        {getCompletion(state)}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-white/45">{program.slug || "بدون رابط مختصر"}</div>
                    <div className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${getStatusClass(program, state)}`}>
                      {getStatusLabel(program, state)}
                    </div>
                  </button>
                );
              })}

              {filteredPrograms.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/50">لا توجد برامج مطابقة للبحث.</div>}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-7">
            {!selectedProgram ? (
              <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/55">اختر برنامجاً لبدء المراجعة.</div>
            ) : (
              <>
                <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-3xl font-black">{selectedProgram.name}</h2>
                    <p className="mt-2 text-white/55">{selectedProgram.slug ? `/${selectedProgram.slug}` : "بدون رابط مختصر"}</p>
                  </div>
                  <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(selectedProgram, selectedState)}`}>
                    {getStatusLabel(selectedProgram, selectedState)} — {selectedCompletion}%
                  </div>
                </div>

                {!sourceReady && (
                  <div className="mt-6 rounded-3xl border border-red-400/30 bg-red-500/10 p-5 text-red-100">
                    يوجد حقل عربي أصلي ناقص في هذا البرنامج. يمكنك الاطلاع على الحقول المتاحة، لكن لا يمكن اعتبار الترجمة مراجعة أو نشرها حتى يكتمل المصدر العربي في إدارة البرامج.
                  </div>
                )}

                <div className="mt-6 space-y-5">
                  {programFields.map((field) => {
                    const sourceValue = getSourceValue(selectedProgram, field.key);
                    const sourceMissing = !sourceValue.trim();
                    return (
                      <div key={field.key} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-xl font-black">{field.label}</h3>
                            <p className="mt-1 text-sm text-white/50">{field.helper}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${sourceMissing ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-white/10 bg-white/[0.04] text-white/65"}`}>
                            {sourceMissing ? "الأصل العربي غير متوفر" : "الأصل العربي متوفر"}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-4 xl:grid-cols-2">
                          <div>
                            <div className="mb-2 text-sm font-bold text-purple-100/80">العربية — المصدر</div>
                            <textarea
                              value={sourceValue}
                              readOnly
                              rows={field.key === "content" || field.key === "faq" ? 8 : 5}
                              className="w-full resize-y rounded-2xl border border-white/10 bg-black/35 p-4 leading-7 text-white/70 outline-none"
                            />
                          </div>
                          <div>
                            <div className="mb-2 text-sm font-bold text-fuchsia-100/90">{language === "en" ? "English" : "Türkçe"} — الترجمة</div>
                            <textarea
                              dir="ltr"
                              value={selectedState.values[field.key] || ""}
                              onChange={(event) => updateText(field.key, event.target.value)}
                              disabled={sourceMissing}
                              rows={field.key === "content" || field.key === "faq" ? 8 : 5}
                              placeholder={sourceMissing ? "أكمل الأصل العربي أولاً" : "أدخل الترجمة هنا"}
                              className="w-full resize-y rounded-2xl border border-white/10 bg-black/35 p-4 leading-7 text-white outline-none placeholder:text-white/35 focus:border-fuchsia-300/60 disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xl font-black">المراجعة والنشر</div>
                  <p className="mt-2 leading-7 text-white/60">
                    كل تعديل يعيد الحالة إلى تحتاج مراجعة. لا يتم نشر أي نص تلقائياً، ولا تظهر اللغة للعامة قبل اكتمال الحقول السبعة واستيفاء قارئ الموقع لشروطه.
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${canReview ? "border-cyan-400/25 bg-cyan-500/10" : "border-white/10 bg-white/[0.03] opacity-60"}`}>
                      <input
                        type="checkbox"
                        checked={selectedState.reviewed}
                        disabled={!canReview}
                        onChange={(event) => setReviewed(event.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        <span className="block font-black">تمت المراجعة النهائية</span>
                        <span className="mt-1 block text-sm leading-6 text-white/60">يتطلب اكتمال المصدر العربي والترجمة الكاملة للحقول السبعة.</span>
                      </span>
                    </label>

                    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${canReview && selectedState.reviewed ? "border-green-400/25 bg-green-500/10" : "border-white/10 bg-white/[0.03] opacity-60"}`}>
                      <input
                        type="checkbox"
                        checked={selectedState.published}
                        disabled={!canReview || !selectedState.reviewed}
                        onChange={(event) => setPublished(event.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        <span className="block font-black">نشر هذه اللغة</span>
                        <span className="mt-1 block text-sm leading-6 text-white/60">النشر يتطلب أن تكون الترجمة كاملة ومراجعة أولاً.</span>
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void saveSelected()}
                    className="mt-6 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 text-lg font-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
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
