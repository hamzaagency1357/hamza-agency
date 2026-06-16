"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type ExportStatus = "available" | "protected";
type ExportFormat = "json" | "csv";
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";
type ExportRow = Record<string, unknown>;

type ExportSource = {
  title: string;
  description: string;
  module: string;
  table: string | null;
  formats: string[];
  status: ExportStatus;
  tone: Tone;
  href?: string;
};

const exportSources: ExportSource[] = [
  {
    title: "طلبات الخدمات",
    description: "تصدير طلبات الخدمات ومتابعة سجلاتها التشغيلية من جدول service_requests.",
    module: "service_requests",
    table: "service_requests",
    formats: ["JSON", "CSV"],
    status: "available",
    tone: "green",
    href: "/admin/service-requests",
  },
  {
    title: "طلبات الانضمام",
    description: "تصدير طلبات الانضمام حسب البرنامج والحالة والتاريخ من جدول agency_applications.",
    module: "applications",
    table: "agency_applications",
    formats: ["JSON", "CSV"],
    status: "available",
    tone: "purple",
    href: "/admin/applications",
  },
  {
    title: "طلبات الوظائف",
    description: "تنظيم تصدير طلبات الوظائف وسجلات المرشحين من جدول job_applications.",
    module: "job_applications",
    table: "job_applications",
    formats: ["JSON", "CSV"],
    status: "available",
    tone: "blue",
    href: "/admin/jobs",
  },
  {
    title: "البرامج",
    description: "تصدير بيانات البرامج الظاهرة في الموقع من جدول programs.",
    module: "programs",
    table: "programs",
    formats: ["JSON", "CSV"],
    status: "available",
    tone: "yellow",
    href: "/admin/programs",
  },
  {
    title: "الشركاء",
    description: "تصدير بيانات الشركاء المنشورين من جدول partners.",
    module: "partners",
    table: "partners",
    formats: ["JSON", "CSV"],
    status: "available",
    tone: "yellow",
    href: "/admin/partners",
  },
  {
    title: "التقييمات",
    description: "تصدير ملفات منظمة للمراجعات المنشورة من جدول reviews.",
    module: "reviews",
    table: "reviews",
    formats: ["JSON", "CSV"],
    status: "available",
    tone: "cyan",
    href: "/admin/reviews",
  },
  {
    title: "قصص النجاح",
    description: "تصدير قصص النجاح المنشورة من جدول success_stories.",
    module: "success_stories",
    table: "success_stories",
    formats: ["JSON", "CSV"],
    status: "available",
    tone: "cyan",
    href: "/admin/success-stories",
  },
  {
    title: "إعدادات النظام",
    description: "تصدير إعدادات النظام الحساسة غير مفعّل من Export Center. استخدم Backup System عند الحاجة وبحذر.",
    module: "settings",
    table: null,
    formats: ["محمي"],
    status: "protected",
    tone: "red",
    href: "/admin/settings",
  },
];

const exportPageSize = 1000;
const maxExportPages = 20;

function getStatusLabel(status: ExportStatus) {
  if (status === "protected") return "محمي بالصلاحيات";
  return "تصدير فعلي متاح";
}

