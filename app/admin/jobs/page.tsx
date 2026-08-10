"use client";


import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";

type AdminStatus = "checking" | "authorized" | "unauthorized";

type Job = {
  id: number;
  title: string | null;
  slug: string | null;
  department: string | null;
  location: string | null;
  job_type: string | null;
  short_description: string | null;
  description: string | null;
  requirements: string | null;
  status: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type JobApplication = {
  id: number;
  job_id: number | null;
  full_name: string | null;
  country: string | null;
  whatsapp: string | null;
  email: string | null;
  experience: string | null;
  notes: string | null;
  status: string | null;
  internal_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type JobForm = {
  title: string;
  slug: string;
  department: string;
  location: string;
  jobType: string;
  shortDescription: string;
  description: string;
  requirements: string;
  status: string;
  sortOrder: string;
  isVisible: boolean;
};

const emptyForm: JobForm = {
  title: "",
  slug: "",
  department: "",
  location: "عن بعد",
  jobType: "مرن",
  shortDescription: "",
  description: "",
  requirements: "",
  status: "open",
  sortOrder: "0",
  isVisible: true,
};

const jobStatusOptions = [
  { value: "open", label: "مفتوحة" },
  { value: "paused", label: "متوقفة مؤقتاً" },
  { value: "closed", label: "مغلقة" },
];

const applicationStatusOptions = [
  { value: "new", label: "جديد" },
  { value: "under_review", label: "قيد المراجعة" },
  { value: "contacted", label: "تم التواصل" },
  { value: "accepted", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
];

const jobStatusLabels: Record<string, string> = {
  open: "مفتوحة",
  paused: "متوقفة مؤقتاً",
  closed: "مغلقة",
};

const applicationStatusLabels: Record<string, string> = {
  new: "جديد",
  under_review: "قيد المراجعة",
  contacted: "تم التواصل",
  accepted: "مقبول",
  rejected: "مرفوض",
};

function getJobSnapshot(job: Job) {
  return {
    id: job.id,
    title: job.title,
    slug: job.slug,
    department: job.department,
    location: job.location,
    job_type: job.job_type,
    short_description: job.short_description,
    description: job.description,
    requirements: job.requirements,
    status: job.status,
    sort_order: job.sort_order,
    is_visible: job.is_visible,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}

function getJobApplicationSnapshot(application: JobApplication, jobTitle: string) {
  return {
    id: application.id,
    job_id: application.job_id,
    job_title: jobTitle,
    full_name: application.full_name,
    country: application.country,
    whatsapp: application.whatsapp,
    email: application.email,
    experience: application.experience,
    notes: application.notes,
    status: application.status,
    internal_notes: application.internal_notes,
    created_at: application.created_at,
    updated_at: application.updated_at,
  };
}

function getJobUpdateAction(changes: Partial<Job>) {
  if (Object.prototype.hasOwnProperty.call(changes, "is_visible")) return "toggle_job_visibility";
  if (Object.prototype.hasOwnProperty.call(changes, "status")) return "update_job_status";
  return "update_job";
}

function getJobApplicationAction(changes: Partial<JobApplication>) {
  if (Object.prototype.hasOwnProperty.call(changes, "status")) return "update_job_application_status";
  if (Object.prototype.hasOwnProperty.call(changes, "internal_notes")) return "update_job_application_internal_notes";
  return "update_job_application";
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

export default function AdminJobsPage() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>("checking");
  const [adminEmail, setAdminEmail] = useState("");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);

  const [form, setForm] = useState<JobForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [applicationFilter, setApplicationFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<
    number | null
  >(null);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    if (!supabase) return;

    setIsLoading(true);
    setMessage("");

    const [jobsResult, applicationsResult] = await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),

      supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setIsLoading(false);

    if (jobsResult.error) {
      setMessage(`تعذر تحميل الوظائف: ${jobsResult.error.message}`);
    } else {
      setJobs((jobsResult.data || []) as Job[]);
    }

    if (applicationsResult.error) {
      setMessage(`تعذر تحميل طلبات الوظائف: ${applicationsResult.error.message}`);
    } else {
      const rows = (applicationsResult.data || []) as JobApplication[];
      setApplications(rows);

      const notes: Record<number, string> = {};
      rows.forEach((item) => {
        notes[item.id] = item.internal_notes || "";
      });
      setDraftNotes(notes);
    }
  }, []);

  const checkAccessAndLoad = useCallback(async () => {
    setIsLoading(true);

    if (!supabase) {
      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    const access = await requireAdminModuleAccess("jobs");

    if (!access.isAuthorized || !access.profile) {
      if (access.reason === "not_signed_in" || access.reason === "not_admin") {
        window.location.href = "/admin/login";
        return;
      }

      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    setAdminEmail(access.profile.email || access.user?.email || "");
    setAdminStatus("authorized");
    await loadData();
  }, [loadData]);

  useEffect(() => {
    void checkAccessAndLoad();
  }, [checkAccessAndLoad]);

  const stats = useMemo(() => {
    return {
      jobs: jobs.length,
      openJobs: jobs.filter((job) => job.status === "open").length,
      applications: applications.length,
      newApplications: applications.filter((item) => item.status === "new")
        .length,
      accepted: applications.filter((item) => item.status === "accepted")
        .length,
      rejected: applications.filter((item) => item.status === "rejected")
        .length,
    };
  }, [jobs, applications]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const statusMatch = jobFilter === "all" || job.status === jobFilter;

      const text = [
        job.title,
        job.slug,
        job.department,
        job.location,
        job.job_type,
        job.short_description,
        job.description,
        job.requirements,
      ]
        .join(" ")
        .toLowerCase();

      return statusMatch && (!query || text.includes(query));
    });
  }, [jobs, jobFilter, search]);

  const getJobTitle = useCallback((jobId: number | null) => {
    const job = jobs.find((item) => item.id === jobId);
    return job?.title || "وظيفة غير محددة";
  }, [jobs]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const statusMatch =
        applicationFilter === "all" ||
        application.status === applicationFilter;

      const jobTitle = getJobTitle(application.job_id);

      const text = [
        application.full_name,
        application.country,
        application.whatsapp,
        application.email,
        application.experience,
        application.notes,
        jobTitle,
      ]
        .join(" ")
        .toLowerCase();

      return statusMatch && (!query || text.includes(query));
    });
  }, [applications, applicationFilter, getJobTitle, search]);

  function updateForm(key: keyof JobForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function generateSlug(title: string) {
    return title
      .trim()
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editJob(job: Job) {
    setEditingId(job.id);
    setForm({
      title: job.title || "",
      slug: job.slug || "",
      department: job.department || "",
      location: job.location || "عن بعد",
      jobType: job.job_type || "مرن",
      shortDescription: job.short_description || "",
      description: job.description || "",
      requirements: job.requirements || "",
      status: job.status || "open",
      sortOrder: String(job.sort_order || 0),
      isVisible: job.is_visible !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) return;

    setMessage("");

    if (!form.title.trim()) {
      setMessage("يرجى كتابة عنوان الوظيفة.");
      return;
    }

    const safeSlug = form.slug.trim() || generateSlug(form.title);

    const payload = {
      title: form.title.trim(),
      slug: safeSlug,
      department: form.department.trim(),
      location: form.location.trim(),
      job_type: form.jobType.trim(),
      short_description: form.shortDescription.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim(),
      status: form.status,
      sort_order: Number(form.sortOrder) || 0,
      is_visible: form.isVisible,
    };

    const oldJob = editingId ? jobs.find((job) => job.id === editingId) || null : null;

    setIsSavingJob(true);

    if (editingId) {
      const { error } = await adminBoundaryMutation("pr116_jobs_page_entity_jobs_update", { values: payload, filters: [{ op: "eq", field: "id", value: editingId }], select: undefined, returnMode: "many", options: undefined });

      setIsSavingJob(false);

      if (error) {
        setMessage(`تعذر تحديث الوظيفة: ${error.message}`);
        return;
      }

      await logAdminActivity({
        action: "update_job",
        module: "jobs",
        adminEmail,
        recordId: editingId,
        details: "تعديل وظيفة من لوحة الإدارة",
        oldData: oldJob ? getJobSnapshot(oldJob) : null,
        newData: payload,
      });

      setMessage("تم تحديث الوظيفة بنجاح.");
      resetForm();
      await loadData();
      return;
    }

    const { error } = await adminBoundaryMutation("pr116_jobs_page_entity_jobs_insert", { values: payload, filters: [], select: undefined, returnMode: "many", options: undefined });

    setIsSavingJob(false);

    if (error) {
      setMessage(`تعذر إضافة الوظيفة: ${error.message}`);
      return;
    }

    await logAdminActivity({
      action: "create_job",
      module: "jobs",
      adminEmail,
      recordId: payload.slug,
      details: "إضافة وظيفة من لوحة الإدارة",
      oldData: null,
      newData: payload,
    });

    setMessage("تمت إضافة الوظيفة بنجاح.");
    resetForm();
    await loadData();
  }

  async function quickUpdateJob(job: Job, changes: Partial<Job>) {
    if (!supabase) return;

    const { error } = await adminBoundaryMutation("pr116_jobs_page_entity_jobs_update", { values: changes, filters: [{ op: "eq", field: "id", value: job.id }], select: undefined, returnMode: "many", options: undefined });

    if (error) {
      setMessage(`تعذر تحديث الوظيفة: ${error.message}`);
      return;
    }

    await logAdminActivity({
      action: getJobUpdateAction(changes),
      module: "jobs",
      adminEmail,
      recordId: job.id,
      details: "تحديث سريع لوظيفة من لوحة الإدارة",
      oldData: getJobSnapshot(job),
      newData: {
        ...getJobSnapshot(job),
        ...changes,
      },
    });

    setMessage("تم تحديث الوظيفة بنجاح.");
    await loadData();
  }

  async function updateApplication(
    application: JobApplication,
    changes: Partial<JobApplication>
  ) {
    if (!supabase) return;

    setUpdatingApplicationId(application.id);

    const { error } = await adminBoundaryMutation("pr116_jobs_page_entity_job_applications_update", { values: changes, filters: [{ op: "eq", field: "id", value: application.id }], select: undefined, returnMode: "many", options: undefined });

    setUpdatingApplicationId(null);

    if (error) {
      setMessage(`تعذر تحديث طلب الوظيفة: ${error.message}`);
      return;
    }

    const jobTitle = getJobTitle(application.job_id);

    await logAdminActivity({
      action: getJobApplicationAction(changes),
      module: "job_applications",
      adminEmail,
      recordId: application.id,
      details: "تحديث طلب وظيفة من لوحة الإدارة",
      oldData: getJobApplicationSnapshot(application, jobTitle),
      newData: {
        ...getJobApplicationSnapshot(application, jobTitle),
        ...changes,
      },
    });

    setMessage("تم تحديث طلب الوظيفة بنجاح.");
    await loadData();
  }

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

  function buildApplicationInfo(application: JobApplication) {
    return [
      `الوظيفة: ${getJobTitle(application.job_id)}`,
      `الاسم: ${application.full_name || "-"}`,
      `الدولة: ${application.country || "-"}`,
      `واتساب: ${application.whatsapp || "-"}`,
      `البريد: ${application.email || "-"}`,
      `الحالة: ${
        applicationStatusLabels[application.status || ""] ||
        application.status ||
        "-"
      }`,
      `الخبرات: ${application.experience || "-"}`,
      `ملاحظات المتقدم: ${application.notes || "-"}`,
      `ملاحظات داخلية: ${application.internal_notes || "-"}`,
      `تاريخ الطلب: ${formatDate(application.created_at)}`,
    ].join("\n");
  }

  function getJobApplicationExportRows() {
    const headers = [
      "ID",
      "الوظيفة",
      "الاسم",
      "الدولة",
      "واتساب",
      "البريد",
      "الحالة",
      "الخبرات",
      "ملاحظات المتقدم",
      "ملاحظات داخلية",
      "تاريخ الطلب",
      "آخر تحديث",
    ];

    const rows = filteredApplications.map((application) => [
      application.id,
      getJobTitle(application.job_id),
      application.full_name || "",
      application.country || "",
      application.whatsapp || "",
      application.email || "",
      applicationStatusLabels[application.status || ""] || application.status || "غير محدد",
      application.experience || "",
      application.notes || "",
      application.internal_notes || "",
      formatDate(application.created_at),
      formatDate(application.updated_at),
    ]);

    return { headers, rows };
  }

  function exportJobApplicationsCsv() {
    if (filteredApplications.length === 0) {
      setMessage("لا توجد طلبات وظائف مطابقة لتصديرها.");
      return;
    }

    const { headers, rows } = getJobApplicationExportRows();
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
    link.download = `hamza-job-applications-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage(`تم تصدير ${filteredApplications.length} طلب وظيفة بصيغة CSV.`);
  }

  function exportJobApplicationsExcel() {
    if (filteredApplications.length === 0) {
      setMessage("لا توجد طلبات وظائف مطابقة لتصديرها.");
      return;
    }

    const { headers, rows } = getJobApplicationExportRows();
    const tableHeader = headers.map((header) => `<th>${excelValue(header)}</th>`).join("");
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
    link.download = `hamza-job-applications-${date}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage(`تم تصدير ${filteredApplications.length} طلب وظيفة بصيغة Excel.`);
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMessage);
    } catch {
      setMessage("تعذر النسخ. حاول مرة أخرى.");
    }
  }

  if (adminStatus === "checking") {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white"
      >
        <div className="rounded-3xl border border-purple-400/20 bg-white/[0.04] p-8 text-center backdrop-blur">
          <div className="text-2xl font-black">
            جاري التحقق من صلاحية الدخول...
          </div>
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
            يجب تسجيل الدخول بحساب إداري فعال للوصول إلى إدارة الوظائف.
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
      <Background />

      <section className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-purple-200">HAMZA AGENCY Admin</div>

            <h1 className="mt-2 text-3xl font-black">
              إدارة الوظائف وطلبات التوظيف
            </h1>

            <p className="mt-2 text-sm text-white/50">{adminEmail}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadData}
              className="rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-3 font-bold text-purple-100"
            >
              تحديث البيانات
            </button>

            <button
              type="button"
              onClick={exportJobApplicationsCsv}
              className="rounded-full border border-green-400/25 bg-green-500/10 px-5 py-3 font-bold text-green-100 transition hover:bg-green-500/20"
            >
              تصدير CSV
            </button>

            <button
              type="button"
              onClick={exportJobApplicationsExcel}
              className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-3 font-bold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              تصدير Excel
            </button>

            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 font-bold text-white/75"
            >
              العودة للوحة التحكم
            </Link>
          </div>
        </nav>

        <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="إجمالي الوظائف" value={stats.jobs} />
          <StatCard label="وظائف مفتوحة" value={stats.openJobs} />
          <StatCard label="طلبات الوظائف" value={stats.applications} />
          <StatCard label="طلبات جديدة" value={stats.newApplications} />
          <StatCard label="مقبولة" value={stats.accepted} />
          <StatCard label="مرفوضة" value={stats.rejected} />
        </div>

        <div className="mb-6 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-6 backdrop-blur">
          <h2 className="text-2xl font-black">
            {editingId ? "تعديل وظيفة" : "إضافة وظيفة جديدة"}
          </h2>

          <form onSubmit={saveJob} className="mt-5 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="عنوان الوظيفة">
                <input
                  value={form.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    updateForm("title", title);

                    if (!editingId && !form.slug.trim()) {
                      updateForm("slug", generateSlug(title));
                    }
                  }}
                  placeholder="مثال: مسؤول متابعة صناع محتوى"
                  className={inputClassName}
                />
              </Field>

              <Field label="الرابط المختصر Slug">
                <input
                  value={form.slug}
                  onChange={(event) => updateForm("slug", event.target.value)}
                  placeholder="content-manager"
                  className={inputClassName}
                />
              </Field>

              <Field label="القسم">
                <input
                  value={form.department}
                  onChange={(event) =>
                    updateForm("department", event.target.value)
                  }
                  placeholder="مثال: إدارة الوكالة"
                  className={inputClassName}
                />
              </Field>

              <Field label="الموقع">
                <input
                  value={form.location}
                  onChange={(event) =>
                    updateForm("location", event.target.value)
                  }
                  placeholder="عن بعد"
                  className={inputClassName}
                />
              </Field>

              <Field label="نوع الوظيفة">
                <input
                  value={form.jobType}
                  onChange={(event) =>
                    updateForm("jobType", event.target.value)
                  }
                  placeholder="مرن / جزئي / حسب الطلب"
                  className={inputClassName}
                />
              </Field>

              <Field label="ترتيب الظهور">
                <input
                  value={form.sortOrder}
                  onChange={(event) =>
                    updateForm("sortOrder", event.target.value)
                  }
                  placeholder="0"
                  className={inputClassName}
                />
              </Field>

              <Field label="حالة الوظيفة">
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className={inputClassName}
                >
                  {jobStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>

              <label className="flex items-center justify-between rounded-3xl border border-white/10 bg-black/30 p-4">
                <span className="font-black text-white/75">
                  إظهار الوظيفة للعامة
                </span>

                <input
                  type="checkbox"
                  checked={form.isVisible}
                  onChange={(event) =>
                    updateForm("isVisible", event.target.checked)
                  }
                  className="h-5 w-5"
                />
              </label>
            </div>

            <Field label="وصف مختصر">
              <textarea
                value={form.shortDescription}
                onChange={(event) =>
                  updateForm("shortDescription", event.target.value)
                }
                placeholder="وصف قصير يظهر في بطاقة الوظيفة"
                className={`${inputClassName} min-h-24 resize-none`}
              />
            </Field>

            <Field label="وصف كامل">
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                placeholder="اشرح طبيعة الوظيفة"
                className={`${inputClassName} min-h-28 resize-none`}
              />
            </Field>

            <Field label="المتطلبات">
              <textarea
                value={form.requirements}
                onChange={(event) =>
                  updateForm("requirements", event.target.value)
                }
                placeholder="اكتب متطلبات الوظيفة"
                className={`${inputClassName} min-h-28 resize-none`}
              />
            </Field>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSavingJob}
                className="flex-1 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 px-7 py-4 font-black text-white disabled:opacity-60"
              >
                {isSavingJob
                  ? "جارٍ الحفظ..."
                  : editingId
                  ? "حفظ تعديل الوظيفة"
                  : "إضافة الوظيفة"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-4 font-black text-white/75"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur md:grid-cols-[1fr_220px_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث بالوظيفة، الاسم، الواتساب، الدولة..."
            className={inputClassName}
          />

          <select
            value={jobFilter}
            onChange={(event) => setJobFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="all">كل الوظائف</option>
            {jobStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={applicationFilter}
            onChange={(event) => setApplicationFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="all">كل طلبات التقديم</option>
            {applicationStatusOptions.map((status) => (
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
          <EmptyBox text="جاري تحميل البيانات..." />
        ) : (
          <>
            <section className="mb-8">
              <SectionTitle title="إدارة الوظائف" label="الوظائف" />

              {filteredJobs.length === 0 ? (
                <EmptyBox text="لا توجد وظائف مطابقة حالياً." />
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Badge>
                          {jobStatusLabels[job.status || ""] || job.status}
                        </Badge>
                        <Badge>{job.is_visible ? "ظاهرة" : "مخفية"}</Badge>
                        <Badge>{job.department || "بدون قسم"}</Badge>
                      </div>

                      <h3 className="text-2xl font-black">{job.title}</h3>

                      <p className="mt-3 leading-7 text-white/60">
                        {job.short_description || "لا يوجد وصف مختصر"}
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <InfoBox label="الموقع" value={job.location || "-"} />
                        <InfoBox label="النوع" value={job.job_type || "-"} />
                        <InfoBox label="الرابط" value={job.slug || "-"} />
                        <InfoBox
                          label="الترتيب"
                          value={String(job.sort_order || 0)}
                        />
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={() => editJob(job)}
                          className="flex-1 rounded-2xl border border-purple-400/25 bg-purple-500/10 px-5 py-3 font-black text-purple-100"
                        >
                          تعديل
                        </button>

                        <button
                          onClick={() =>
                            quickUpdateJob(job, {
                              is_visible: !job.is_visible,
                            })
                          }
                          className="flex-1 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 px-5 py-3 font-black text-yellow-100"
                        >
                          {job.is_visible ? "إخفاء" : "إظهار"}
                        </button>

                        <button
                          onClick={() =>
                            quickUpdateJob(job, {
                              status: job.status === "open" ? "paused" : "open",
                            })
                          }
                          className="flex-1 rounded-2xl border border-green-400/25 bg-green-500/10 px-5 py-3 font-black text-green-100"
                        >
                          {job.status === "open" ? "إيقاف" : "فتح"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionTitle title="مراجعة طلبات الوظائف" label="طلبات التقديم" />

              {filteredApplications.length === 0 ? (
                <EmptyBox text="لا توجد طلبات وظائف مطابقة حالياً." />
              ) : (
                <div className="space-y-5">
                  {filteredApplications.map((application) => {
                    const whatsapp = cleanWhatsapp(application.whatsapp);
                    const isUpdating = updatingApplicationId === application.id;

                    return (
                      <div
                        key={application.id}
                        className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
                      >
                        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                          <div>
                            <div className="mb-5 flex flex-wrap items-center gap-3">
                              <Badge>
                                {applicationStatusLabels[
                                  application.status || ""
                                ] ||
                                  application.status ||
                                  "جديد"}
                              </Badge>

                              <Badge>{getJobTitle(application.job_id)}</Badge>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <InfoBox
                                label="الاسم"
                                value={application.full_name || "-"}
                              />
                              <InfoBox
                                label="الدولة"
                                value={application.country || "-"}
                              />
                              <InfoBox
                                label="واتساب"
                                value={application.whatsapp || "-"}
                              />
                              <InfoBox
                                label="البريد"
                                value={application.email || "-"}
                              />
                              <InfoBox
                                label="تاريخ الطلب"
                                value={formatDate(application.created_at)}
                              />
                              <InfoBox
                                label="آخر تحديث"
                                value={formatDate(application.updated_at)}
                              />
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                              <TextBox
                                label="خبرات المتقدم"
                                value={
                                  application.experience ||
                                  "لا توجد خبرات مكتوبة"
                                }
                              />

                              <TextBox
                                label="ملاحظات المتقدم"
                                value={application.notes || "لا توجد ملاحظات"}
                              />
                            </div>

                            <div className="mt-5">
                              <div className="mb-2 text-sm font-black text-white/60">
                                ملاحظات داخلية
                              </div>

                              <textarea
                                value={draftNotes[application.id] || ""}
                                onChange={(event) =>
                                  setDraftNotes((current) => ({
                                    ...current,
                                    [application.id]: event.target.value,
                                  }))
                                }
                                placeholder="اكتب ملاحظات داخلية لطلب الوظيفة..."
                                className={`${inputClassName} min-h-32 resize-none`}
                              />

                              <button
                                disabled={isUpdating}
                                onClick={() =>
                                  updateApplication(application, {
                                    internal_notes:
                                      draftNotes[application.id] || "",
                                  })
                                }
                                className="mt-3 w-full rounded-2xl border border-purple-400/25 bg-purple-500/10 px-5 py-3 font-black text-purple-100 disabled:opacity-60"
                              >
                                حفظ الملاحظات
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                            <div>
                              <div className="mb-2 text-sm font-black text-white/60">
                                تغيير حالة الطلب
                              </div>

                              <select
                                value={application.status || "new"}
                                disabled={isUpdating}
                                onChange={(event) =>
                                  updateApplication(application, {
                                    status: event.target.value,
                                  })
                                }
                                className={inputClassName}
                              >
                                {applicationStatusOptions.map((status) => (
                                  <option
                                    key={status.value}
                                    value={status.value}
                                  >
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={() =>
                                copyText(
                                  application.whatsapp || "",
                                  "تم نسخ رقم الواتساب."
                                )
                              }
                              className="w-full rounded-2xl border border-green-400/25 bg-green-500/10 px-5 py-3 font-black text-green-100"
                            >
                              نسخ رقم واتساب
                            </button>

                            <button
                              onClick={() =>
                                copyText(
                                  buildApplicationInfo(application),
                                  "تم نسخ كل معلومات طلب الوظيفة."
                                )
                              }
                              className="w-full rounded-2xl border border-yellow-400/25 bg-yellow-500/10 px-5 py-3 font-black text-yellow-100"
                            >
                              نسخ معلومات الطلب
                            </button>

                            {whatsapp ? (
                              <a
                                href={`https://wa.me/${whatsapp}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full justify-center rounded-2xl bg-green-500 px-5 py-3 font-black text-white"
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
          </>
        )}
      </section>
    </main>
  );
}

const inputClassName =
  "w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/70 focus:ring-4 focus:ring-purple-500/10";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-sm font-black text-white/75">
        {label}
      </span>
      {children}
    </label>
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

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
      {children}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-black text-white/45">{label}</div>
      <div className="mt-2 break-words text-sm font-bold text-white/85">
        {value}
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-white/60 backdrop-blur">
      {text}
    </div>
  );
}

function SectionTitle({ title, label }: { title: string; label: string }) {
  return (
    <div className="mb-5">
      <div className="inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-4 py-2 text-sm font-black text-purple-100">
        {label}
      </div>
      <h2 className="mt-3 text-3xl font-black">{title}</h2>
    </div>
  );
}

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_44%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,8,60,0.32),rgba(7,0,9,0.96))]" />
    </div>
  );
}
