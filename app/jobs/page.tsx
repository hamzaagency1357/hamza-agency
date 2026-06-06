"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Job = {
  id: number | null;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  job_type: string | null;
  short_description: string | null;
  description: string | null;
  requirements: string | null;
  status: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  created_at?: string | null;
};

type ApplicationForm = {
  fullName: string;
  country: string;
  whatsapp: string;
  email: string;
  experience: string;
  notes: string;
};

const fallbackJobs: Job[] = [
  {
    id: null,
    title: "مسؤول متابعة صناع محتوى",
    slug: "content-creators-manager",
    department: "إدارة الوكالة",
    location: "عن بعد",
    job_type: "مرن",
    short_description:
      "متابعة صناع المحتوى، تنظيم الطلبات، والتواصل اليومي مع المتقدمين.",
    description:
      "دور مناسب لشخص منظم يستطيع متابعة صناع المحتوى والرد على الاستفسارات وتحويل الحالات المهمة للإدارة.",
    requirements:
      "خبرة جيدة في واتساب، أسلوب تواصل محترم، التزام بالمتابعة، وفهم عام لمنصات البث المباشر.",
    status: "open",
    sort_order: 1,
    is_visible: true,
  },
  {
    id: null,
    title: "مسؤول برنامج",
    slug: "program-admin",
    department: "البرامج",
    location: "عن بعد",
    job_type: "جزئي",
    short_description:
      "متابعة برنامج محدد مثل TikTok أو BIGO LIVE أو غيرها حسب الحاجة.",
    description:
      "مسؤول البرنامج يساعد في مراجعة طلبات الانضمام، متابعة الحالات، وتقديم ملاحظات للإدارة.",
    requirements:
      "معرفة جيدة بمنصات البث، قدرة على التنظيم، خبرة سابقة بالوكالات أو البرامج تعتبر ميزة.",
    status: "open",
    sort_order: 2,
    is_visible: true,
  },
  {
    id: null,
    title: "دعم خدمات رقمية",
    slug: "digital-services-support",
    department: "الخدمات الرقمية",
    location: "عن بعد",
    job_type: "حسب الطلب",
    short_description:
      "متابعة طلبات الخدمات الرقمية مثل الشحن والسحب والتواصل مع العملاء.",
    description:
      "دور مخصص لدعم طلبات الخدمات الرقمية والتأكد من وصول المعلومات كاملة قبل تنفيذ أي خدمة.",
    requirements:
      "دقة في جمع المعلومات، متابعة جيدة، التزام بعدم تنفيذ أي خدمة قبل تأكيد الإدارة.",
    status: "open",
    sort_order: 3,
    is_visible: true,
  },
];

