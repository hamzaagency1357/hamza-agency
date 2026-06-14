"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";

type ServiceRequest = {
  id: number;
  request_code: string | null;
  full_name: string | null;
  country: string | null;
  whatsapp: string | null;
  service_type: string | null;
  platform: string | null;
  account_identifier: string | null;
  requested_amount: string | null;
  notes: string | null;
  status: string | null;
  internal_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AdminStatus = "checking" | "authorized" | "unauthorized";

const statusOptions = [
  { value: "new", label: "جديد" },
  { value: "under_review", label: "قيد المراجعة" },
  { value: "contacted", label: "تم التواصل" },
  { value: "processing", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتمل" },
  { value: "rejected", label: "مرفوض" },
  { value: "canceled", label: "ملغي" },
];

const serviceTypeLabels: Record<string, string> = {
  platform_topup: "شحن منصة",
  withdrawal: "سحب أرباح",
  digital_service: "خدمة رقمية",
  technical_support: "دعم فني",
  other: "طلب آخر",
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  under_review: "قيد المراجعة",
  contacted: "تم التواصل",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
  rejected: "مرفوض",
  canceled: "ملغي",
};

function getServiceRequestSnapshot(request: ServiceRequest) {
  return {
    id: request.id,
    request_code: request.request_code,
    full_name: request.full_name,
    country: request.country,
    whatsapp: request.whatsapp,
    service_type: request.service_type,
    platform: request.platform,
    account_identifier: request.account_identifier,
    requested_amount: request.requested_amount,
    notes: request.notes,
    status: request.status,
    internal_notes: request.internal_notes,
    created_at: request.created_at,
    updated_at: request.updated_at,
  };
}

function getServiceRequestAction(changes: Partial<ServiceRequest>) {
  if (Object.prototype.hasOwnProperty.call(changes, "status")) return "update_service_request_status";
  if (Object.prototype.hasOwnProperty.call(changes, "internal_notes")) return "update_service_request_internal_notes";
  return "update_service_request";
}

function getServiceRequestDetails(request: ServiceRequest, changes: Partial<ServiceRequest>) {
  if (Object.prototype.hasOwnProperty.call(changes, "status")) {
    return `تغيير حالة طلب الخدمة من ${statusLabels[request.status || ""] || request.status || "غير محدد"} إلى ${statusLabels[String(changes.status || "")] || changes.status || "غير محدد"}`;
  }

  if (Object.prototype.hasOwnProperty.call(changes, "internal_notes")) {
    return "تحديث الملاحظات الداخلية لطلب الخدمة";
  }

  return "تحديث طلب خدمة من لوحة الإدارة";
}

export default function AdminServiceRequestsPage() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>("checking");
  const [adminEmail, setAdminEmail] = useState("");
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    initializeAdminPage();
  }, []);

  async function initializeAdminPage() {
    setMessage("");

    const access = await requireAdminModuleAccess("service_requests");

    if (!access.isAuthorized || !access.profile) {
      setAdminStatus("unauthorized");
      setIsLoading(false);

      if (access.reason === "not_configured") {
        setMessage("الاتصال بقاعدة البيانات غير مفعل.");
      }

      return;
    }

    setAdminEmail(access.profile.email || access.user?.email || "");
    setAdminStatus("authorized");
    await loadRequests();
  }

  async function loadRequests() {
    if (!supabase) return;

    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      setMessage(`تعذر تحميل طلبات الخدمات: ${error.message}`);
      return;
    }

    const rows = (data || []) as ServiceRequest[];
    setRequests(rows);

    const notes: Record<number, string> = {};
    rows.forEach((request) => {
      notes[request.id] = request.internal_notes || "";
    });
    setDraftNotes(notes);
  }

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const statusMatch =
        statusFilter === "all" || request.status === statusFilter;

      const searchText = [
        request.request_code,
        request.full_name,
        request.country,
        request.whatsapp,
        request.service_type,
        request.platform,
        request.account_identifier,
        request.requested_amount,
        request.notes,
      ]
        .join(" ")
        .toLowerCase();

      const searchMatch = !query || searchText.includes(query);

      return statusMatch && searchMatch;
    });
  }, [requests, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      new: requests.filter((item) => item.status === "new").length,
      processing: requests.filter((item) => item.status === "processing").length,
      completed: requests.filter((item) => item.status === "completed").length,
    };
  }, [requests]);

  function cleanWhatsapp(value: string | null) {
    return (value || "").replace(/[^\d]/g, "");
  }

  function formatDate(value: string | null) {
    if (!value) return "غير متوفر";

    return new Date(value).toLocaleString("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusLabel(value: string | null) {
    return statusLabels[value || ""] || value || "غير محدد";
  }

  function getServiceLabel(value: string | null) {
    return serviceTypeLabels[value || ""] || value || "غير محدد";
  }

  function buildRequestInfo(request: ServiceRequest) {
    return [
      `رقم الطلب: ${request.request_code || "-"}`,
      `الاسم: ${request.full_name || "-"}`,
      `الدولة: ${request.country || "-"}`,
      `واتساب: ${request.whatsapp || "-"}`,
      `نوع الخدمة: ${getServiceLabel(request.service_type)}`,
      `المنصة: ${request.platform || "-"}`,
      `معرّف الحساب: ${request.account_identifier || "-"}`,
      `المبلغ أو الكمية: ${request.requested_amount || "-"}`,
      `الحالة: ${getStatusLabel(request.status)}`,
      `ملاحظات العميل: ${request.notes || "-"}`,
      `ملاحظات داخلية: ${request.internal_notes || "-"}`,
      `تاريخ الطلب: ${formatDate(request.created_at)}`,
    ].join("\n");
  }

  function csvValue(value: string | number | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  }

  function getExportRows() {
    const headers = [
      "رقم الطلب",
      "الاسم",
      "الدولة",
      "واتساب",
      "نوع الخدمة",
      "المنصة",
      "معرّف الحساب",
      "المبلغ أو الكمية",
      "الحالة",
      "ملاحظات العميل",
      "ملاحظات داخلية",
      "تاريخ الطلب",
      "آخر تحديث",
    ];

    const rows = filteredRequests.map((request) => [
      request.request_code || `#${request.id}`,
      request.full_name || "",
      request.country || "",
      request.whatsapp || "",
      getServiceLabel(request.service_type),
      request.platform || "",
      request.account_identifier || "",
      request.requested_amount || "",
      getStatusLabel(request.status),
      request.notes || "",
      request.internal_notes || "",
      formatDate(request.created_at),
      formatDate(request.updated_at),
    ]);

    return { headers, rows };
  }

  function exportFilteredRequestsCsv() {
    if (filteredRequests.length === 0) {
      setMessage("لا توجد طلبات مطابقة لتصديرها.");
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
    link.download = `hamza-service-requests-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage(`تم تصدير ${filteredRequests.length} طلب خدمة بصيغة CSV.`);
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

  function exportFilteredRequestsExcel() {
    if (filteredRequests.length === 0) {
      setMessage("لا توجد طلبات مطابقة لتصديرها.");
      return;
    }

    const { headers, rows } = getExportRows();
    const tableHeader = headers
      .map((header) => `<th>${excelValue(header)}</th>`)
      .join("");
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${excelValue(cell)}</td>`).join("")}</tr>`
      )
      .join("");

    const workbook = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; direction: rtl; font-family: Arial, sans-serif; }
            th { background: #3b0764; color: #ffffff; font-weight: bold; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; mso-number-format: "\@"; }
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
    link.download = `hamza-service-requests-${date}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage(`تم تصدير ${filteredRequests.length} طلب خدمة بصيغة Excel.`);
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMessage);
    } catch {
      setMessage("تعذر النسخ. حاول مرة أخرى.");
    }
  }

  async function updateRequest(
    request: ServiceRequest,
    changes: Partial<ServiceRequest>
  ) {
    if (!supabase) return;

    setUpdatingId(request.id);
    setMessage("");

    const { data, error } = await supabase
      .from("service_requests")
      .update(changes)
      .eq("id", request.id)
      .select("*")
      .single();

    setUpdatingId(null);

    if (error) {
      setMessage(`تعذر تحديث الطلب: ${error.message}`);
      return;
    }

    const updated = data as ServiceRequest;

    await logAdminActivity({
      action: getServiceRequestAction(changes),
      module: "service_requests",
      adminEmail,
      recordId: request.request_code || request.id,
      details: getServiceRequestDetails(request, changes),
      oldData: getServiceRequestSnapshot(request),
      newData: getServiceRequestSnapshot(updated),
    });

    setRequests((current) =>
      current.map((item) => (item.id === request.id ? updated : item))
    );

    setDraftNotes((current) => ({
      ...current,
      [request.id]: updated.internal_notes || "",
    }));

    setMessage("تم تحديث الطلب بنجاح.");
  }

  if (adminStatus === "checking") {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white"
      >
        <div className="rounded-3xl border border-purple-400/20 bg-white/[0.04] p-8 text-center backdrop-blur">
          <div className="text-2xl font-black">جاري التحقق من صلاحية الدخول...</div>
          <p className="mt-3 text-white/60">يرجى الانتظار قليلاً.</p>
        </div>
      </main>
    );
  }

  if (adminStatus === "unauthorized") {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white"
      >
        <div className="max-w-xl rounded-3xl border border-red-400/25 bg-red-500/10 p-8 text-center backdrop-blur">
          <div className="text-3xl font-black text-red-100">
            غير مصرح بالدخول
          </div>

          <p className="mt-4 leading-8 text-white/65">
            يجب تسجيل الدخول بحساب إداري فعال للوصول إلى طلبات الخدمات.
          </p>

          <Link
            href="/admin/login"
            className="mt-6 inline-flex rounded-full bg-purple-600 px-7 py-4 font-black text-white"
          >
            تسجيل الدخول
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#070009] px-5 py-8 text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_44%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,8,60,0.32),rgba(7,0,9,0.96))]" />
      </div>

      <section className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-purple-200">HAMZA AGENCY Admin</div>
            <h1 className="mt-2 text-3xl font-black">
              إدارة طلبات الخدمات الرقمية
            </h1>
            <p className="mt-2 text-sm text-white/50">{adminEmail}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadRequests}
              className="rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-3 font-bold text-purple-100 transition hover:bg-purple-500/20"
            >
              تحديث الطلبات
            </button>

            <button
              onClick={exportFilteredRequestsCsv}
              className="rounded-full border border-green-400/25 bg-green-500/10 px-5 py-3 font-bold text-green-100 transition hover:bg-green-500/20"
            >
              تصدير CSV
            </button>

            <button
              onClick={exportFilteredRequestsExcel}
              className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-3 font-bold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              تصدير Excel
            </button>

            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 font-bold text-white/75 transition hover:text-white"
            >
              العودة للوحة التحكم
            </Link>
          </div>
        </nav>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="إجمالي الطلبات" value={stats.total} />
          <StatCard label="طلبات جديدة" value={stats.new} />
          <StatCard label="قيد التنفيذ" value={stats.processing} />
          <StatCard label="مكتملة" value={stats.completed} />
        </div>

        <div className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur md:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث بالاسم، الواتساب، رقم الطلب، المنصة..."
            className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 outline-none transition focus:border-purple-400/70"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 outline-none transition focus:border-purple-400/70"
          >
            <option value="all">كل الحالات</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div className="mb-6 rounded-3xl border border-yellow-400/25 bg-yellow-500/10 p-5 text-center font-bold text-yellow-100">
            {message}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
            جاري تحميل الطلبات...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
            لا توجد طلبات خدمات مطابقة حالياً.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRequests.map((request) => {
              const whatsapp = cleanWhatsapp(request.whatsapp);
              const isUpdating = updatingId === request.id;

              return (
                <div
                  key={request.id}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                    <div>
                      <div className="mb-5 flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-2 text-sm font-black text-yellow-100">
                          {request.request_code || `#${request.id}`}
                        </span>

                        <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-100">
                          {getServiceLabel(request.service_type)}
                        </span>

                        <span className="rounded-full border border-green-400/25 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-100">
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <InfoItem label="الاسم" value={request.full_name} />
                        <InfoItem label="الدولة" value={request.country} />
                        <InfoItem label="واتساب" value={request.whatsapp} />
                        <InfoItem label="المنصة" value={request.platform} />
                        <InfoItem
                          label="معرّف الحساب / ID"
                          value={request.account_identifier}
                        />
                        <InfoItem
                          label="المبلغ أو الكمية"
                          value={request.requested_amount}
                        />
                        <InfoItem
                          label="تاريخ الطلب"
                          value={formatDate(request.created_at)}
                        />
                        <InfoItem
                          label="آخر تحديث"
                          value={formatDate(request.updated_at)}
                        />
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <TextBox
                          label="ملاحظات العميل"
                          value={request.notes || "لا توجد ملاحظات"}
                        />

                        <div>
                          <div className="mb-2 text-sm font-black text-white/60">
                            ملاحظات داخلية
                          </div>

                          <textarea
                            value={draftNotes[request.id] || ""}
                            onChange={(event) =>
                              setDraftNotes((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="اكتب ملاحظات داخلية للطلب..."
                            className="min-h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 outline-none transition focus:border-purple-400/70"
                          />

                          <button
                            disabled={isUpdating}
                            onClick={() =>
                              updateRequest(request, {
                                internal_notes: draftNotes[request.id] || "",
                              })
                            }
                            className="mt-3 w-full rounded-2xl border border-purple-400/25 bg-purple-500/10 px-5 py-3 font-black text-purple-100 transition hover:bg-purple-500/20 disabled:opacity-60"
                          >
                            حفظ الملاحظات
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                      <div>
                        <div className="mb-2 text-sm font-black text-white/60">
                          تغيير الحالة
                        </div>

                        <select
                          value={request.status || "new"}
                          disabled={isUpdating}
                          onChange={(event) =>
                            updateRequest(request, {
                              status: event.target.value,
                            })
                          }
                          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-purple-400/70"
                        >
                          {statusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() =>
                          copyText(
                            request.whatsapp || "",
                            "تم نسخ رقم الواتساب."
                          )
                        }
                        className="w-full rounded-2xl border border-green-400/25 bg-green-500/10 px-5 py-3 font-black text-green-100 transition hover:bg-green-500/20"
                      >
                        نسخ رقم واتساب
                      </button>

                      <button
                        onClick={() =>
                          copyText(
                            buildRequestInfo(request),
                            "تم نسخ كل معلومات الطلب."
                          )
                        }
                        className="w-full rounded-2xl border border-yellow-400/25 bg-yellow-500/10 px-5 py-3 font-black text-yellow-100 transition hover:bg-yellow-500/20"
                      >
                        نسخ معلومات الطلب
                      </button>

                      {whatsapp ? (
                        <a
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          className="flex w-full justify-center rounded-2xl bg-green-500 px-5 py-3 font-black text-white transition hover:bg-green-400"
                        >
                          فتح واتساب
                        </a>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-white/45">
                          لا يوجد رقم واتساب
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-center backdrop-blur">
      <div className="text-3xl font-black text-yellow-100">{value}</div>
      <div className="mt-2 text-sm text-white/55">{label}</div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-black text-white/45">{label}</div>
      <div className="mt-2 break-words text-sm font-bold text-white/85">
        {value || "-"}
      </div>
    </div>
  );
}

function TextBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-sm font-black text-white/60">{label}</div>
      <div className="min-h-32 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/75">
        {value}
      </div>
    </div>
  );
}
