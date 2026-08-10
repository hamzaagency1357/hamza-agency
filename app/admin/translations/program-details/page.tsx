"use client";


import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type DetailField = "requirements" | "benefits" | "updates" | "faq";
type GenericRow = Record<string, unknown>;

type ProgramItem = {
  key: string;
  id: string;
  name: string;
  slug: string;
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
  values: Partial<Record<DetailField, string>>;
  reviewed: boolean;
  published: boolean;
};

type TranslationPack = Record<string, Partial<Record<LanguageCode, TranslationState>>>;

type LoadedTranslation = {
  values: Partial<Record<DetailField, string>>;
  flags: Partial<Record<DetailField, { reviewed: boolean; published: boolean }>>;
};

type LoadedPack = Record<string, Partial<Record<LanguageCode, LoadedTranslation>>>;

const detailFields: Array<{ key: DetailField; label: string; helper: string }> = [
  { key: "requirements", label: "شروط القبول", helper: "المتطلبات والشروط اللازمة للانضمام." },
  { key: "benefits", label: "المزايا", helper: "الدعم والمزايا التي يقدمها البرنامج أو الوكالة." },
  { key: "updates", label: "التحديثات", helper: "آخر الأخبار أو التعليمات الخاصة بالبرنامج." },
  { key: "faq", label: "الأسئلة الشائعة", helper: "أسئلة وأجوبة البرنامج الخاصة." },
];