const initialForm: ApplicationForm = {
  fullName: "",
  country: "",
  whatsapp: "",
  email: "",
  experience: "",
  notes: "",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(fallbackJobs);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, title, slug, department, location, job_type, short_description, description, requirements, status, sort_order, is_visible, created_at"
      )
      .eq("is_visible", true)
      .eq("status", "open")
      .order("sort_order", { ascending: true });

    if (!error && data && data.length > 0) {
      setJobs(data as Job[]);
    }

    setIsLoading(false);
  }

  const openJobs = useMemo(() => {
    return jobs.filter((job) => job.status === "open" || !job.status);
  }, [jobs]);

  function updateField(key: keyof ApplicationForm, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openApply(job: Job) {
    setSelectedJob(job);
    setForm(initialForm);
    setMessage("");
    setSuccess(false);
  }

  function closeApply() {
    setSelectedJob(null);
    setMessage("");
    setSuccess(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (!selectedJob) {
      setMessage("يرجى اختيار وظيفة أولاً.");
      return;
    }

    if (!form.fullName.trim()) {
      setMessage("يرجى كتابة الاسم الكامل.");
      return;
    }

    if (!form.whatsapp.trim()) {
      setMessage("يرجى كتابة رقم الواتساب.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("الاتصال بقاعدة البيانات غير مفعل حالياً.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("job_applications").insert({
      job_id: selectedJob.id,
      full_name: form.fullName.trim(),
      country: form.country.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim(),
      experience: form.experience.trim(),
      notes: form.notes.trim(),
      answers: {},
      status: "new",
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Job application insert error:", error);
      setMessage(
        "حدث خطأ أثناء إرسال طلب الوظيفة. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب."
      );
      return;
    }

    setSuccess(true);
    setMessage(
      "تم استلام طلبك بنجاح. سيقوم فريق وكالة حمزة بمراجعته والتواصل معك عبر واتساب عند الحاجة."
    );
    setForm(initialForm);
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] px-5 py-8 text-white"
    >
      <JobsBackground />

      <section className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:text-white"
          >
            العودة للرئيسية
          </Link>

          <Link
            href="/contact"
            className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15"
          >
            تواصل معنا
          </Link>
        </nav>

        <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 text-center shadow-[0_0_55px_rgba(168,85,247,0.14)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
            HAMZA AGENCY Careers
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            وظائف وكالة حمزة
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              انضم لفريق العمل
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-4xl text-lg leading-9 text-white/72 md:text-xl">
            هذه الصفحة مخصصة للفرص الإدارية والتشغيلية داخل وكالة حمزة. يمكنك
            التقديم بدون سيرة ذاتية، وسيتم التواصل معك عبر واتساب إذا كان طلبك
            مناسباً.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <InfoCard
            title="بدون CV إلزامي"
            text="يكفي إرسال معلوماتك وخبرتك وملاحظاتك بشكل واضح."
          />
          <InfoCard
            title="متابعة عبر واتساب"
            text="فريق الوكالة يتواصل مع المتقدمين المناسبين عبر واتساب."
          />
          <InfoCard
            title="فرص مرنة"
            text="بعض المهام يمكن أن تكون عن بعد أو حسب الحاجة التشغيلية."
          />
        </div>

        <section className="mt-12">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-sm font-black text-yellow-100">
                الوظائف المتاحة
              </div>

              <h2 className="text-4xl font-black">اختر الوظيفة المناسبة</h2>

              <p className="mt-3 max-w-3xl leading-8 text-white/60">
                اقرأ تفاصيل كل فرصة ثم اضغط تقديم إذا كانت مناسبة لك. الطلبات
                تحفظ داخل نظام وكالة حمزة للمراجعة الإدارية.
              </p>
            </div>

            <div className="rounded-2xl border border-green-400/20 bg-green-500/10 px-5 py-3 text-sm font-bold text-green-100">
              {isLoading ? "جاري التحميل..." : `${openJobs.length} فرصة متاحة`}
            </div>
          </div>

          {openJobs.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
              لا توجد وظائف متاحة حالياً.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {openJobs.map((job) => (
                <article
                  key={`${job.slug}-${job.id || "fallback"}`}
                  className="flex flex-col rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur transition hover:border-purple-400/45 hover:bg-purple-500/10"
                >
                  <div className="mb-5 flex flex-wrap gap-2">
                    <Badge>{job.department || "إدارة الوكالة"}</Badge>
                    <Badge>{job.location || "عن بعد"}</Badge>
                    <Badge>{job.job_type || "مرن"}</Badge>
                  </div>

                  <h3 className="text-3xl font-black">{job.title}</h3>

                  <p className="mt-4 leading-8 text-white/66">
                    {job.short_description || job.description}
                  </p>

                  <div className="mt-5 rounded-2xl border border-yellow-400/15 bg-yellow-500/10 p-4">
                    <div className="mb-2 text-sm font-black text-yellow-100">
                      المتطلبات
                    </div>

                    <p className="leading-7 text-white/65">
                      {job.requirements ||
                        "الالتزام، حسن التواصل، والمتابعة الجيدة."}
                    </p>
                  </div>

                  <button
                    onClick={() => openApply(job)}
                    className="mt-6 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black text-white shadow-[0_0_32px_rgba(168,85,247,0.24)] transition hover:scale-[1.02]"
                  >
                    تقديم على الوظيفة
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {selectedJob && (
        <ApplyModal
          job={selectedJob}
          form={form}
          message={message}
          success={success}
          isSubmitting={isSubmitting}
          updateField={updateField}
          handleSubmit={handleSubmit}
          closeApply={closeApply}
        />
      )}
    </main>
  );
}

function ApplyModal({
  job,
  form,
  message,
  success,
  isSubmitting,
  updateField,
  handleSubmit,
  closeApply,
}: {
  job: Job;
  form: ApplicationForm;
  message: string;
  success: boolean;
  isSubmitting: boolean;
  updateField: <K extends keyof ApplicationForm>(
    key: K,
    value: ApplicationForm[K]
  ) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  closeApply: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur">
      <div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#0d0014] p-6 shadow-[0_0_80px_rgba(168,85,247,0.22)]">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-100">
              طلب توظيف
            </div>

            <h2 className="text-3xl font-black">{job.title}</h2>

            <p className="mt-2 text-white/50">
              {job.department || "وكالة حمزة"} — {job.location || "عن بعد"}
            </p>
          </div>

          <button
            onClick={closeApply}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75 transition hover:bg-white/[0.08]"
          >
            إغلاق
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="الاسم الكامل">
              <input
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                placeholder="اكتب اسمك الكامل"
                className={inputClassName}
              />
            </Field>

            <Field label="الدولة">
              <input
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
                placeholder="مثال: تركيا"
                className={inputClassName}
              />
            </Field>

            <Field label="رقم واتساب">
              <input
                value={form.whatsapp}
                onChange={(event) => updateField("whatsapp", event.target.value)}
                placeholder="+905011730377"
                className={inputClassName}
              />
            </Field>

            <Field label="البريد الإلكتروني - اختياري">
              <input
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="example@email.com"
                className={inputClassName}
              />
            </Field>
          </div>

          <Field label="خبراتك السابقة">
            <textarea
              value={form.experience}
              onChange={(event) => updateField("experience", event.target.value)}
              placeholder="اكتب خبراتك السابقة في الوكالات، المنصات، الدعم، الإدارة، أو أي شيء مفيد."
              className={`${inputClassName} min-h-32 resize-none`}
            />
          </Field>

          <Field label="ملاحظات إضافية">
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="اكتب أي ملاحظات أو أوقات مناسبة للتواصل."
              className={`${inputClassName} min-h-28 resize-none`}
            />
          </Field>

          {message && (
            <div
              className={`rounded-3xl border p-5 text-center font-bold leading-8 ${
                success
                  ? "border-green-400/30 bg-green-500/10 text-green-100"
                  : "border-yellow-400/30 bg-yellow-500/10 text-yellow-100"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-xl font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "جارٍ إرسال الطلب..." : "إرسال طلب الوظيفة"}
          </button>
        </form>
      </div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur">
      <h3 className="text-2xl font-black">{title}</h3>
      <p className="mt-3 leading-7 text-white/60">{text}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
      {children}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

const inputClassName =
  "w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/70 focus:ring-4 focus:ring-purple-500/10";

function JobsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.30),transparent_46%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,8,60,0.35),rgba(7,0,9,0.96))]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.55)_1px,transparent_0)] [background-size:46px_46px]" />
    </div>
  );
      }
