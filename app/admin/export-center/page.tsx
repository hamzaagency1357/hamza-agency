"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type ExportStatus = "available" | "ready" | "protected";
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";

type ExportSource = {
  title: string;
  description: string;
  module: string;
  formats: string[];
  status: ExportStatus;
  tone: Tone;
  href?: string;
};

const exportSources: ExportSource[] = [
  {
    title: "طلبات الخدمات",
    description: "تصدير طلبات الخدمات ومتابعة سجلاتها التشغيلية.",
    module: "service_requests",
    formats: ["CSV", "Excel"],
    status: "available",
    tone: "green",
    href: "/admin/service-requests",
  },
  {
    title: "طلبات الانضمام",
    description: "تجهيز تصدير طلبات الانضمام حسب البرنامج والحالة والتاريخ.",
    module: "applications",
    formats: ["CSV", "Excel"],
    status: "ready",
    tone: "purple",
    href: "/admin/applications",
  },
  {
    title: "طلبات الوظائف",
    description: "تنظيم تصدير طلبات الوظائف وسجلات المرشحين.",
    module: "jobs",
    formats: ["CSV", "Excel"],
    status: "ready",
    tone: "blue",
    href: "/admin/jobs",
  },
  {
    title: "البرامج والشركاء",
    description: "تصدير بيانات البرامج والشركاء الظاهرة في الموقع.",
    module: "programs_partners",
    formats: ["CSV", "Excel"],
    status: "ready",
    tone: "yellow",
    href: "/admin/partners",
  },
  {
    title: "التقييمات وقصص النجاح",
    description: "تجهيز ملفات منظمة للمراجعات وقصص النجاح المنشورة.",
    module: "social_proof",
    formats: ["CSV", "Excel"],
    status: "ready",
    tone: "cyan",
    href: "/admin/reviews",
  },
  {
    title: "إعدادات النظام",
    description: "تصدير إعدادات النظام الحساسة يحتاج مراجعة صلاحيات قبل التشغيل.",
    module: "settings",
    formats: ["JSON"],
    status: "protected",
    tone: "red",
    href: "/admin/settings",
  },
];

function getStatusLabel(status: ExportStatus) {
  if (status === "available") return "متاح من الصفحة المختصة";
  if (status === "protected") return "محمي بالصلاحيات";
  return "جاهز للربط";
}

export default function AdminExportCenterPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [search, setSearch] = useState("");

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
  const readyCount = exportSources.filter((source) => source.status === "ready").length;
  const protectedCount = exportSources.filter((source) => source.status === "protected").length;

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
              مركز موحد لتنظيم مصادر التصدير الإدارية وتجهيز ملفات البيانات المهمة بصيغ واضحة وآمنة.
            </p>
          </div>

          <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
            لوحة الإدارة
          </Link>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="مصادر التصدير" value={exportSources.length} tone="purple" />
          <StatCard label="متاح حالياً" value={availableCount} tone="green" />
          <StatCard label="جاهز للربط" value={readyCount} tone="blue" />
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
          {filteredSources.map((source) => (
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
                  {source.module}
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
                <span className="rounded-full border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold opacity-60">
                  إدارة التصدير من المركز
                </span>
              </div>
            </article>
          ))}
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
