"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ServiceRequestRecord = {
  id: number;
  request_code: string | null;
  service_type: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const statusContent: Record<
  string,
  { label: string; description: string; className: string }
> = {
  new: {
    label: "تم استلام الطلب",
    description:
      "وصل طلبك إلى فريق وكالة حمزة وسيتم مراجعته حسب ترتيب الطلبات.",
    className: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  },
  pending: {
    label: "تم استلام الطلب",
    description:
      "وصل طلبك إلى فريق وكالة حمزة وسيتم مراجعته حسب ترتيب الطلبات.",
    className: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  },
  under_review: {
    label: "قيد المراجعة",
    description:
      "يقوم فريق الوكالة بمراجعة تفاصيل الخدمة وقد يتم التواصل معك عبر واتساب عند الحاجة.",
    className: "border-yellow-400/30 bg-yellow-500/10 text-yellow-100",
  },
  reviewing: {
    label: "قيد المراجعة",
    description:
      "يقوم فريق الوكالة بمراجعة تفاصيل الخدمة وقد يتم التواصل معك عبر واتساب عند الحاجة.",
    className: "border-yellow-400/30 bg-yellow-500/10 text-yellow-100",
  },
  processing: {
    label: "قيد التنفيذ",
    description:
      "تمت مراجعة الطلب ويجري العمل على متابعته أو تنفيذ الخطوة المناسبة له.",
    className: "border-purple-400/30 bg-purple-500/10 text-purple-100",
  },
  in_progress: {
    label: "قيد التنفيذ",
    description:
      "تمت مراجعة الطلب ويجري العمل على متابعته أو تنفيذ الخطوة المناسبة له.",
    className: "border-purple-400/30 bg-purple-500/10 text-purple-100",
  },
  completed: {
    label: "مكتمل",
    description:
      "تمت متابعة الطلب بنجاح. إذا كنت تحتاج أي مساعدة إضافية يمكنك التواصل معنا عبر واتساب.",
    className: "border-green-400/30 bg-green-500/10 text-green-100",
  },
  done: {
    label: "مكتمل",
    description:
      "تمت متابعة الطلب بنجاح. إذا كنت تحتاج أي مساعدة إضافية يمكنك التواصل معنا عبر واتساب.",
    className: "border-green-400/30 bg-green-500/10 text-green-100",
  },
  rejected: {
    label: "غير متاح حالياً",
    description:
      "لا يمكن تنفيذ هذا الطلب في الوقت الحالي. يمكنك التواصل مع فريق الوكالة لمعرفة البدائل المناسبة.",
    className: "border-red-400/30 bg-red-500/10 text-red-100",
  },
  cancelled: {
    label: "ملغي",
    description:
      "تم إلغاء الطلب أو إيقاف متابعته. يمكنك التواصل معنا عبر واتساب عند الحاجة.",
    className: "border-red-400/30 bg-red-500/10 text-red-100",
  },
};

const serviceTypeLabels: Record<string, string> = {
  platform_topup: "شحن منصة",
  withdrawal: "سحب أرباح",
  digital_service: "خدمة رقمية",
  technical_support: "دعم فني",
  other: "طلب آخر",
};

function normalizeRequestCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function getStatusInfo(status: string | null) {
  const normalized = (status || "new").toLowerCase().trim();

  return (
    statusContent[normalized] || {
      label: "قيد المتابعة",
      description:
        "طلبك موجود لدى فريق وكالة حمزة ويتم التعامل معه ضمن مسار المتابعة الداخلي.",
      className: "border-purple-400/30 bg-purple-500/10 text-purple-100",
    }
  );
}

