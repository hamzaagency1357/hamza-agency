"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { canUseAdminModulePermission, requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type ApplicationRow = {
  id: number;
  full_name: string | null;
  country: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
};

type ServiceRequestRow = {
  id: number;
  request_code: string | null;
  service_type: string | null;
  status: string | null;
  created_at: string | null;
};

type JobApplicationRow = {
  id: number;
  status: string | null;
  created_at: string | null;
};

type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "pink" | "cyan";

function normalizeStatus(value: string | null) {
  return (value || "new").toLowerCase().trim();
}

function getStatusLabel(value: string | null) {
  const status = normalizeStatus(value);

  if (["new", "pending"].includes(status)) return "جديد";
  if (["under_review", "reviewing", "processing", "in_progress"].includes(status)) {
    return "قيد المتابعة";
  }
  if (["accepted", "approved", "completed", "done"].includes(status)) return "مكتمل / مقبول";
  if (["rejected", "declined", "cancelled"].includes(status)) return "مغلق / مرفوض";

  return value || "غير محدد";
}

function isSameDay(dateValue: string | null, now = new Date()) {
  if (!dateValue) return false;
  const date = new Date(dateValue);

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isWithinDays(dateValue: string | null, days: number) {
  if (!dateValue) return false;
  const date = new Date(dateValue).getTime();
  const now = Date.now();
  const diff = now - date;

  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function formatDate(value: string | null) {
  if (!value) return "غير متوفر";

  try {
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "غير متوفر";
  }
}

function getTopCounts(values: Array<string | null | undefined>, fallback = "غير محدد") {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const label = (value || fallback).trim() || fallback;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestRow[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplicationRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("analytics");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }

      const canViewAnalytics = await canUseAdminModulePermission(
        access.profile,
        "analytics",
        "can_view"
      );

      if (!canViewAnalytics) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace("/admin");
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadAnalytics();
  }, [isAuthorized]);

  async function loadAnalytics() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setIsLoading(true);

    const [applicationsResult, serviceRequestsResult, jobApplicationsResult] =
      await Promise.all([
        supabase
          .from("agency_applications")
          .select("id, full_name, country, platform, status, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("service_requests")
          .select("id, request_code, service_type, status, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("job_applications")
          .select("id, status, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    setIsLoading(false);

    if (
      applicationsResult.error ||
      serviceRequestsResult.error ||
      jobApplicationsResult.error
    ) {
      setError("تعذر تحميل التحليلات. يرجى مراجعة صلاحيات الجداول أو إعدادات الاتصال.");
      return;
    }

    setApplications((applicationsResult.data || []) as ApplicationRow[]);
    setServiceRequests((serviceRequestsResult.data || []) as ServiceRequestRow[]);
    setJobApplications((jobApplicationsResult.data || []) as JobApplicationRow[]);
  }

  const analytics = useMemo(() => {
    const todayApplications = applications.filter((item) => isSameDay(item.created_at)).length;
    const weekApplications = applications.filter((item) => isWithinDays(item.created_at, 7)).length;
    const monthApplications = applications.filter((item) => isWithinDays(item.created_at, 30)).length;
    const acceptedApplications = applications.filter((item) =>
      ["accepted", "approved"].includes(normalizeStatus(item.status))
    ).length;
    const rejectedApplications = applications.filter((item) =>
      ["rejected", "declined"].includes(normalizeStatus(item.status))
    ).length;
    const openApplications = applications.filter((item) =>
      ["new", "pending", "under_review", "reviewing"].includes(normalizeStatus(item.status))
    ).length;
    const completedServices = serviceRequests.filter((item) =>
      ["completed", "done"].includes(normalizeStatus(item.status))
    ).length;
    const openServices = serviceRequests.filter((item) =>
      ["new", "pending", "under_review", "reviewing", "processing", "in_progress"].includes(
        normalizeStatus(item.status)
      )
    ).length;
    const openJobApplications = jobApplications.filter((item) =>
      ["new", "pending", "under_review", "reviewing"].includes(normalizeStatus(item.status))
    ).length;
    const totalOperationalItems = applications.length + serviceRequests.length + jobApplications.length;
    const totalOpenItems = openApplications + openServices + openJobApplications;

    return {
      todayApplications,
      weekApplications,
      monthApplications,
      acceptedApplications,
      rejectedApplications,
      openApplications,
      completedServices,
      openServices,
      openJobApplications,
      totalApplications: applications.length,
      totalServices: serviceRequests.length,
      totalJobApplications: jobApplications.length,
      totalOperationalItems,
      totalOpenItems,
      acceptanceRate: percent(acceptedApplications, applications.length),
      rejectionRate: percent(rejectedApplications, applications.length),
      applicationBacklogRate: percent(openApplications, applications.length),
      serviceCompletionRate: percent(completedServices, serviceRequests.length),
      serviceBacklogRate: percent(openServices, serviceRequests.length),
      jobBacklogRate: percent(openJobApplications, jobApplications.length),
      operationalBacklogRate: percent(totalOpenItems, totalOperationalItems),
      topPrograms: getTopCounts(applications.map((item) => item.platform)),
      topCountries: getTopCounts(applications.map((item) => item.country)),
      applicationStatuses: getTopCounts(applications.map((item) => getStatusLabel(item.status))),
      serviceStatuses: getTopCounts(serviceRequests.map((item) => getStatusLabel(item.status))),
      serviceTypes: getTopCounts(serviceRequests.map((item) => item.service_type)),
      jobStatuses: getTopCounts(jobApplications.map((item) => getStatusLabel(item.status))),
    };
  }, [applications, serviceRequests, jobApplications]);

  const recentActivity = useMemo(() => {
    const applicationItems = applications.slice(0, 8).map((item) => ({
      id: `application-${item.id}`,
      title: "طلب انضمام",
      description: `${item.full_name || "متقدم"} — ${item.platform || "منصة غير محددة"}`,
      status: getStatusLabel(item.status),
      createdAt: item.created_at,
      href: "/admin/applications",
    }));

    const serviceItems = serviceRequests.slice(0, 8).map((item) => ({
      id: `service-${item.id}`,
      title: "طلب خدمة",
      description: item.request_code || item.service_type || "طلب خدمة",
      status: getStatusLabel(item.status),
      createdAt: item.created_at,
      href: "/admin/service-requests",
    }));

    const jobItems = jobApplications.slice(0, 8).map((item) => ({
      id: `job-${item.id}`,
      title: "طلب وظيفة",
      description: `طلب وظيفة رقم ${item.id}`,
      status: getStatusLabel(item.status),
      createdAt: item.created_at,
      href: "/admin/jobs",
    }));

    return [...applicationItems, ...serviceItems, ...jobItems]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 12);
  }, [applications, serviceRequests, jobApplications]);

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
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 text-white md:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
              KPI Dashboard
            </div>
            <h1 className="text-4xl font-black md:text-5xl">مؤشرات الأداء التشغيلية</h1>
            <p className="mt-3 text-white/55">
              قراءة تشغيلية متقدمة لطلبات الانضمام والخدمات والوظائف داخل وكالة حمزة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAnalytics}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-black shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث التحليلات"}
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75"
            >
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="طلبات اليوم" value={analytics.todayApplications} tone="blue" />
          <MetricCard label="طلبات آخر 7 أيام" value={analytics.weekApplications} tone="purple" />
          <MetricCard label="طلبات آخر 30 يوم" value={analytics.monthApplications} tone="pink" />
          <MetricCard label="إجمالي التشغيل" value={analytics.totalOperationalItems} tone="cyan" />
          <MetricCard label="طلبات مفتوحة" value={analytics.openApplications} tone="yellow" />
          <MetricCard label="طلبات مقبولة" value={analytics.acceptedApplications} tone="green" />
          <MetricCard label="طلبات مرفوضة" value={analytics.rejectedApplications} tone="red" />
          <MetricCard label="خدمات قيد المتابعة" value={analytics.openServices} tone="purple" />
          <MetricCard label="خدمات مكتملة" value={analytics.completedServices} tone="green" />
          <MetricCard label="طلبات وظائف مفتوحة" value={analytics.openJobApplications} tone="yellow" />
          <MetricCard label="طلبات الوظائف" value={analytics.totalJobApplications} tone="blue" />
          <MetricCard label="كل العناصر المفتوحة" value={analytics.totalOpenItems} tone="red" />
        </div>

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-2xl font-black">معدلات KPI</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <RateCard label="معدل القبول" value={analytics.acceptanceRate} tone="green" />
            <RateCard label="معدل الرفض" value={analytics.rejectionRate} tone="red" />
            <RateCard label="تراكم الانضمام" value={analytics.applicationBacklogRate} tone="yellow" />
            <RateCard label="إنجاز الخدمات" value={analytics.serviceCompletionRate} tone="green" />
            <RateCard label="تراكم الخدمات" value={analytics.serviceBacklogRate} tone="yellow" />
            <RateCard label="تراكم الوظائف" value={analytics.jobBacklogRate} tone="yellow" />
            <RateCard label="الضغط التشغيلي" value={analytics.operationalBacklogRate} tone="purple" />
            <RateCard label="نشاط آخر أسبوع" value={percent(analytics.weekApplications, analytics.totalApplications)} tone="cyan" />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <InsightPanel title="أكثر البرامج طلباً" items={analytics.topPrograms} />
          <InsightPanel title="أكثر الدول في الطلبات" items={analytics.topCountries} />
          <InsightPanel title="حالات طلبات الانضمام" items={analytics.applicationStatuses} />
          <InsightPanel title="حالات طلبات الخدمات" items={analytics.serviceStatuses} />
          <InsightPanel title="أنواع الخدمات الأكثر طلباً" items={analytics.serviceTypes} />
          <InsightPanel title="حالات طلبات الوظائف" items={analytics.jobStatuses} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-2xl font-black">آخر النشاطات</h2>
            <div className="mt-5 grid gap-3">
              {recentActivity.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-center text-white/55">
                  لا توجد نشاطات حديثة حالياً.
                </div>
              )}

              {recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-purple-400/40 hover:bg-purple-500/10"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-black">{item.title}</div>
                      <div className="mt-1 text-sm text-white/55">{item.description}</div>
                    </div>
                    <div className="text-sm text-white/45 md:text-left">
                      <div className="font-bold text-purple-100">{item.status}</div>
                      <div>{formatDate(item.createdAt)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-2xl font-black">ملخص سريع</h2>
            <div className="mt-5 grid gap-3">
              <MiniMetric label="إجمالي طلبات الانضمام" value={analytics.totalApplications} />
              <MiniMetric label="إجمالي طلبات الخدمات" value={analytics.totalServices} />
              <MiniMetric label="إجمالي طلبات الوظائف" value={analytics.totalJobApplications} />
              <MiniMetric label="وظائف آخر 7 أيام" value={jobApplications.filter((item) => isWithinDays(item.created_at, 7)).length} />
              <MiniMetric label="وظائف اليوم" value={jobApplications.filter((item) => isSameDay(item.created_at)).length} />
            </div>

            <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-100">
              مؤشرات زمن المراجعة الدقيقة تحتاج لاحقاً أعمدة زمنية مخصصة لكل انتقال حالة.
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}</div>
    </div>
  );
}

function RateCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}%</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4">
      <span className="text-sm font-bold text-white/65">{label}</span>
      <span className="text-2xl font-black" dir="ltr">{value}</span>
    </div>
  );
}

function InsightPanel({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-4">
        {items.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-center text-white/55">
            لا توجد بيانات كافية حالياً.
          </div>
        )}

        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-bold text-white/80">{item.label}</span>
              <span className="font-black" dir="ltr">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-l from-purple-500 to-yellow-300"
                style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    pink: "border-pink-400/20 bg-pink-500/10 text-pink-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return classes[tone];
}