function formatDateForFileName() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function csvEscape(value: unknown) {
  const stringValue = stringifyCell(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

function rowsToCsv(rows: ExportRow[]) {
  if (!rows.length) return "";

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];

  return `\uFEFF${lines.join("\n")}`;
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function fetchTableRows(table: string) {
  if (!supabase) {
    return { rows: [] as ExportRow[], error: "الاتصال بقاعدة البيانات غير مفعل." };
  }

  const rows: ExportRow[] = [];

  for (let page = 0; page < maxExportPages; page += 1) {
    const from = page * exportPageSize;
    const to = from + exportPageSize - 1;
    const { data, error } = await supabase.from(table).select("*").range(from, to);

    if (error) {
      return { rows, error: error.message };
    }

    const pageRows = (data || []) as ExportRow[];
    rows.push(...pageRows);

    if (pageRows.length < exportPageSize) break;
  }

  return { rows, error: null as string | null };
}

export default function AdminExportCenterPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [search, setSearch] = useState("");
  const [activeExport, setActiveExport] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("dashboard");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace("/admin/login");
        return;
      }

      if (access.profile.role === "program_admin") {
        setAdminEmail(access.profile.email || access.user?.email || "");
        setIsForbidden(true);
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  const filteredSources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exportSources;

    return exportSources.filter((source) =>
      [source.title, source.description, source.module, source.formats.join(" "), getStatusLabel(source.status)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search]);

  const availableCount = exportSources.filter((source) => source.status === "available").length;
  const protectedCount = exportSources.filter((source) => source.status === "protected").length;

  async function exportSource(source: ExportSource, format: ExportFormat) {
    setMessage("");
    setError("");

    if (source.status === "protected" || !source.table) {
      setError("هذا المصدر محمي ولا يتم تصديره من Export Center.");
      return;
    }

    const confirmed = window.confirm(
      `سيتم تصدير ${source.title}. قد يحتوي الملف بيانات تشغيلية أو معلومات تواصل. احفظ الملف في مكان آمن ولا تشاركه علناً. هل تريد المتابعة؟`
    );

    if (!confirmed) return;

    setActiveExport(`${source.module}-${format}`);
    const { rows, error: exportError } = await fetchTableRows(source.table);
    setActiveExport(null);

    if (exportError) {
      setError(`فشل تصدير ${source.title}: ${exportError}`);
      return;
    }

    const timestamp = formatDateForFileName();

    if (format === "json") {
      const payload = {
        project: "HAMZA AGENCY",
        source: source.module,
        table: source.table,
        exported_at: new Date().toISOString(),
        exported_by: adminEmail,
        rows_count: rows.length,
        rows,
      };

      downloadTextFile(
        `hamza-export-${source.module}-${timestamp}.json`,
        JSON.stringify(payload, null, 2),
        "application/json;charset=utf-8"
      );
      setMessage(`تم تصدير ${source.title} بصيغة JSON. عدد الصفوف: ${rows.length}.`);
      return;
    }

    downloadTextFile(
      `hamza-export-${source.module}-${timestamp}.csv`,
      rowsToCsv(rows),
      "text/csv;charset=utf-8"
    );
    setMessage(`تم تصدير ${source.title} بصيغة CSV. عدد الصفوف: ${rows.length}.`);
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

  if (isForbidden) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center">
          <div className="text-sm font-black tracking-[0.25em] text-red-100">صلاحيات محدودة</div>
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض مركز التصدير لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">مركز التصدير مخصص لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
          <p className="mt-3 text-sm text-white/45">الحساب: {adminEmail}</p>
          <Link href="/admin" className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 font-bold text-white/75">
            العودة إلى لوحة التحكم
          </Link>
        </section>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">
              مركز التصدير
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Export Center</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              مركز تصدير فعلي للبيانات الإدارية بصيغ JSON وCSV. Excel الحقيقي سيكون خطوة لاحقة منفصلة حتى لا نضيف تعقيداً أو مكتبات الآن.
            </p>
          </div>

          <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
            لوحة الإدارة
          </Link>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        <div className="mb-6 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 leading-8 text-yellow-50/85">
          ملفات التصدير قد تحتوي بيانات تشغيلية أو معلومات تواصل. احفظ الملفات في مكان آمن ولا ترفعها إلى GitHub أو أي مكان عام.
        </div>

        {(message || error) && (
          <div className={`mb-6 rounded-3xl border p-5 ${error ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-green-400/25 bg-green-500/10 text-green-100"}`}>
            {error || message}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="مصادر التصدير" value={exportSources.length} tone="purple" />
          <StatCard label="تصدير فعلي" value={availableCount} tone="green" />
          <StatCard label="الصيغ الحالية" value={2} tone="blue" />
          <StatCard label="محمي" value={protectedCount} tone="red" />
        </div>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث حسب القسم أو صيغة التصدير..."
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 focus:border-cyan-300/40"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {filteredSources.map((source) => {
            const isExportingJson = activeExport === `${source.module}-json`;
            const isExportingCsv = activeExport === `${source.module}-csv`;
            const isProtected = source.status === "protected" || !source.table;

            return (
              <article key={source.module} className={`rounded-[2rem] border p-5 ${toneClass(source.tone)}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-3 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-1 text-sm font-black">
                      {getStatusLabel(source.status)}
                    </div>
                    <h2 className="text-2xl font-black">{source.title}</h2>
                    <p className="mt-3 leading-8 opacity-75">{source.description}</p>
                  </div>

                  <div className="text-sm opacity-75 md:text-left" dir="ltr">
                    {source.table || source.module}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {source.formats.map((format) => (
                    <span key={format} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-black">
                      {format}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {source.href && (
                    <Link
                      href={source.href}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white/75 transition hover:border-cyan-300/40 hover:text-white"
                    >
                      فتح القسم
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => exportSource(source, "json")}
                    disabled={isProtected || Boolean(activeExport)}
                    className="rounded-full border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-white/80 transition hover:border-green-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isExportingJson ? "تصدير JSON..." : "تصدير JSON"}
                  </button>

                  <button
                    type="button"
                    onClick={() => exportSource(source, "csv")}
                    disabled={isProtected || Boolean(activeExport)}
                    className="rounded-full border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-white/80 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isExportingCsv ? "تصدير CSV..." : "تصدير CSV"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {filteredSources.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
            لا توجد مصادر تصدير مطابقة للبحث.
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return classes[tone];
}
