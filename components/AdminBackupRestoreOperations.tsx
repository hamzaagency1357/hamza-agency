"use client";

import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Backup = {
  id: number;
  backup_code: string | null;
  created_at: string;
  mode: string | null;
  status: string | null;
  scope: string[] | null;
  checksum: string | null;
  details: unknown;
};

type Validation = {
  valid: boolean;
  operation_id: string;
  summary: Record<string, { before: number; backup: number; delta: number }>;
  scope: string[];
  checksum: string;
};

const scopeOptions = [
  { value: "settings", label: "إعدادات الموقع" },
  { value: "pages", label: "الصفحات" },
  { value: "sections", label: "أقسام الصفحات" },
  { value: "page_builder_sections", label: "محتوى منشئ الصفحات" },
  { value: "content_translations", label: "ترجمات المحتوى" },
  { value: "programs", label: "البرامج" },
  { value: "announcements", label: "الإعلانات" },
  { value: "jobs", label: "الوظائف" },
  { value: "reviews", label: "التقييمات" },
  { value: "success_stories", label: "قصص النجاح" },
  { value: "partners", label: "الشركاء" },
  { value: "gallery_items", label: "المعرض" },
  { value: "faqs", label: "الأسئلة الشائعة" },
  { value: "knowledge_base", label: "قاعدة المعرفة" },
  { value: "media", label: "الوسائط والصور" },
] as const;

const scopeLabel = new Map(scopeOptions.map((item) => [item.value, item.label]));
const restoreConfirmation = "استعادة العناصر المحددة";

const statusLabels: Record<string, string> = {
  completed: "مكتملة",
  success: "مكتملة",
  completed_with_warnings: "مكتملة مع تنبيه",
  pending: "قيد الانتظار",
  running: "قيد التنفيذ",
  failed: "فشلت",
  error: "تعذر إكمالها",
};

const modeLabels: Record<string, string> = {
  manual: "يدوية",
  automatic: "تلقائية",
  scheduled: "مجدولة",
  pre_restore: "قبل الاستعادة",
};

function getStatusLabel(value: string | null) {
  if (!value) return "غير محددة";
  return statusLabels[value] || "حالة مسجلة";
}

function getModeLabel(value: string | null) {
  if (!value) return "غير محدد";
  return modeLabels[value] || "نسخة احتياطية";
}

