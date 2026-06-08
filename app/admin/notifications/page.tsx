"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type NotificationItem = {
  id: string;
  type: "application" | "service_request" | "job_application";
  title: string;
  description: string;
  status: string;
  createdAt: string | null;
  href: string;
  priority: "high" | "normal";
};

type ApplicationRow = {
  id: number;
  full_name: string | null;
  whatsapp: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
};

type ServiceRequestRow = {
  id: number;
  request_code: string | null;
  full_name: string | null;
  whatsapp: string | null;
  service_type: string | null;
  status: string | null;
  created_at: string | null;
};

type JobApplicationRow = {
  id: number;
  full_name: string | null;
  whatsapp: string | null;
  status: string | null;
  created_at: string | null;
};

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

function normalizeStatus(status: string | null) {
  return (status || "new").toLowerCase().trim();
}

function getStatusLabel(status: string | null) {
  const value = normalizeStatus(status);

  if (["new", "pending"].includes(value)) return "جديد";
  if (["under_review", "reviewing", "processing", "in_progress"].includes(value)) {
    return "قيد المتابعة";
  }
  if (["accepted", "approved", "completed", "done"].includes(value)) return "مكتمل";
  if (["rejected", "declined", "cancelled"].includes(value)) return "مغلق";

  return status || "غير محدد";
}

function isHighPriority(status: string | null) {
  return ["new", "pending"].includes(normalizeStatus(status));
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("notifications");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace("/admin/login");
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
    loadNotifications();
  }, [isAuthorized]);

  async function loadNotifications() {
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
          .select("id, full_name, whatsapp, platform, status, created_at")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("service_requests")
          .select("id, request_code, full_name, whatsapp, service_type, status, created_at")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("job_applications")
          .select("id, full_name, whatsapp, status, created_at")
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

    setIsLoading(false);

    if (
      applicationsResult.error ||
      serviceRequestsResult.error ||
      jobApplicationsResult.error
    ) {
      setError("تعذر تحميل مركز الإشعارات. يرجى مراجعة صلاحيات الجداول المطلوبة.");
      return;
    }

    const applicationItems = ((applicationsResult.data || []) as ApplicationRow[]).map(
      (item) => ({
        id: `application-${item.id}`,
        type: "application" as const,
        title: "طلب انضمام جديد",
        description: `${item.full_name || "متقدم"} — ${item.platform || "منصة غير محددة"}`,
        status: item.status || "new",
        createdAt: item.created_at,
        href: "/admin/applications",
        priority: isHighPriority(item.status) ? "high" as const : "normal" as const,
      })
    );

    const serviceItems = ((serviceRequestsResult.data || []) as ServiceRequestRow[]).map(
      (item) => ({
        id: `service-${item.id}`,
        type: "service_request" as const,
        title: "طلب خدمة رقمية",
        description: `${item.full_name || "عميل"} — ${item.request_code || item.service_type || "طلب خدمة"}`,
        status: item.status || "new",
        createdAt: item.created_at,
        href: "/admin/service-requests",
        priority: isHighPriority(item.status) ? "high" as const : "normal" as const,
      })
    );

    const jobItems = ((jobApplicationsResult.data || []) as JobApplicationRow[]).map(
      (item) => ({
        id: `job-${item.id}`,
        type: "job_application" as const,
        title: "طلب وظيفة جديد",
        description: `${item.full_name || "متقدم"} — ${item.whatsapp || "بدون رقم ظاهر"}`,
        status: item.status || "new",
        createdAt: item.created_at,
        href: "/admin/jobs",
        priority: isHighPriority(item.status) ? "high" as const : "normal" as const,
      })
    );

    setItems(
      [...applicationItems, ...serviceItems, ...jobItems].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
    );
  }

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "high") return items.filter((item) => item.priority === "high");
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  const highCount = items.filter((item) => item.priority === "high").length;
  const applicationCount = items.filter((item) => item.type === "application").length;
  const serviceCount = items.filter((item) => item.type === "service_request").length;
  const jobCount = items.filter((item) => item.type === "job_application").length;

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          جاري التحقق من صلاحيات الإدارة...
        </div>
      </main>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 text-white md:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
              مركز الإشعارات
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Admin Notifications Center</h1>
            <p className="mt-3 text-white/55">آخر الطلبات والتنبيهات التشغيلية المهمة داخل وكالة حمزة.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadNotifications}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-black shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث الإشعارات"}
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75"
            >
              لوحة التحكم
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

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="عاجلة" value={highCount} tone="red" />
          <StatCard label="طلبات الانضمام" value={applicationCount} tone="purple" />
          <StatCard label="طلبات الخدمات" value={serviceCount} tone="yellow" />
          <StatCard label="طلبات الوظائف" value={jobCount} tone="green" />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>الكل</FilterButton>
          <FilterButton active={filter === "high"} onClick={() => setFilter("high")}>العاجلة</FilterButton>
          <FilterButton active={filter === "application"} onClick={() => setFilter("application")}>الانضمام</FilterButton>
          <FilterButton active={filter === "service_request"} onClick={() => setFilter("service_request")}>الخدمات</FilterButton>
          <FilterButton active={filter === "job_application"} onClick={() => setFilter("job_application")}>الوظائف</FilterButton>
        </div>

        <div className="grid gap-4">
          {filteredItems.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
              لا توجد إشعارات مطابقة حالياً.
            </div>
          )}

          {filteredItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-purple-400/45 hover:bg-purple-500/10"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/60">
                      {getTypeLabel(item.type)}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${item.priority === "high" ? "bg-red-500/15 text-red-100" : "bg-white/10 text-white/60"}`}>
                      {item.priority === "high" ? "يحتاج متابعة" : "متابعة عادية"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black">{item.title}</h2>
                  <p className="mt-2 text-white/60">{item.description}</p>
                </div>

                <div className="text-right md:text-left">
                  <div className="font-black text-purple-100">{getStatusLabel(item.status)}</div>
                  <div className="mt-2 text-sm text-white/45">{formatDate(item.createdAt)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function getTypeLabel(type: NotificationItem["type"]) {
  if (type === "application") return "طلب انضمام";
  if (type === "service_request") return "طلب خدمة";
  return "طلب وظيفة";
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "red" | "purple" | "yellow" | "green" }) {
  const toneClass = {
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black">{value}</div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-purple-600 px-5 py-3 text-sm font-black text-white"
          : "rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65"
      }
    >
      {children}
    </button>
  );
}
