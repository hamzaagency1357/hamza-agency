"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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

const emptyJobForm: JobForm = {
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

const applicationStatusLabels: Record<string, string> = {
  new: "جديد",
  under_review: "قيد المراجعة",
  contacted: "تم التواصل",
  accepted: "مقبول",
  rejected: "مرفوض",
};

const jobStatusLabels: Record<string, string> = {
  open: "مفتوحة",
  paused: "متوقفة مؤقتاً",
  closed: "مغلقة",
};

export default function AdminJobsPage() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>("checking");
  const [adminEmail, setAdminEmail] = useState("");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);

  const [jobForm, setJobForm] = useState<JobForm>(emptyJobForm);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);

  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [applicationFilter, setApplicationFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    initializeAdminPage();
  }, []);

  async function initializeAdminPage() {
    if (!isSupabaseConfigured || !supabase) {
      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email || "";

    if (!email) {
      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    const { data: adminData, error } = await supabase
      .from("admin_users")
      .select("email, role, is_active")
      .eq("email", email)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !adminData) {
      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    setAdminEmail(email);
    setAdminStatus("authorized");
    await loadData();
  }

  async function loadData() {
    if (!supabase) return;

    setIsLoading(true);
    setMessage("");

    const [jobsResult, applicationsResult] = await Promise.all([
      supabase
        .from("jobs")
        .select(
          "id, title, slug, department, location, job_type, short_description, description, requirements, status, sort_order, is_visible, created_at, updated_at"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),

      supabase
        .from("job_applications")
        .select(
          "id, job_id, full_name, country, whatsapp, email, experience, notes, status, internal_notes, created_at, updated_at"
        )
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
  }

  const stats = useMemo(() => {
    return {
      jobs: jobs.length,
      openJobs: jobs.filter((job) => job.status === "open").length,
      applications: applications.length,
      newApplications: applications.filter((item) => item.status === "new").length,
      accepted: applications.filter((item) => item.status === "accepted").length,
      rejected: applications.filter((item) => item.status === "rejected").length,
    };
  }, [jobs, applications]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const statusMatch = jobFilter === "all" || job.status === jobFilter;

      const searchText = [
        job.title,
        job.slug,
        job.department,
        job.location,
        job.job_type,
        job.short_description,
      ]
        .join(" ")
        .toLowerCase();

      return statusMatch && (!query || searchText.includes(query));
    });
  }, [jobs, jobFilter, search]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const statusMatch =
        applicationFilter === "all" || application.status === applicationFilter;

      const job = jobs.find((item) => item.id === application.job_id);

      const searchText = [
        application.full_name,
        application.country,
        application.whatsapp,
        application.email,
        application.experience,
        application.notes,
        job?.title,
      ]
        .join(" ")
        .toLowerCase();

      return statusMatch && (!query || searchText.includes(query));
    });
  }, [applications, jobs, applicationFilter, search]);

  function updateJobForm(key: keyof JobForm, value: string | boolean) {
    setJobForm((current) => ({
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

  function resetJobForm() {
    setJobForm(emptyJobForm);
    setEditingJobId(null);
  }

  function editJob(job: Job) {
    setEditingJobId(job.id);
    setJobForm({
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

    if (!jobForm.title.trim()) {
      setMessage("يرجى كتابة عنوان الوظيفة.");
      return;
    }

    const safeSlug = jobForm.slug.trim() || generateSlug(jobForm.title);

    const payload = {
      title: jobForm.title.trim(),
      slug: safeSlug,
      department: jobForm.department.trim(),
      location: jobForm.location.trim(),
      job_type: jobForm.jobType.trim(),
      short_description: jobForm.shortDescription.trim(),
      description: jobForm.description.trim(),
      requirements: jobForm.requirements.trim(),
      status: jobForm.status,
      sort_order: Number(jobForm.sortOrder) || 0,
      is_visible: jobForm.isVisible,
    };

    setIsSavingJob(true);

    if (editingJobId) {
      const { data, error } = await supabase
        .from("jobs")
        .update(payload)
        .eq("id", editingJobId)
        .select("*")
        .single();

      setIsSavingJob(false);

      if (error) {
        setMessage(`تعذر تحديث الوظيفة: ${error.message}`);
        return;
      }

      setJobs((current) =>
        current.map((job) => (job.id === editingJobId ? (data as Job) : job))
      );

      setMessage("تم تحديث الوظيفة بنجاح.");
      resetJobForm();
      return;
    }

    const { data, error } = await supabase
      .from("jobs")
      .insert(payload)
      .select("*")
      .single();

    setIsSavingJob(false);

    if (error) {
      setMessage(`تعذر إضافة الوظيفة: ${error.message}`);
      return;
    }

    setJobs((current) => [data as Job, ...current]);
    setMessage("تمت إضافة الوظيفة بنجاح.");
    resetJobForm();
  }

  async function quickUpdateJob(job: Job, changes: Partial<Job>) {
    if (!supabase) return;

    setMessage("");

    const { data, error } = await supabase
      .from("jobs")
      .update(changes)
      .eq("id", job.id)
      .select("*")
      .single();

    if (error) {
      setMessage(`تعذر تحديث الوظيفة: ${error.message}`);
      return;
    }

    setJobs((current) =>
      current.map((item) => (item.id === job.id ? (data as Job) : item))
    );

    setMessage("تم تحديث الوظيفة بنجاح.");
  }

  async function updateApplication(
    application: JobApplication,
    changes: Partial<JobApplication>
  ) {
    if (!supabase) return;

    setUpdatingApplicationId(application.id);
    setMessage("");

    const { data, error } = await supabase
      .from("job_applications")
      .update(changes)
      .eq("id", application.id)
      .select("*")
      .single();

    setUpdatingApplicationId(null);

    if (error) {
      setMessage(`تعذر تحديث طلب الوظيفة: ${error.message}`);
      return;
    }

    const updated = data as JobApplication;

    setApplications((current) =>
      current.map((item) => (item.id === application.id ? updated : item))
    );

    setDraftNotes((current) => ({
      ...current,
      [application.id]: updated.internal_notes || "",
    }));

    setMessage("تم تحديث طلب الوظيفة بنجاح.");
  }

  function getJobTitle(jobId: number | null) {
    const job = jobs.find((item) => item.id === jobId);
    return job?.title || "وظيفة غير محددة";
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
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_44%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,8,60,0.32),rgba(7,0,9,0.96))]" />
      </div>

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
            {editingJobId ? "تعديل وظيفة" : "إضافة وظيفة جديدة"}
          </h2>

          <form onSubmit={saveJob} className="mt-5 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="عنوان الوظيفة">
                <input
                  value={jobForm.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    updateJobForm("title", title);

                    if (!editingJobId && !jobForm.slug.trim()) {
                      updateJobForm("slug", generateSlug(title));
                    }
                  }}
                  placeholder="مثال: مسؤول متابعة صناع محتوى"
                  className={inputClassName}
                />
              </Field>

              <Field label="الرابط المختصر Slug">
                <input
                  value={jobForm.slug}
                  onChange={(event) => updateJobForm("slug", event.target.value)}
                  placeholder="content-manager"
                  className={inputClassName}
                />
              </Field>

              <Field label="القسم">
                <input
                  value={jobForm.department}
                  onChange={(event) =>
                    updateJobForm("department", event.target.value)
                  }
                  placeholder="مثال: إدارة الوكالة"
                  className={inputClassName}
                />
              </Field>

              <Field label="الموقع">
                <input
                  value={jobForm.location}
                  onChange={(event) =>
                    updateJobForm("location", event.target.value)
                  }
                  placeholder="عن بعد"
                  className={inputClassName}
                />
              </Field>

              <Field label="نوع الوظيفة">
                <input
                  value={jobForm.jobType}
                  onChange={(event) =>
                    updateJobForm("jobType", event.target.value)
                  }
                  placeholder="مرن / جزئي / حسب الطلب"
                  className={inputClassName}
                />
              </Field>

              <Field label="ترتيب الظهور">
                <input
                  value={jobForm.sortOrder}
                  onChange={(event) =>
                    updateJobForm("sortOrder", event.target.value)
                  }
                  placeholder="0"
                  className={inputClassName}
                />
              </Field>

              <Field label="حالة الوظيفة">
                <select
                  value={jobForm.status}
                  onChange={(event) =>
                    updateJobForm("status", event.target.value)
                  }
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
                  checked={jobForm.isVisible}
                  onChange={(event) =>
                    updateJobForm("isVisible", event.target.checked)
                  }
                  className="h-5 w-5"
                />
              </label>
            </div>

            <Field label="وصف مختصر">
              <textarea
                value={jobForm.shortDescription}
                onChange={(event) =>
                  updateJobForm("shortDescription", event.target.value)
                }
                placeholder="وصف قصير يظهر في بطاقة الوظيفة"
                
