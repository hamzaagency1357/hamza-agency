"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Language = "en" | "tr";
type Field = "title" | "content";
type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: number;
  active: boolean;
  homepage: boolean;
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
  values: Partial<Record<Field, string>>;
  reviewed: boolean;
  published: boolean;
};
type TranslationPack = Record<string, Partial<Record<Language, TranslationState>>>;

const languages: Array<{ code: Language; label: string }> = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];
const fields: Array<{ key: Field; label: string; helper: string }> = [
  { key: "title", label: "عنوان الإعلان", helper: "العنوان الظاهر أولاً في شريط الإعلان." },
  { key: "content", label: "محتوى الإعلان", helper: "النص الظاهر بعد العنوان." },
];

function emptyState(): TranslationState {
  return { values: {}, reviewed: false, published: false };
}

function getText(row: Record<string, unknown>, key: string, fallback = "") {
  const value = row[key];
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function isComplete(state: TranslationState) {
  return Boolean(state.values.title?.trim() && state.values.content?.trim());
}

function buildPack(items: Announcement[], rows: TranslationRow[]): TranslationPack {
  const next: TranslationPack = {};

  items.forEach((item) => {
    next[item.id] = {};

    languages.forEach(({ code }) => {
      const matchingRows = rows.filter(
        (row) =>
          String(row.source_id ?? "") === item.id &&
          row.language === code &&
          (row.field_name === "title" || row.field_name === "content")
      );
      const values: Partial<Record<Field, string>> = {};

      matchingRows.forEach((row) => {
        if (row.field_name === "title" || row.field_name === "content") {
          values[row.field_name] = row.translated_value || "";
        }
      });

      const complete = Boolean(values.title?.trim() && values.content?.trim());
      const reviewed =
        complete &&
        fields.every((field) =>
          Boolean(matchingRows.find((row) => row.field_name === field.key)?.reviewed)
        );
      const published =
        reviewed &&
        fields.every((field) => {
          const row = matchingRows.find((candidate) => candidate.field_name === field.key);
          return Boolean(row?.is_published || row?.status === "published");
        });

      next[item.id][code] = { values, reviewed, published };
    });
  });

  return next;
}

export default function AnnouncementsTranslationsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [translations, setTranslations] = useState<TranslationPack>({});
  const [selectedId, setSelectedId] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("announcements");

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
    if (isAuthorized) void loadContent();
  }, [isAuthorized]);

  async function loadContent() {
    const client = supabase;
    if (!client) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");
    setError("");

    const [announcementsResult, translationsResult] = await Promise.all([
      client
        .from("announcements")
        .select("id, title, content, priority, is_active, show_on_homepage")
        .order("priority", { ascending: true })
        .limit(300),
      client
        .from("content_translations")
        .select("source_id, field_name, language, translated_value, status, reviewed, is_published")
        .eq("source_type", "announcements")
        .in("field_name", ["title", "content"])
        .in("language", ["en", "tr"])
        .limit(2000),
    ]);

    setIsLoading(false);

    if (announcementsResult.error) {
      setError(`تعذر تحميل الإعلانات: ${announcementsResult.error.message}`);
      return;
    }

    const loadedAnnouncements = ((announcementsResult.data || []) as Record<string, unknown>[]).map(
      (row, index) => ({
        id: getText(row, "id", `announcement-${index}`),
        title: getText(row, "title", "إعلان بدون عنوان"),
        content: getText(row, "content"),
        priority: Number(row.priority || index + 1),
        active: row.is_active !== false,
        homepage: row.show_on_homepage !== false,
      })
    );

    setAnnouncements(loadedAnnouncements);
    setTranslations(buildPack(loadedAnnouncements, (translationsResult.data || []) as TranslationRow[]));
    setSelectedId((current) => current || loadedAnnouncements[0]?.id || "");

    if (translationsResult.error) {
      setError(`تم تحميل الإعلانات، لكن تعذر تحميل ترجماتها: ${translationsResult.error.message}`);
    }
  }

  const selectedAnnouncement =
    announcements.find((announcement) => announcement.id === selectedId) || announcements[0] || null;
  const selectedState = selectedAnnouncement
    ? translations[selectedAnnouncement.id]?.[language] || emptyState()
    : emptyState();

  const reviewedCount = useMemo(
    () =>
      announcements.filter((announcement) => {
        const state = translations[announcement.id]?.[language] || emptyState();
        return state.reviewed && isComplete(state);
      }).length,
    [announcements, language, translations]
  );

  const publishedCount = useMemo(
    () =>
      announcements.filter((announcement) => {
        const state = translations[announcement.id]?.[language] || emptyState();
        return state.published && state.reviewed && isComplete(state);
      }).length,
    [announcements, language, translations]
  );

  function updateText(field: Field, value: string) {
    if (!selectedAnnouncement) return;

    setTranslations((current) => {
      const previous = current[selectedAnnouncement.id]?.[language] || emptyState();

      return {
        ...current,
        [selectedAnnouncement.id]: {
          ...(current[selectedAnnouncement.id] || {}),
          [language]: {
            values: { ...previous.values, [field]: value },
            reviewed: false,
            published: false,
          },
        },
      };
    });
  }

  function updateReviewed(value: boolean) {
    if (!selectedAnnouncement || (value && !isComplete(selectedState))) return;

    setTranslations((current) => {
      const previous = current[selectedAnnouncement.id]?.[language] || emptyState();

      return {
        ...current,
        [selectedAnnouncement.id]: {
          ...(current[selectedAnnouncement.id] || {}),
          [language]: {
            ...previous,
            reviewed: value,
            published: value ? previous.published : false,
          },
        },
      };
    });
  }

  function updatePublished(value: boolean) {
    if (!selectedAnnouncement || !selectedState.reviewed || !isComplete(selectedState)) return;

    setTranslations((current) => {
      const previous = current[selectedAnnouncement.id]?.[language] || emptyState();

      return {
        ...current,
        [selectedAnnouncement.id]: {
          ...(current[selectedAnnouncement.id] || {}),
          [language]: { ...previous, published: value },
        },
      };
    });
  }

  async function saveTranslation() {
    const client = supabase;
    if (!client || !selectedAnnouncement) return;

    if (!selectedState.values.title?.trim() && !selectedState.values.content?.trim()) {
      setError("أدخل ترجمة واحدة على الأقل قبل الحفظ.");
      return;
    }

    if (selectedState.reviewed && !isComplete(selectedState)) {
      setError("لا يمكن اعتماد المراجعة قبل اكتمال العنوان والمحتوى.");
      return;
    }

    const reviewed = Boolean(selectedState.reviewed && isComplete(selectedState));
    const published = Boolean(selectedState.published && reviewed && isComplete(selectedState));
    const status = published ? "published" : reviewed ? "reviewed" : "needs_review";

    setIsSaving(true);
    setMessage("");
    setError("");

    const { error: saveError } = await client.from("content_translations").upsert(
      fields.map((field) => ({
        source_type: "announcements",
        source_id: selectedAnnouncement.id,
        field_name: field.key,
        language,
        translated_value: selectedState.values[field.key] || "",
        status,
        reviewed,
        is_published: published,
        created_by: adminEmail,
        updated_by: adminEmail,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "source_type,source_id,field_name,language" }
    );

    setIsSaving(false);

    if (saveError) {
      setError(`تعذر حفظ الترجمة: ${saveError.message}`);
      return;
    }

    setMessage(
      published
        ? "تم حفظ الإعلان ونشره يدوياً."
        : reviewed
          ? "تم الحفظ بحالة مراجع. لن يظهر للعامة قبل النشر اليدوي."
          : "تم الحفظ بحالة تحتاج مراجعة."
    );
    await loadContent();
  }

  if (isCheckingAccess || isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">
          جاري تجهيز ترجمة الإعلانات...
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
              Announcements translations
            </div>
            <h1 className="text-4xl font-black md:text-5xl">مراجعة ونشر ترجمات الإعلانات</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              لا يظهر الإعلان EN/TR إلا بعد اكتمال العنوان والمحتوى ومراجعتهما ونشرهما يدوياً.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/translations/automation"
              className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 font-bold text-fuchsia-100"
            >
              ترجمة دفعة مراقبة
            </Link>
            <Link
              href="/admin/announcements"
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75"
            >
              إدارة الإعلانات
            </Link>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Stat label="إجمالي الإعلانات" value={announcements.length} />
          <Stat label={`مراجعة (${language})`} value={reviewedCount} />
          <Stat label={`منشورة (${language})`} value={publishedCount} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.5fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex gap-2">
              {languages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  className={`flex-1 rounded-2xl px-4 py-3 font-bold ${
                    language === item.code
                      ? "bg-yellow-500/20 text-yellow-100"
                      : "bg-black/20 text-white/65"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              {announcements.map((announcement) => {
                const state = translations[announcement.id]?.[language] || emptyState();
                const complete = isComplete(state);
                const status =
                  state.published && state.reviewed && complete
                    ? "منشور"
                    : state.reviewed && complete
                      ? "مراجع"
                      : complete
                        ? "جاهز"
                        : "يحتاج ترجمة";

                return (
                  <button
                    key={announcement.id}
                    type="button"
                    onClick={() => setSelectedId(announcement.id)}
                    className={`rounded-2xl border p-4 text-right ${
                      selectedAnnouncement?.id === announcement.id
                        ? "border-yellow-300/60 bg-yellow-500/10"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="font-black">{announcement.title}</div>
                    <div className="mt-2 flex justify-between text-xs text-white/55">
                      <span>الأولوية {announcement.priority}</span>
                      <span>{status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            {selectedAnnouncement ? (
              <>
                <div className="mb-6">
                  <div className="text-sm font-bold text-yellow-100">
                    {language === "en" ? "English" : "Türkçe"}
                  </div>
                  <h2 className="mt-2 text-3xl font-black">{selectedAnnouncement.title}</h2>
                  <p className="mt-3 text-white/60">
                    أي تعديل يعيد الإعلان إلى حالة تحتاج مراجعة، ولا يوجد نشر تلقائي.
                  </p>
                </div>

                <div className="grid gap-5">
                  {fields.map((field) => (
                    <label
                      key={field.key}
                      className="block rounded-3xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="mb-3">
                        <div className="font-black">{field.label}</div>
                        <div className="mt-1 text-sm text-white/55">{field.helper}</div>
                      </div>
                      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-7 text-white/70">
                        {field.key === "title" ? selectedAnnouncement.title : selectedAnnouncement.content}
                      </div>
                      <textarea
                        value={selectedState.values[field.key] || ""}
                        onChange={(event) => updateText(field.key, event.target.value)}
                        className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-[#070009] p-4 text-white outline-none focus:border-yellow-300/60"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-2">
                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selectedState.reviewed}
                      disabled={!isComplete(selectedState)}
                      onChange={(event) => updateReviewed(event.target.checked)}
                      className="mt-1 h-5 w-5 accent-yellow-500"
                    />
                    <span>
                      <strong className="block">تمت المراجعة</strong>
                      <span className="mt-1 block text-sm text-white/55">
                        يتطلب اكتمال العنوان والمحتوى.
                      </span>
                    </span>
                  </label>

                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selectedState.published}
                      disabled={!isComplete(selectedState) || !selectedState.reviewed}
                      onChange={(event) => updatePublished(event.target.checked)}
                      className="mt-1 h-5 w-5 accent-green-500"
                    />
                    <span>
                      <strong className="block">نشر يدوي للعامة</strong>
                      <span className="mt-1 block text-sm text-white/55">لا يوجد نشر تلقائي.</span>
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => void saveTranslation()}
                  disabled={isSaving}
                  className="mt-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 px-7 py-4 font-black text-black disabled:opacity-60"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ حالة الترجمة"}
                </button>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/60">
                لا توجد إعلانات حالياً.
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-sm text-white/55">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}
