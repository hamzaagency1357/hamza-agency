"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type NotificationType = "application" | "service_request" | "job_application";
type NotificationFilter = "all" | "unread" | "read" | "archived" | "high" | NotificationType;

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  status: string;
  createdAt: string | null;
  href: string;
  priority: "high" | "normal";
};

type NotificationState = {
  read?: boolean;
  archived?: boolean;
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

type Tone = "red" | "purple" | "yellow" | "green" | "blue" | "cyan";

const STORAGE_KEY = "hamza_admin_notification_state_v1";

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

function readStoredStates() {
  if (typeof window === "undefined") return {} as Record<string, NotificationState>;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as Record<string, NotificationState>;

    return JSON.parse(raw) as Record<string, NotificationState>;
  } catch {
    return {} as Record<string, NotificationState>;
  }
}

function writeStoredStates(states: Record<string, NotificationState>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [states, setStates] = useState<Record<string, NotificationState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setStates(readStoredStates());
  }, []);

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

  function persistStates(nextStates: Record<string, NotificationState>) {
    setStates(nextStates);
    writeStoredStates(nextStates);
  }

  function updateState(id: string, patch: NotificationState) {
    persistStates({
      ...states,
      [id]: {
        ...states[id],
        ...patch,
      },
    });
  }

  function markAsRead(id: string) {
    updateState(id, { read: true });
  }

  function markAsUnread(id: string) {
    updateState(id, { read: false });
  }

  function archiveItem(id: string) {
    updateState(id, { archived: true, read: true });
  }

  function restoreItem(id: string) {
    updateState(id, { archived: false });
  }

  function markAllAsRead() {
    const nextStates = { ...states };
    items.forEach((item) => {
      nextStates[item.id] = {
        ...nextStates[item.id],
        read: true,
      };
    });
    persistStates(nextStates);
  }

  function clearArchived() {
    const nextStates = { ...states };
    Object.keys(nextStates).forEach((id) => {
      if (nextStates[id]?.archived) {
        delete nextStates[id];
      }
    });
    persistStates(nextStates);
  }

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
          .limit(20),
        supabase
          .from("service_requests")
          .select("id, request_code, full_name, whatsapp, service_type, status, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("job_applications")
          .select("id, full_name, whatsapp, status, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
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

  function isRead(item: NotificationItem) {
    return Boolean(states[item.id]?.read);
  }

  function isArchived(item: NotificationItem) {
    return Boolean(states[item.id]?.archived);
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const itemRead = Boolean(states[item.id]?.read);
      const itemArchived = Boolean(states[item.id]?.archived);

      if (filter === "archived") {
        if (!itemArchived) return false;
      } else if (itemArchived) {
        return false;
      }

      if (filter === "unread" && itemRead) return false;
      if (filter === "read" && !itemRead) return false;
      if (filter === "high" && item.priority !== "high") return false;
      if (["application", "service_request", "job_application"].includes(filter) && item.type !== filter) return false;

      if (!query) return true;

      return [
        item.title,
        item.description,
        item.status,
        getTypeLabel(item.type),
      ].join(" ").toLowerCase().includes(query);
    });
  }, [items, states, filter, search]);

  const activeItems = items.filter((item) => !isArchived(item));
  const highCount = activeItems.filter((item) => item.priority === "high").length;
  const unreadCount = activeItems.filter((item) => !isRead(item)).length;
  const readCount = activeItems.filter((item) => isRead(item)).length;
  const archivedCount = items.filter((item) => isArchived(item)).length;
  const applicationCount = activeItems.filter((item) => item.type === "application").length;
  const serviceCount = activeItems.filter((item) => item.type === "service_request").length;
  const jobCount = activeItems.filter((item) => item.type === "job_application").length;

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
              مركز الإشعارات المتقدم
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Admin Notifications Center</h1>
            <p className="mt-3 text-white/55">آخر الطلبات والتنبيهات التشغيلية مع إدارة القراءة والأرشفة.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadNotifications}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-black shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث الإشعارات"}
            </button>
            <button
              type="button"
              onClick={markAllAsRead}
              className="rounded-full border border-green-400/20 bg-green-500/10 px-6 py-3 font-black text-green-100"
            >
              تعليم الكل كمقروء
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
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

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="غير مقروء" value={unreadCount} tone="red" />
          <StatCard label="مقروء" value={readCount} tone="green" />
          <StatCard label="عاجلة" value={highCount} tone="yellow" />
          <StatCard label="مؤرشف" value={archivedCount} tone="cyan" />
          <StatCard label="طلبات الانضمام" value={applicationCount} tone="purple" />
          <StatCard label="طلبات الخدمات" value={serviceCount} tone="blue" />
          <StatCard label="طلبات الوظائف" value={jobCount} tone="green" />
          <StatCard label="إجمالي نشط" value={activeItems.length} tone="purple" />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-wrap gap-3">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>الكل</FilterButton>
            <FilterButton active={filter === "unread"} onClick={() => setFilter("unread")}>غير مقروء</FilterButton>
            <FilterButton active={filter === "read"} onClick={() => setFilter("read")}>مقروء</FilterButton>
            <FilterButton active={filter === "archived"} onClick={() => setFilter("archived")}>المؤرشف</FilterButton>
            <FilterButton active={filter === "high"} onClick={() => setFilter("high")}>العاجلة</FilterButton>
            <FilterButton active={filter === "application"} onClick={() => setFilter("application")}>الانضمام</FilterButton>
            <FilterButton active={filter === "service_request"} onClick={() => setFilter("service_request")}>الخدمات</FilterButton>
            <FilterButton active={filter === "job_application"} onClick={() => setFilter("job_application")}>الوظائف</FilterButton>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث داخل الإشعارات..."
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-purple-300/50"
          />
        </div>

        {filter === "archived" && archivedCount > 0 && (
          <button
            type="button"
            onClick={clearArchived}
            className="mb-6 rounded-full border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-100"
          >
            تنظيف المؤرشف من الواجهة
          </button>
        )}

        <div className="grid gap-4">
          {filteredItems.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
              لا توجد إشعارات مطابقة حالياً.
            </div>
          )}

          {filteredItems.map((item) => {
            const itemRead = isRead(item);
            const itemArchived = isArchived(item);

            return (
              <article
                key={item.id}
                className={`rounded-3xl border p-5 backdrop-blur transition ${itemRead ? "border-white/10 bg-white/[0.035]" : "border-purple-400/35 bg-purple-500/10"}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/60">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${item.priority === "high" ? "bg-red-500/15 text-red-100" : "bg-white/10 text-white/60"}`}>
                        {item.priority === "high" ? "يحتاج متابعة" : "متابعة عادية"}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${itemRead ? "bg-green-500/15 text-green-100" : "bg-yellow-500/15 text-yellow-100"}`}>
                        {itemRead ? "مقروء" : "غير مقروء"}
                      </span>
                      {itemArchived && (
                        <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-black text-cyan-100">
                          مؤرشف
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-black">{item.title}</h2>
                    <p className="mt-2 text-white/60">{item.description}</p>
                    <div className="mt-3 text-sm text-white/45">
                      {getStatusLabel(item.status)} — {formatDate(item.createdAt)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Link href={item.href} className="rounded-full bg-purple-600 px-4 py-2 text-sm font-black text-white">
                      فتح
                    </Link>
                    <button
                      type="button"
                      onClick={() => (itemRead ? markAsUnread(item.id) : markAsRead(item.id))}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/70"
                    >
                      {itemRead ? "تعليم كغير مقروء" : "تعليم كمقروء"}
                    </button>
                    <button
                      type="button"
                      onClick={() => (itemArchived ? restoreItem(item.id) : archiveItem(item.id))}
                      className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-100"
                    >
                      {itemArchived ? "استرجاع" : "أرشفة"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function getTypeLabel(type: NotificationType) {
  if (type === "application") return "طلب انضمام";
  if (type === "service_request") return "طلب خدمة";
  return "طلب وظيفة";
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}</div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
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

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return classes[tone];
}
