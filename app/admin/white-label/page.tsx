"use client";


import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Tone = "purple" | "green" | "yellow" | "red" | "cyan";

type WhiteLabelDraft = {
  agencyName: string;
  ownerName: string;
  ownerEmail: string;
  domain: string;
  defaultLanguage: string;
  enabledLanguages: string[];
  primaryColor: string;
  accentColor: string;
  status: string;
  packageType: string;
  notes: string;
  checklist: Record<string, boolean>;
};

type WhiteLabelProjectRow = {
  id: string;
  agency_name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  domain: string | null;
  default_language: string | null;
  enabled_languages: string[] | null;
  primary_color: string | null;
  accent_color: string | null;
  package_type: string | null;
  status: string | null;
  notes: string | null;
  checklist: Record<string, boolean> | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const STORAGE_KEY = "hamza_white_label_setup_v1";

const checklistItems = [
  { key: "identity", label: "تحديد اسم وهوية الوكالة" },
  { key: "domain", label: "تجهيز الدومين وربطه" },
  { key: "colors", label: "اختيار ألوان النسخة" },
  { key: "languages", label: "تحديد اللغات المطلوبة" },
  { key: "admin", label: "إنشاء حساب الإدارة الأساسي" },
  { key: "content", label: "مراجعة المحتوى قبل التسليم" },
  { key: "backup", label: "تجهيز نسخة احتياطية قبل التسليم" },
  { key: "handoff", label: "تسليم بيانات الدخول للعميل" },
];

const defaultDraft: WhiteLabelDraft = {
  agencyName: "",
  ownerName: "",
  ownerEmail: "",
  domain: "",
  defaultLanguage: "ar",
  enabledLanguages: ["ar", "en", "tr"],
  primaryColor: "#09000f",
  accentColor: "#d4af37",
  status: "draft",
  packageType: "standard",
  notes: "",
  checklist: Object.fromEntries(checklistItems.map((item) => [item.key, false])),
};

function normalizeDraft(value: Partial<WhiteLabelDraft>): WhiteLabelDraft {
  return {
    ...defaultDraft,
    ...value,
    enabledLanguages:
      Array.isArray(value.enabledLanguages) && value.enabledLanguages.length > 0
        ? value.enabledLanguages
        : defaultDraft.enabledLanguages,
    checklist: {
      ...defaultDraft.checklist,
      ...(value.checklist || {}),
    },
  };
}

function safeParse(value: string | null): WhiteLabelDraft {
  if (!value) return defaultDraft;
  try {
    return normalizeDraft(JSON.parse(value) as Partial<WhiteLabelDraft>);
  } catch {
    return defaultDraft;
  }
}

function rowToDraft(row: WhiteLabelProjectRow): WhiteLabelDraft {
  return normalizeDraft({
    agencyName: row.agency_name || "",
    ownerName: row.owner_name || "",
    ownerEmail: row.owner_email || "",
    domain: row.domain || "",
    defaultLanguage: row.default_language || "ar",
    enabledLanguages: row.enabled_languages || defaultDraft.enabledLanguages,
    primaryColor: row.primary_color || defaultDraft.primaryColor,
    accentColor: row.accent_color || defaultDraft.accentColor,
    status: row.status || "draft",
    packageType: row.package_type || "standard",
    notes: row.notes || "",
    checklist: row.checklist || defaultDraft.checklist,
  });
}

function draftToPayload(draft: WhiteLabelDraft, adminEmail: string) {
  return {
    agency_name: draft.agencyName.trim(),
    owner_name: draft.ownerName.trim(),
    owner_email: draft.ownerEmail.trim(),
    domain: draft.domain.trim(),
    default_language: draft.defaultLanguage,
    enabled_languages: draft.enabledLanguages,
    primary_color: draft.primaryColor,
    accent_color: draft.accentColor,
    package_type: draft.packageType,
    status: draft.status,
    notes: draft.notes.trim(),
    checklist: draft.checklist,
    updated_by: adminEmail || null,
  };
}

export default function AdminWhiteLabelPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState("احتياطي محلي");
  const [draft, setDraft] = useState<WhiteLabelDraft>(defaultDraft);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }

      const email = access.profile.email || access.user?.email || "";
      setAdminEmail(email);
      setIsAuthorized(true);
      setIsCheckingAuth(false);

      const localDraft = safeParse(window.localStorage.getItem(STORAGE_KEY));
      setDraft(localDraft);

      if (!isSupabaseConfigured || !supabase) {
        setStorageMode("احتياطي محلي — Supabase غير مهيأ");
        return;
      }

      setIsLoadingProject(true);
      const { data, error } = await supabase
        .from("white_label_projects")
        .select("id, agency_name, owner_name, owner_email, domain, default_language, enabled_languages, primary_color, accent_color, package_type, status, notes, checklist, is_active, created_at, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setIsLoadingProject(false);

      if (error) {
        setStorageMode("احتياطي محلي — تعذر قراءة Supabase");
        setErrorMessage(`تعذر تحميل White Label من Supabase: ${error.message}`);
        return;
      }

      if (data) {
        const remoteDraft = rowToDraft(data as WhiteLabelProjectRow);
        setProjectId((data as WhiteLabelProjectRow).id);
        setDraft(remoteDraft);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteDraft));
        setStorageMode("Supabase دائم");
      } else {
        setStorageMode("Supabase دائم — لا يوجد سجل بعد");
      }
    }

    checkAccess();
  }, [router]);

  const completion = useMemo(() => {
    const done = checklistItems.filter((item) => draft.checklist?.[item.key]).length;
    return Math.round((done / checklistItems.length) * 100);
  }, [draft.checklist]);

  function updateDraft<K extends keyof WhiteLabelDraft>(key: K, value: WhiteLabelDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage("");
    setErrorMessage("");
  }

  function toggleLanguage(language: string) {
    setDraft((current) => {
      const exists = current.enabledLanguages.includes(language);
      const enabledLanguages = exists
        ? current.enabledLanguages.filter((item) => item !== language)
        : [...current.enabledLanguages, language];
      return { ...current, enabledLanguages };
    });
    setMessage("");
    setErrorMessage("");
  }

  function toggleChecklist(key: string) {
    setDraft((current) => ({
      ...current,
      checklist: { ...current.checklist, [key]: !current.checklist?.[key] },
    }));
    setMessage("");
    setErrorMessage("");
  }

  async function saveDraft() {
    setMessage("");
    setErrorMessage("");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    if (!isSupabaseConfigured || !supabase) {
      setStorageMode("احتياطي محلي — Supabase غير مهيأ");
      setMessage("تم حفظ نسخة احتياطية محلية فقط لأن Supabase غير مهيأ.");
      return;
    }

    setIsSaving(true);

    const payload = draftToPayload(draft, adminEmail);
    const result = projectId
      ? await adminBoundaryMutation("pr116_white_label_page_entity_white_label_projects_update", { values: payload, filters: [{ op: "eq", field: "id", value: projectId }], select: "id, agency_name, owner_name, owner_email, domain, default_language, enabled_languages, primary_color, accent_color, package_type, status, notes, checklist, is_active, created_at, updated_at", returnMode: "maybeSingle", options: undefined })
      : await adminBoundaryMutation("pr116_white_label_page_entity_white_label_projects_insert", { values: { ...payload, created_by: adminEmail || null }, filters: [], select: "id, agency_name, owner_name, owner_email, domain, default_language, enabled_languages, primary_color, accent_color, package_type, status, notes, checklist, is_active, created_at, updated_at", returnMode: "maybeSingle", options: undefined });

    setIsSaving(false);

    if (result.error || !result.data) {
      setStorageMode("احتياطي محلي — فشل حفظ Supabase");
      setErrorMessage(`تم حفظ نسخة احتياطية محلية، لكن فشل حفظ Supabase: ${result.error?.message || "لا توجد بيانات راجعة"}`);
      return;
    }

    const savedRow = result.data as WhiteLabelProjectRow;
    const savedDraft = rowToDraft(savedRow);
    setProjectId(savedRow.id);
    setDraft(savedDraft);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));
    setStorageMode("Supabase دائم");
    setMessage("تم حفظ إعدادات White Label في Supabase مع تحديث النسخة الاحتياطية المحلية.");
  }

  function exportDraft() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `white-label-${draft.agencyName || "agency"}.json`;
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
            <div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
              White Label
            </div>
            <h1 className="text-4xl font-black md:text-5xl">تجهيز نسخة وكالة للبيع</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              لوحة داخلية لتجهيز نسخة وكالة ثانية. الحفظ الأساسي الآن دائم في Supabase، ولا يتم تطبيق أي إعداد على الموقع العام بدون موافقة لاحقة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={saveDraft} disabled={isSaving || isLoadingProject} className="rounded-full bg-gradient-to-r from-yellow-500 to-purple-600 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? "جارٍ الحفظ..." : "حفظ دائم"}
            </button>
            <button onClick={exportDraft} className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              تصدير JSON
            </button>
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

        {isLoadingProject && <div className="mb-6 rounded-3xl border border-purple-400/25 bg-purple-500/10 p-5 text-purple-100">جاري تحميل إعدادات White Label من Supabase...</div>}
        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {errorMessage && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{errorMessage}</div>}

        <div className="mb-8 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-100">
          هذه الصفحة تحفظ تجهيز نسخة White Label فقط. لا تغيّر اسم HAMZA AGENCY أو الشعار أو الألوان العامة ولا تربط دومينات ولا تنشئ نسخ عامة تلقائياً.
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="نسبة الجاهزية" value={completion} suffix="%" tone="green" />
          <StatCard label="بنود مكتملة" value={checklistItems.filter((item) => draft.checklist?.[item.key]).length} tone="cyan" />
          <StatCard label="اللغات" value={draft.enabledLanguages.length} tone="purple" />
          <StatCard label="الحالة" value={draft.status === "ready" ? 100 : draft.status === "review" ? 70 : 30} suffix="%" tone="yellow" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم الوكالة" value={draft.agencyName} onChange={(value) => updateDraft("agencyName", value)} />
              <Field label="اسم صاحب النسخة" value={draft.ownerName} onChange={(value) => updateDraft("ownerName", value)} />
              <Field label="بريد صاحب النسخة" value={draft.ownerEmail} onChange={(value) => updateDraft("ownerEmail", value)} />
              <Field label="الدومين المقترح" value={draft.domain} onChange={(value) => updateDraft("domain", value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-white/70">
                حالة النسخة
                <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="draft">مسودة</option>
                  <option value="review">قيد المراجعة</option>
                  <option value="ready">جاهزة للتسليم</option>
                  <option value="archived">مؤرشفة</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black text-white/70">
                نوع الباقة
                <select value={draft.packageType} onChange={(event) => updateDraft("packageType", event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="اللون الأساسي" type="color" value={draft.primaryColor} onChange={(value) => updateDraft("primaryColor", value)} />
              <Field label="لون التمييز" type="color" value={draft.accentColor} onChange={(value) => updateDraft("accentColor", value)} />
              <label className="grid gap-2 text-sm font-black text-white/70">
                اللغة الافتراضية
                <select value={draft.defaultLanguage} onChange={(event) => updateDraft("defaultLanguage", event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 text-sm font-black text-white/70">اللغات المفعلة</div>
              <div className="flex flex-wrap gap-3">
                {["ar", "en", "tr"].map((language) => (
                  <button key={language} type="button" onClick={() => toggleLanguage(language)} className={`rounded-full border px-5 py-2 text-sm font-black ${draft.enabledLanguages.includes(language) ? "border-green-400/30 bg-green-500/10 text-green-100" : "border-white/10 bg-white/[0.04] text-white/45"}`}>
                    {language.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-black text-white/70">
              ملاحظات التسليم
              <textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} className="min-h-40 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none" />
            </label>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 xl:sticky xl:top-6 xl:self-start">
            <h2 className="text-2xl font-black">Checklist التسليم</h2>
            <div className="mt-5 grid gap-3">
              {checklistItems.map((item) => (
                <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-bold text-white/75">
                  <input type="checkbox" checked={Boolean(draft.checklist?.[item.key])} onChange={() => toggleChecklist(item.key)} className="mt-1" />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-white/70">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-14 rounded-2xl border border-white/10 bg-black/30 px-5 text-white outline-none" />
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
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };
  return classes[tone];
}