export default function AdminBackupRestoreOperations() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [selectedScope, setSelectedScope] = useState<string[]>([
    "settings",
    "pages",
    "sections",
    "content_translations",
  ]);
  const [filePayload, setFilePayload] = useState<Record<string, unknown> | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOne, setConfirmOne] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    void (async () => {
      const access = await requireAdminModuleAccess("backups");
      if (!access.isAuthorized) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }
      setAuthorized(true);
    })();
  }, [router]);

  useEffect(() => {
    if (authorized) void load();
  }, [authorized]);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const result = await supabase
      .from("backups")
      .select("id,backup_code,created_at,mode,status,scope,checksum,details")
      .order("created_at", { ascending: false })
      .limit(100);
    setBackups((result.data || []) as Backup[]);
    setLoading(false);
  }

  function toggle(scope: string) {
    setSelectedScope((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
    setValidation(null);
    setConfirmOne(false);
    setConfirmText("");
  }

  async function createBackup() {
    if (!supabase || !selectedScope.length) return;
    setBusy(true);
    setMessage("");
    const result = await adminBoundaryMutation("pr116_admin_backup_create", {
      args: {
        p_scope: selectedScope,
        p_mode: "manual",
        p_notes: "Created from Admin backup operations",
      },
    });
    setBusy(false);
    if (result.error) {
      setMessage("تعذر إنشاء النسخة الاحتياطية. تحقق من صلاحيتك وحاول مرة أخرى.");
      return;
    }
    setMessage("تم إنشاء النسخة الاحتياطية بنجاح.");
    await load();
  }

  async function readFile(file: File) {
    setMessage("");
    setValidation(null);
    setConfirmOne(false);
    setConfirmText("");
    if (file.size > 25 * 1024 * 1024) {
      setMessage("حجم ملف النسخة يتجاوز الحد المسموح.");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      setFilePayload(parsed);
      setMessage("تم تحميل ملف النسخة. افحصه أولًا قبل السماح بالاستعادة.");
    } catch {
      setFilePayload(null);
      setMessage("تعذر قراءة ملف النسخة. اختر ملف نسخة احتياطية صالحًا.");
    }
  }

  async function dryRun() {
    if (!supabase || !filePayload || !selectedScope.length) return;
    setBusy(true);
    setMessage("");
    const result = await adminBoundaryMutation<Validation>("pr116_admin_backup_dry_run", {
      args: { p_backup: filePayload, p_scope: selectedScope },
    });
    setBusy(false);
    if (result.error) {
      setValidation(null);
      setMessage("لم يجتز ملف النسخة فحص السلامة. راجع الملف والنطاق المحدد ثم حاول مرة أخرى.");
      return;
    }
    setValidation(result.data as Validation);
    setMessage("تم التحقق من توافق النسخة وسلامتها. لم يتم تغيير أي بيانات.");
  }

  async function restore() {
    if (
      !supabase ||
      !filePayload ||
      !validation ||
      !confirmOne ||
      confirmText.trim() !== restoreConfirmation
    )
      return;

    setBusy(true);
    setMessage("");
    const result = await adminBoundaryMutation("pr116_admin_backup_restore", {
      args: { p_backup: filePayload, p_scope: selectedScope },
    });
    setBusy(false);
    if (result.error) {
      setMessage("تعذر إكمال الاستعادة. لم يتم تأكيد نجاح العملية؛ راجع الحالة قبل إعادة المحاولة.");
      return;
    }
    setMessage("اكتملت استعادة العناصر المحددة، وتم إنشاء نسخة احتياطية قبل العملية.");
    setValidation(null);
    setConfirmOne(false);
    setConfirmText("");
    await load();
  }

  function download(backup: Backup) {
    if (!backup.details) return;
    const blob = new Blob([JSON.stringify(backup.details, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${backup.backup_code || "hamza-backup"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = useMemo(
    () =>
      validation
        ? Object.values(validation.summary).reduce((sum, item) => sum + item.backup, 0)
        : 0,
    [validation]
  );

  if (!authorized || loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-8 text-white">
        جارٍ تحميل النسخ الاحتياطية...
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#070009] p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-purple-300">حماية البيانات</p>
            <h1 className="mt-2 text-4xl font-black">النسخ الاحتياطي والاستعادة</h1>
            <p className="mt-2 max-w-2xl leading-7 text-white/55">
              أنشئ نسخة من البيانات المحددة أو افحص نسخة موجودة قبل استعادتها. الاستعادة قد تستبدل بيانات حالية ضمن النطاق المختار.
            </p>
          </div>
          <Link href="/admin" className="rounded-full border border-white/10 px-5 py-3">
            لوحة التحكم
          </Link>
        </div>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6">
          <h2 className="text-2xl font-black">ما الذي تريد تضمينه؟</h2>
          <p className="mt-2 text-sm leading-7 text-white/50">
            اختر فقط الأقسام التي تحتاج إلى نسخها أو استعادتها.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {scopeOptions.map((scope) => (
              <button
                key={scope.value}
                type="button"
                aria-pressed={selectedScope.includes(scope.value)}
                onClick={() => toggle(scope.value)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  selectedScope.includes(scope.value) ? "bg-purple-600" : "bg-white/10"
                }`}
              >
                {scope.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || !selectedScope.length}
            onClick={() => void createBackup()}
            className="mt-5 rounded-full bg-green-600 px-6 py-3 font-black disabled:opacity-40"
          >
            {busy ? "جارٍ التنفيذ..." : "إنشاء نسخة احتياطية الآن"}
          </button>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6">
            <h2 className="text-2xl font-black">فحص نسخة قبل الاستعادة</h2>
            <p className="mt-2 text-sm leading-7 text-white/50">
              ارفع ملف النسخة ثم شغّل الفحص. هذه الخطوة لا تغيّر البيانات.
            </p>
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold text-white/70">ملف النسخة الاحتياطية</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(file);
                }}
                className="block w-full rounded-2xl border border-white/10 p-4"
              />
            </label>
            <button
              type="button"
              disabled={busy || !filePayload || !selectedScope.length}
              onClick={() => void dryRun()}
              className="mt-5 rounded-full bg-yellow-400 px-6 py-3 font-black text-black disabled:opacity-40"
            >
              فحص سلامة النسخة
            </button>

            {validation && (
              <div className="mt-5 rounded-2xl border border-green-400/30 bg-green-500/10 p-4">
                <p className="font-black text-green-100">النسخة صالحة للفحص — {totals} سجل ضمن النطاق</p>
                <div className="mt-3 max-h-64 overflow-auto text-sm">
                  {Object.entries(validation.summary).map(([name, value]) => (
                    <p key={name} className="py-1">
                      {scopeLabel.get(name) || "قسم بيانات"}: الحالي {value.before} / النسخة {value.backup} / الفرق {value.delta}
                    </p>
                  ))}
                </div>
                <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">
                  <summary className="cursor-pointer font-bold text-white/70">تفاصيل تقنية</summary>
                  <div className="mt-3 space-y-1" dir="ltr">
                    <p>Operation: {validation.operation_id}</p>
                    <p>Checksum: {validation.checksum}</p>
                  </div>
                </details>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-red-400/20 bg-red-500/[.06] p-6">
            <h2 className="text-2xl font-black">استعادة العناصر المحددة</h2>
            <p className="mt-3 leading-7 text-white/65">
              عملية حساسة: ستؤثر على البيانات الحالية داخل الأقسام المختارة. لا تبدأها إلا بعد نجاح فحص النسخة ومراجعة المقارنة أعلاه.
            </p>
            <div className="mt-4 rounded-2xl border border-red-300/25 bg-red-500/10 p-4 text-sm leading-7 text-red-50">
              قبل الاستعادة ينشئ النظام نسخة احتياطية تلقائيًا. مع ذلك، تأكد من اختيار النطاق الصحيح لأن التغييرات قد تستبدل بيانات حالية.
            </div>
            <label className="mt-5 flex gap-3">
              <input
                type="checkbox"
                checked={confirmOne}
                onChange={(event) => setConfirmOne(event.target.checked)}
              />
              <span>راجعت المقارنة وأفهم أن الاستعادة ستغيّر البيانات في الأقسام المحددة.</span>
            </label>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm text-white/65">
                للتأكيد اكتب: <strong className="text-white">{restoreConfirmation}</strong>
              </span>
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={restoreConfirmation}
                className="w-full rounded-2xl border border-red-400/30 bg-black/30 p-4"
              />
            </label>
            <button
              type="button"
              disabled={
                busy ||
                !validation ||
                !confirmOne ||
                confirmText.trim() !== restoreConfirmation
              }
              onClick={() => void restore()}
              className="mt-5 rounded-full bg-red-600 px-6 py-3 font-black disabled:opacity-40"
            >
              تنفيذ الاستعادة
            </button>
          </div>
        </section>

        {message && (
          <p role="status" aria-live="polite" className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-4">
            {message}
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-2xl font-black">النسخ السابقة</h2>
          {backups.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-6 text-center text-white/55">
              لا توجد نسخ احتياطية مسجلة حاليًا.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4"
                >
                  <div>
                    <p className="font-black">{backup.backup_code || `نسخة #${backup.id}`}</p>
                    <p className="mt-1 text-sm text-white/50">
                      {new Date(backup.created_at).toLocaleString("ar")} · {getModeLabel(backup.mode)} · {getStatusLabel(backup.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => download(backup)}
                    className="rounded-full bg-white/10 px-4 py-2 font-bold"
                  >
                    تنزيل النسخة
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