const languages: Array<{ code: LanguageCode; label: string }> = [
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

function isDetailField(value: string | null): value is DetailField {
  return value === "requirements" || value === "benefits" || value === "updates" || value === "faq";
}

function isLanguage(value: string | null): value is LanguageCode {
  return value === "en" || value === "tr";
}

function getSourceValue(program: ProgramItem, field: DetailField) {
  return program[field] || "";
}

function getActiveFields(program: ProgramItem) {
  return detailFields
    .map((field) => field.key)
    .filter((field) => Boolean(getSourceValue(program, field).trim()));
}

function getDefaultState(): TranslationState {
  return { values: {}, reviewed: false, published: false };
}

function getCompletion(program: ProgramItem, state: TranslationState) {
  const activeFields = getActiveFields(program);
  if (activeFields.length === 0) return 0;

  const completed = activeFields.filter((field) => Boolean(state.values[field]?.trim())).length;
  return Math.round((completed / activeFields.length) * 100);
}

function getStatusLabel(completion: number, reviewed: boolean, published: boolean) {
  if (published && reviewed && completion === 100) return "منشور";
  if (reviewed && completion === 100) return "مكتمل ومراجع";
  if (completion === 100) return "جاهز للمراجعة";
  if (completion > 0) return "ترجمة جزئية";
  return "بانتظار الترجمة";
}

function getStatusClass(completion: number, reviewed: boolean, published: boolean) {
  if (published && reviewed && completion === 100) return "border-green-400/30 bg-green-500/10 text-green-100";
  if (reviewed && completion === 100) return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
  if (completion === 100) return "border-yellow-400/30 bg-yellow-500/10 text-yellow-100";
  if (completion > 0) return "border-orange-400/30 bg-orange-500/10 text-orange-100";
  return "border-red-400/25 bg-red-500/10 text-red-100";
}

function buildTranslationPack(programs: ProgramItem[], rows: TranslationRow[]) {
  const loaded: LoadedPack = {};

  rows.forEach((row) => {
    const sourceId = row.source_id === null || row.source_id === undefined ? "" : String(row.source_id).trim();
    if (!sourceId || !isDetailField(row.field_name) || !isLanguage(row.language)) return;

    const key = makeKey(sourceId);
    loaded[key] = loaded[key] || {};
    loaded[key][row.language] = loaded[key][row.language] || { values: {}, flags: {} };

    const entry = loaded[key][row.language];
    if (!entry) return;

    entry.values[row.field_name] = row.translated_value || "";
    entry.flags[row.field_name] = {
      reviewed: Boolean(row.reviewed),
      published: Boolean(row.is_published || row.status === "published"),
    };
  });

  const pack: TranslationPack = {};

  programs.forEach((program) => {
    const key = program.key;
    pack[key] = {};

    languages.forEach(({ code }) => {
      const raw = loaded[key]?.[code];
      const activeFields = getActiveFields(program);
      const reviewed =
        activeFields.length > 0 &&
        activeFields.every((field) => raw?.flags[field]?.reviewed === true);
      const published =
        reviewed &&
        activeFields.length > 0 &&
        activeFields.every((field) => raw?.flags[field]?.published === true);

      pack[key][code] = {
        values: raw?.values || {},
        reviewed,
        published,
      };
    });
  });

  return pack;
}

export default function ProgramDetailTranslationsPage() {
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
      supabase.from("programs").select("id, name, slug, requirements, benefits, updates, faq").limit(200),
      supabase
        .from("content_translations")
        .select("source_id, field_name, language, translated_value, status, reviewed, is_published")
        .eq("source_type", "programs")
        .in("field_name", detailFields.map((field) => field.key))
        .in("language", ["en", "tr"])
        .limit(2000),
    ]);

    setIsLoading(false);

    if (programsResult.error) {
      setError(`تعذر تحميل بيانات البرامج: ${programsResult.error.message}`);
      return;
    }

    const loadedPrograms = ((programsResult.data || []) as GenericRow[])
      .map((row, index) => {
        const id = getText(row, "id", `program-${index}`);
        return {
          key: makeKey(id),
          id,
          name: getText(row, "name", "برنامج بدون عنوان"),
          slug: getText(row, "slug"),
          requirements: getText(row, "requirements"),
          benefits: getText(row, "benefits"),
          updates: getText(row, "updates"),
          faq: getText(row, "faq"),
        };
      })
      .filter((program) => getActiveFields(program).length > 0);

    setPrograms(loadedPrograms);
    setPack(buildTranslationPack(loadedPrograms, (translationsResult.data || []) as TranslationRow[]));
    setSelectedKey((current) => current || loadedPrograms[0]?.key || "");

    if (translationsResult.error) {
      setError(`تم تحميل البرامج، لكن تعذر تحميل ترجمات التفاصيل: ${translationsResult.error.message}`);
    }
  }

  const filteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return programs;

    return programs.filter((program) =>
      [program.name, program.slug, program.requirements, program.benefits, program.updates, program.faq]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [programs, search]);

  const selectedProgram = filteredPrograms.find((program) => program.key === selectedKey) || filteredPrograms[0] || null;
  const selectedState = selectedProgram ? pack[selectedProgram.key]?.[language] || getDefaultState() : getDefaultState();
  const selectedCompletion = selectedProgram ? getCompletion(selectedProgram, selectedState) : 0;
  const selectedActiveFields = selectedProgram ? getActiveFields(selectedProgram) : [];

  const reviewedCount = programs.filter((program) => {
    const state = pack[program.key]?.[language] || getDefaultState();
    return state.reviewed && getCompletion(program, state) === 100;
  }).length;

  const publishedCount = programs.filter((program) => {
    const state = pack[program.key]?.[language] || getDefaultState();
    return state.published && state.reviewed && getCompletion(program, state) === 100;
  }).length;

  function updateText(field: DetailField, value: string) {
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

  function updateReview(reviewed: boolean) {
    if (!selectedProgram || (reviewed && selectedCompletion !== 100)) return;

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

  function updatePublished(published: boolean) {
    if (!selectedProgram || !selectedState.reviewed || selectedCompletion !== 100) return;

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

    const hasTranslation = selectedActiveFields.some((field) => Boolean(selectedState.values[field]?.trim()));
    if (!hasTranslation) {
      setError("أدخل أو ولّد ترجمة واحدة على الأقل قبل الحفظ.");
      return;
    }

    const reviewed = Boolean(selectedState.reviewed && selectedCompletion === 100);
    const published = Boolean(selectedState.published && reviewed && selectedCompletion === 100);
    const status = published ? "published" : reviewed ? "reviewed" : "needs_review";

    setIsSaving(true);
    setError("");
    setMessage("");

    const rows = selectedActiveFields.map((field) => ({
      source_type: "programs",
      source_id: selectedProgram.id,
      field_name: field,
      language,
      translated_value: selectedState.values[field] || "",
      status,
      reviewed,
      is_published: published,
      created_by: adminEmail,
      updated_by: adminEmail,
    }));

    const { error: saveError } = await adminBoundaryMutation("pr116_translations_program_details_page_entity_content_translations_upsert", { values: rows, filters: [], select: undefined, returnMode: "many", options: { onConflict: "source_type,source_id,field_name,language" } });

    setIsSaving(false);

    if (saveError) {
      setError(`تعذر حفظ ترجمة تفاصيل البرنامج: ${saveError.message}`);
      return;
    }

    setPack((current) => ({
      ...current,
      [selectedProgram.key]: {
        ...(current[selectedProgram.key] || {}),
        [language]: {
          values: selectedState.values,
          reviewed,
          published,
        },
      },
    }));
    setMessage(
      published
        ? "تم الحفظ والنشر. ستظهر الترجمة فقط بعد ربط صفحة التفاصيل بالترجمات المنشورة."
        : reviewed
          ? "تم الحفظ كمراجع. يمكنك نشرها يدوياً عندما تكون جاهزاً."
          : "تم الحفظ للمراجعة فقط ولم تُنشر للعامة."
    );
  }

  if (isCheckingAccess) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
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
              Program Details Review
            </div>
            <h1 className="text-4xl font-black md:text-5xl">مراجعة ترجمة تفاصيل البرامج</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              راجع شروط القبول والمزايا والتحديثات والأسئلة الشائعة لكل برنامج قبل النشر اليدوي.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveSelected}
              disabled={isSaving || !selectedProgram}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ في Supabase"}
            </button>
            <button
              type="button"
              onClick={() => void loadContent()}
              disabled={isLoading}
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75 disabled:opacity-60"
            >
              تحديث البيانات
            </button>
            <Link href="/admin/translations" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الترجمات العامة
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatusCard label="البرامج القابلة للمراجعة" value={programs.length} tone="purple" />
          <StatusCard label="مراجعة كاملة" value={reviewedCount} tone="cyan" />
          <StatusCard label="منشور" value={publishedCount} tone="green" />
          <StatusCard label="المستخدم" value={adminEmail || "—"} tone="neutral" compact />
        </div>

        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <section className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:grid-cols-[220px_1fr]">
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as LanguageCode)}
            className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none"
          >
            {languages.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث باسم البرنامج أو محتوى التفاصيل..."
            className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr]">
          <section className="grid max-h-[75vh] gap-3 overflow-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
            {isLoading && <div className="rounded-2xl bg-black/25 p-5 text-center text-white/55">جاري التحميل...</div>}
            {filteredPrograms.map((program) => {
              const state = pack[program.key]?.[language] || getDefaultState();
              const completion = getCompletion(program, state);
              return (
                <button
                  key={program.key}
                  type="button"
                  onClick={() => setSelectedKey(program.key)}
                  className={`rounded-2xl border p-4 text-right transition ${selectedProgram?.key === program.key ? "border-cyan-300/45 bg-cyan-500/10" : "border-white/10 bg-black/25 hover:border-cyan-300/30"}`}
                >
                  <div className="mb-2 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-purple-100">{program.slug || "program"}</span>
                    <span className={`rounded-full border px-3 py-1 ${getStatusClass(completion, state.reviewed, state.published)}`}>
                      {getStatusLabel(completion, state.reviewed, state.published)} — {completion}%
                    </span>
                  </div>
                  <div className="font-black leading-7">{program.name}</div>
                </button>
              );
            })}
            {filteredPrograms.length === 0 && !isLoading && (
              <div className="rounded-2xl bg-black/25 p-5 text-center text-white/55">لا توجد برامج لديها تفاصيل عربية قابلة للمراجعة.</div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            {!selectedProgram && <div className="p-8 text-center text-white/55">اختر برنامجاً لمراجعة تفاصيله.</div>}
            {selectedProgram && (
              <div className="grid gap-6">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-cyan-100">{selectedProgram.name}</div>
                      <div className="mt-1 text-sm text-white/45">{selectedProgram.slug || "بدون slug"}</div>
                    </div>
                    <span className={`rounded-full border px-4 py-2 text-sm font-black ${getStatusClass(selectedCompletion, selectedState.reviewed, selectedState.published)}`}>
                      {getStatusLabel(selectedCompletion, selectedState.reviewed, selectedState.published)} — {selectedCompletion}%
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/55">
                    تعديل أي نص مترجم يلغي حالة المراجعة والنشر تلقائياً، ويعيده إلى وضع المراجعة لحمايته قبل ظهوره للعامة.
                  </p>
                </div>

                {detailFields
                  .filter((field) => selectedActiveFields.includes(field.key))
                  .map((field) => (
                    <section key={field.key} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                      <div className="mb-4">
                        <h2 className="text-xl font-black">{field.label}</h2>
                        <p className="mt-1 text-sm text-white/45">{field.helper}</p>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="mb-3 text-sm font-black text-purple-100">النص العربي الأصلي</div>
                          <div className="max-h-72 overflow-auto whitespace-pre-wrap leading-8 text-white/70">
                            {getSourceValue(selectedProgram, field.key)}
                          </div>
                        </div>
                        <label className="grid gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.04] p-4 text-sm font-black text-cyan-50">
                          الترجمة — {language === "en" ? "English" : "Türkçe"}
                          <textarea
                            value={selectedState.values[field.key] || ""}
                            onChange={(event) => updateText(field.key, event.target.value)}
                            className="min-h-48 rounded-2xl border border-white/10 bg-black/30 p-4 font-normal leading-7 text-white outline-none"
                            placeholder="اكتب أو الصق الترجمة بعد توليدها من محرك الترجمة..."
                          />
                        </label>
                      </div>
                    </section>
                  ))}

                <section className="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-black text-white/80">
                    <input
                      type="checkbox"
                      checked={selectedState.reviewed}
                      disabled={selectedCompletion !== 100}
                      onChange={(event) => updateReview(event.target.checked)}
                    />
                    تمت مراجعة جميع الحقول المترجمة
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-sm font-black text-green-100">
                    <input
                      type="checkbox"
                      checked={selectedState.published}
                      disabled={!selectedState.reviewed || selectedCompletion !== 100}
                      onChange={(event) => updatePublished(event.target.checked)}
                    />
                    نشر هذه الترجمة بعد المراجعة
                  </label>
                </section>

                {selectedCompletion !== 100 && (
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-100">
                    أكمل ترجمة جميع الحقول العربية الظاهرة أولاً. لن يمكن تفعيل المراجعة أو النشر قبل الوصول إلى 100%.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function StatusCard({ label, value, tone, compact = false }: { label: string; value: string | number; tone: "purple" | "cyan" | "green" | "neutral"; compact?: boolean }) {
  const toneClass = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    neutral: "border-white/10 bg-white/[0.04] text-white/75",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className={`mt-2 font-black ${compact ? "break-all text-base" : "text-3xl"}`}>{value}</div>
    </div>
  );
}
