"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getAssignedProgramSlug,
  requireAdminModuleAccess,
  shouldLimitToAssignedProgram,
  type AdminProfile,
} from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";

type AdminStatus = "checking" | "authorized" | "unauthorized";
type MessageType = "success" | "error" | "info";

type ApplicationRecord = {
  id: number;
  full_name: string | null;
  country: string | null;
  whatsapp: string | null;
  platform: string | null;
  previous_experience: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

const statusOptions = [
  { value: "new", label: "جديد" },
  { value: "under_review", label: "قيد المراجعة" },
  { value: "contacted", label: "تم التواصل" },
  { value: "accepted", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
  { value: "archived", label: "مؤرشف" },
];

const statusLabels: Record<string, string> = {
  new: "جديد",
  pending: "جديد",
  under_review: "قيد المراجعة",
  reviewing: "قيد المراجعة",
  contacted: "تم التواصل",
  accepted: "مقبول",
  approved: "مقبول",
  rejected: "مرفوض",
  declined: "مرفوض",
  archived: "مؤرشف",
};

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanWhatsapp(value: string | null | undefined) {
  return (value || "").replace(/[^0-9]/g, "");
}

function formatDate(value: string | null | undefined) {
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

function csvValue(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function excelValue(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, " ");
}

function getStatusLabel(status: string | null | undefined) {
  return statusLabels[status || ""] || status || "غير محدد";
}

function getApplicationSnapshot(item: ApplicationRecord) {
  return {
    id: item.id,
    full_name: item.full_name,
    country: item.country,
    whatsapp: item.whatsapp,
    platform: item.platform,
    previous_experience: item.previous_experience,
    notes: item.notes,
    status: item.status,
    created_at: item.created_at,
  };
}

export default function AdminApplicationsPage() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>("checking");
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminEmail, setAdminEmail] = useState("");

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");

  useEffect(() => {
    initializeAdminPage();
  }, []);

  function showMessage(text: string, type: MessageType = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function clearMessage() {
    setMessage("");
    setMessageType("info");
  }

  async function initializeAdminPage() {
    setIsLoading(true);
    clearMessage();

    const access = await requireAdminModuleAccess("applications");

    if (!access.isAuthorized || !access.profile) {
      if (access.reason === "not_signed_in" || access.reason === "not_admin") {
        window.location.href = "/admin/login";
        return;
      }

      setAdminStatus("unauthorized");
      setIsLoading(false);
      showMessage("لا تملك صلاحية الوصول إلى طلبات الانضمام.", "error");
      return;
    }

    setAdminEmail(access.profile.email || access.user?.email || "");
    setAdminProfile(access.profile);
    setAdminStatus("authorized");
    await loadApplications(access.profile);
    setIsLoading(false);
  }

  async function loadApplications(profile = adminProfile) {
    if (!supabase) return;

    setIsLoading(true);
    clearMessage();

    const { data, error } = await supabase
      .from("agency_applications")
      .select("id, full_name, country, whatsapp, platform, previous_experience, notes, status, created_at")
      .order("created_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      showMessage(`تعذر تحميل طلبات الانضمام: ${error.message}`, "error");
      return;
    }

    let rows = (data || []) as ApplicationRecord[];

    if (shouldLimitToAssignedProgram(profile)) {
      const assignedProgram = normalizeText(getAssignedProgramSlug(profile));
      rows = rows.filter((item) => normalizeText(item.platform).includes(assignedProgram));
    }

    setApplications(rows);
  }

  const programOptions = useMemo(() => {
    const values = applications
      .map((item) => item.platform || "غير محدد")
      .filter(Boolean);

    return Array.from(new Set(values));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((item) => {
      const statusMatch =
        statusFilter === "all" ||
        item.status === statusFilter ||
        (statusFilter === "new" && item.status === "pending") ||
        (statusFilter === "under_review" && item.status === "reviewing") ||
        (statusFilter === "accepted" && item.status === "approved") ||
        (statusFilter === "rejected" && item.status === "declined");

      const programMatch =
        programFilter === "all" || (item.platform || "غير محدد") === programFilter;

      const searchText = [
        item.id,
        item.full_name,
        item.country,
        item.whatsapp,
        item.platform,
        item.previous_experience,
        item.notes,
        item.status,
      ]
        .join(" ")
        .toLowerCase();

      return statusMatch && programMatch && (!query || searchText.includes(query));
    });
  }, [applications, programFilter, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: applications.length,
      new: applications.filter((item) => item.status === "new" || item.status === "pending").length,
      reviewing: applications.filter(
        (item) => item.status === "under_review" || item.status === "reviewing"
      ).length,
      accepted: applications.filter(
        (item) => item.status === "accepted" || item.status === "approved"
      ).length,
      rejected: applications.filter(
        (item) => item.status === "rejected" || item.status === "declined"
      ).length,
    };
  }, [applications]);

  function buildWhatsappLink(item: ApplicationRecord) {
    const number = cleanWhatsapp(item.whatsapp);
    const text = encodeURIComponent(
      `مرحباً ${item.full_name || ""}\nمعك فريق وكالة حمزة بخصوص طلب الانضمام إلى ${item.platform || "البرنامج"}.`
    );

    return number ? `https://wa.me/${number}?text=${text}` : "";
  }

  async function updateStatus(item: ApplicationRecord, nextStatus: string) {
    if (!supabase) return;

    setUpdatingId(item.id);
    clearMessage();

    const { error } = await supabase
      .from("agency_applications")
      .update({ status: nextStatus })
      .eq("id", item.id);

    setUpdatingId(null);

    if (error) {
      showMessage(`تعذر تحديث حالة الطلب: ${error.message}`, "error");
      return;
    }

    await logAdminActivity({
      action: "update_application_status",
      module: "agency_applications",
      adminEmail,
      recordId: item.id,
      details: `تغيير حالة طلب الانضمام من ${getStatusLabel(item.status)} إلى ${getStatusLabel(nextStatus)}`,
      oldData: getApplicationSnapshot(item),
      newData: {
        ...getApplicationSnapshot(item),
        status: nextStatus,
      },
    });

    await loadApplications();
    showMessage("تم تحديث حالة الطلب بنجاح.", "success");
  }

  function getExportRows() {
    const headers = [
      "ID",
      "الاسم",
      "الدولة",
      "واتساب",
      "البرنامج",
      "الحالة",
      "خبرات سابقة",
      "ملاحظات المتقدم",
      "تاريخ الطلب",
    ];

    const rows = filteredApplications.map((item) => [
      item.id,
      item.full_name || "",
      item.country || "",
      item.whatsapp || "",
      item.platform || "",
      getStatusLabel(item.status),
      item.previous_experience || "",
      item.notes || "",
      formatDate(item.created_at),
    ]);

    return { headers, rows };
  }

  function exportCsv() {
    if (filteredApplications.length === 0) {
      showMessage("لا توجد طلبات مطابقة لتصديرها.", "info");
      return;
    }

    const { headers, rows } = getExportRows();
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => csvValue(cell)).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `hamza-agency-applications-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage("تم تجهيز ملف CSV وتحميله.", "success");
  }

  function exportExcel() {
    if (filteredApplications.length === 0) {
      showMessage("لا توجد طلبات مطابقة لتصديرها.", "info");
      return;
    }

    const { headers, rows } = getExportRows();
    const tableHeader = headers
      .map((header) => `<th>${excelValue(header)}</th>`)
      .join("");
    const tableRows = rows
      .map((row) => `<tr>${row.map((cell) => `<td>${excelValue(cell)}</td>`).join("")}</tr>`)
      .join("");

    const workbook = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; direction: rtl; font-family: Arial, sans-serif; }
            th { background: #3b0764; color: #ffffff; font-weight: bold; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; mso-number-format: "\\@"; }
          </style>
        </head>
        <body>
          <table>
            <thead><tr>${tableHeader}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `.trim();

    const blob = new Blob(["\ufeff" + workbook], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `hamza-agency-applications-${date}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage("تم تجهيز ملف Excel وتحميله.", "success");
  }

  if (adminStatus === "checking" || isLoading) {
    return (
      <AdminPageShell>
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-8 text-center text-white">
          جاري التحقق من صلاحيات الإدارة وتحميل طلبات الانضمام...
        </div>
      </AdminPageShell>
    );
  }

  if (adminStatus === "unauthorized") {
    return (
      <AdminPageShell>
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center text-red-100">
          <h1 className="text-3xl font-black">غير مصرح بالدخول</h1>
          <p className="mt-4 text-white/65">لا تملك صلاحية إدارة طلبات الانضمام.</p>
          <Link
            href="/admin"
            className="mt-6 inline-block rounded-full bg-purple-600 px-6 py-3 font-black text-white"
          >
            العودة للوحة التحكم
          </Link>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-purple-500/20 bg-black/45 p-6 shadow-[0_0_80px_rgba(124,58,237,0.16)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-yellow-200">
                HAMZA AGENCY
              </p>
              <h1 className="mt-3 text-4xl font-black">طلبات الانضمام</h1>
              <p className="mt-3 text-sm leading-7 text-white/55">
                إدارة طلبات صناع المحتوى حسب البرنامج والحالة، مع بحث وتصدير وتواصل واتساب.
              </p>
              <p className="mt-2 text-xs text-white/35">{adminEmail}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadApplications()}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white/75 hover:bg-white/10"
              >
                تحديث
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="rounded-full border border-green-400/25 bg-green-500/10 px-5 py-3 text-sm font-black text-green-100 hover:bg-green-500/20"
              >
                تصدير CSV
              </button>

              <button
                type="button"
                onClick={exportExcel}
                className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-500/20"
              >
                تصدير Excel
              </button>

              <Link
                href="/admin"
                className="rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-3 text-sm font-black text-purple-100 hover:bg-purple-500/20"
              >
                لوحة التحكم
              </Link>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mt-5 rounded-2xl border p-4 text-sm font-bold leading-7 ${
              messageType === "success"
                ? "border-green-400/25 bg-green-500/10 text-green-100"
                : messageType === "error"
                  ? "border-red-400/25 bg-red-500/10 text-red-100"
                  : "border-yellow-400/25 bg-yellow-500/10 text-yellow-100"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="كل الطلبات" value={stats.total} />
          <StatCard label="جديدة" value={stats.new} />
          <StatCard label="قيد المراجعة" value={stats.reviewing} />
          <StatCard label="مقبولة" value={stats.accepted} />
          <StatCard label="مرفوضة" value={stats.rejected} />
        </div>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم، الواتساب، الدولة، البرنامج..."
              className={inputClassName}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClassName}
            >
              <option value="all">كل الحالات</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value)}
              className={inputClassName}
            >
              <option value="all">كل البرامج</option>
              {programOptions.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>

          {shouldLimitToAssignedProgram(adminProfile) && (
            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              هذا الحساب محدود ببرنامج: {getAssignedProgramSlug(adminProfile) || "غير محدد"}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4">
          {filteredApplications.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-white/60">
              لا توجد طلبات مطابقة للفلاتر الحالية.
            </div>
          ) : (
            filteredApplications.map((item) => (
              <article
                key={item.id}
                className="rounded-[2rem] border border-white/10 bg-black/35 p-5 backdrop-blur"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
                        #{item.id}
                      </span>
                      <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-100">
                        {getStatusLabel(item.status)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/60">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black text-white">
                      {item.full_name || "بدون اسم"}
                    </h2>

                    <p className="mt-2 text-sm text-white/55">
                      {item.platform || "برنامج غير محدد"} • {item.country || "دولة غير محددة"}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <InfoBlock label="واتساب" value={item.whatsapp || "غير متوفر"} />
                      <InfoBlock label="خبرات سابقة" value={item.previous_experience || "لا يوجد"} />
                      <InfoBlock label="ملاحظات المتقدم" value={item.notes || "لا يوجد"} />
                    </div>
                  </div>

                  <div className="w-full space-y-3 lg:w-80">
                    <select
                      value={item.status || "new"}
                      onChange={(event) => updateStatus(item, event.target.value)}
                      disabled={updatingId === item.id}
                      className={inputClassName}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {buildWhatsappLink(item) ? (
                      <a
                        href={buildWhatsappLink(item)}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full rounded-2xl bg-green-600 px-4 py-3 text-center text-sm font-black text-white hover:bg-green-500"
                      >
                        تواصل واتساب
                      </a>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm text-white/45">
                        لا يوجد رقم واتساب صالح
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AdminPageShell>
  );
}

function AdminPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] px-5 py-8 text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />
      {children}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-2 text-3xl font-black text-yellow-100" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="text-xs font-bold text-white/40">{label}</div>
      <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-white/72">
        {value}
      </div>
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-purple-400";
