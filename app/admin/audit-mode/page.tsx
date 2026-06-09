"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type AuditStatus = "active" | "ready" | "protected";
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";

type AuditArea = {
  title: string;
  description: string;
  scope: string;
  status: AuditStatus;
  tone: Tone;
};

const auditAreas: AuditArea[] = [
  {
    title: "حذف البيانات الحساسة",
    description: "مراجعة عمليات الحذف قبل اعتمادها في الأقسام المهمة مثل الطلبات والإعدادات.",
    scope: "delete_approval",
    status: "ready",
    tone: "red",
  },
  {
    title: "تعديل إعدادات النظام",
    description: "تدقيق التغييرات التي تمس الإعدادات العامة، الصيانة، التواصل، والهوية.",
    scope: "settings_review",
    status: "protected",
    tone: "purple",
  },
  {
    title: "تغييرات البرامج والشركاء",
    description: "متابعة التعديلات التي تظهر على صفحات البرامج والشركاء قبل نشرها للزوار.",
    scope: "content_review",
    status: "ready",
    tone: "yellow",
  },
  {
    title: "الطلبات والخدمات",
    description: "مراجعة التغييرات الكبيرة على حالات الطلبات والملاحظات الداخلية وسجلات الخدمات.",
    scope: "operations_review",
    status: "ready",
    tone: "blue",
  },
  {
    title: "التصدير والنسخ الاحتياطي",
    description: "ضبط مراجعة العمليات التي تتعلق بتصدير البيانات أو متابعة النسخ الاحتياطي.",
    scope: "data_control",
    status: "protected",
    tone: "cyan",
  },
  {
    title: "سجل الإصدارات",
    description: "ربط عمليات التدقيق بسجل الإصدارات لتوثيق ما تم اعتماده ومن اعتمده.",
    scope: "version_history",
    status: "active",
    tone: "green",
  },
];

function getStatusLabel(status: AuditStatus) {
  if (status === "active") return "جاهز للتوثيق";
  if (status === "protected") return "يتطلب صلاحيات عالية";
  return "جاهز للتهيئة";
}

export default function AdminAuditModePage() {
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

  const filteredAreas = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return auditAreas;

    return auditAreas.filter((area) =>
      [area.title, area.description, area.scope, getStatusLabel(area.status)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search]);

  const activeCount = auditAreas.filter((area) => area.status === "active").length;
  const readyCount = auditAreas.filter((area) => area.status === "ready").length;
  const protectedCount = auditAreas.filter((area) => area.status === "protected").length;

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
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض وضع التدقيق لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">وضع التدقيق مخصص لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
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
            <div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
              وضع التدقيق
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Audit Mode</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              مركز إداري لتجهيز مراجعة العمليات الحساسة قبل اعتمادها وتوثيقها ضمن سجلات النظام.
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
          <StatCard label="مجالات التدقيق" value={auditAreas.length} tone="purple" />
          <StatCard label="جاهز للتوثيق" value={activeCount} tone="green" />
          <StatCard label="جاهز للتهيئة" value={readyCount} tone="blue" />
          <StatCard label="محمي" value={protectedCount} tone="red" />
        </div>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث حسب مجال التدقيق أو نوع العملية..."
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 focus:border-yellow-300/40"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {filteredAreas.map((area) => (
            <article key={area.scope} className={`rounded-[2rem] border p-5 ${toneClass(area.tone)}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-1 text-sm font-black">
                    {getStatusLabel(area.status)}
                  </div>
                  <h2 className="text-2xl font-black">{area.title}</h2>
                  <p className="mt-3 leading-8 opacity-75">{area.description}</p>
                </div>

                <div className="text-sm opacity-75 md:text-left" dir="ltr">
                  {area.scope}
                </div>
              </div>
            </article>
          ))}
        </section>

        {filteredAreas.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
            لا توجد مجالات تدقيق مطابقة للبحث.
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