function getServiceTypeLabel(value: string | null) {
  if (!value) return "غير محدد";
  return serviceTypeLabels[value] || value;
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

export default function ServiceStatusPage() {
  const [requestCode, setRequestCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [serviceRequest, setServiceRequest] =
    useState<ServiceRequestRecord | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setServiceRequest(null);

    const code = normalizeRequestCode(requestCode);

    if (!code || code.length < 8) {
      setMessage("يرجى إدخال كود طلب صحيح مثل SR-2026-123456.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("خدمة التتبع غير متاحة حالياً. يمكنك التواصل معنا عبر واتساب.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("service_requests")
      .select("id, request_code, service_type, platform, status, created_at, updated_at")
      .eq("request_code", code)
      .maybeSingle();

    setIsLoading(false);

    if (error) {
      console.error("Service request status lookup error:", error);
      setMessage(
        "تعذر عرض حالة الطلب حالياً. يمكنك التواصل مع فريق الوكالة عبر واتساب للمتابعة."
      );
      return;
    }

    if (!data) {
      setMessage(
        "لم يتم العثور على طلب بهذا الكود. تأكد من إدخال كود الطلب كما ظهر لك بعد الإرسال."
      );
      return;
    }

    setServiceRequest(data as ServiceRequestRecord);
  }

  const statusInfo = serviceRequest
    ? getStatusInfo(serviceRequest.status)
    : null;

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] px-5 py-8 text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.34),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(40,10,70,0.38),rgba(7,0,9,0.96))]" />
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -left-24 bottom-24 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto max-w-5xl">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:text-white"
          >
            العودة للرئيسية
          </Link>

          <Link
            href="/service-request"
            className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15"
          >
            إرسال طلب خدمة
          </Link>
        </nav>

        <header className="mb-8 rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.14)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
            HAMZA AGENCY Service Tracking
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            تتبع حالة طلب الخدمة
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70">
            أدخل كود الطلب الذي ظهر لك بعد إرسال طلب الخدمة لمعرفة آخر حالة مسجلة لدى وكالة حمزة.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur"
          >
            <label className="block text-sm font-black text-white/80">
              كود طلب الخدمة
            </label>

            <input
              value={requestCode}
              onChange={(event) => setRequestCode(event.target.value)}
              placeholder="مثال: SR-2026-123456"
              dir="ltr"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/60"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "جاري البحث..." : "عرض حالة الطلب"}
            </button>

            {message && (
              <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-100">
                {message}
              </div>
            )}

            <p className="mt-5 text-sm leading-7 text-white/45">
              لحماية الخصوصية، تعرض هذه الصفحة حالة الطلب فقط ولا تعرض تفاصيل شخصية كاملة.
            </p>
          </form>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <h2 className="text-2xl font-black">نتيجة التتبع</h2>

            {!serviceRequest && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5 text-white/60">
                أدخل كود الطلب واضغط على زر عرض الحالة لمعرفة نتيجة آخر تحديث مرتبط بهذا الطلب.
              </div>
            )}

            {serviceRequest && statusInfo && (
              <div className="mt-6 space-y-4">
                <div className={`rounded-2xl border p-5 ${statusInfo.className}`}>
                  <div className="text-sm font-bold opacity-80">الحالة الحالية</div>
                  <div className="mt-2 text-3xl font-black">{statusInfo.label}</div>
                  <p className="mt-3 leading-8 opacity-90">{statusInfo.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox
                    label="كود الطلب"
                    value={serviceRequest.request_code || "غير متوفر"}
                    dir="ltr"
                  />
                  <InfoBox
                    label="نوع الخدمة"
                    value={getServiceTypeLabel(serviceRequest.service_type)}
                  />
                  <InfoBox
                    label="المنصة"
                    value={serviceRequest.platform || "غير محدد"}
                  />
                  <InfoBox
                    label="تاريخ الطلب"
                    value={formatDate(serviceRequest.created_at)}
                  />
                </div>

                <a
                  href="https://wa.me/905011730377"
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl bg-green-500 px-5 py-4 text-center font-black text-white shadow-2xl transition hover:bg-green-400"
                >
                  متابعة عبر واتساب
                </a>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function InfoBox({
  label,
  value,
  dir = "rtl",
}: {
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-bold text-white/40">{label}</div>
      <div className="mt-2 break-words text-lg font-black text-white" dir={dir}>
        {value}
      </div>
    </div>
  );
}
