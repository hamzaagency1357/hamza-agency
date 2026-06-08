"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ApplicationRecord = {
  id: number;
  whatsapp: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
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
      "يقوم فريق الوكالة بمراجعة بيانات الطلب وقد يتم التواصل معك عبر واتساب عند الحاجة.",
    className: "border-yellow-400/30 bg-yellow-500/10 text-yellow-100",
  },
  reviewing: {
    label: "قيد المراجعة",
    description:
      "يقوم فريق الوكالة بمراجعة بيانات الطلب وقد يتم التواصل معك عبر واتساب عند الحاجة.",
    className: "border-yellow-400/30 bg-yellow-500/10 text-yellow-100",
  },
  accepted: {
    label: "مقبول",
    description:
      "تم قبول الطلب مبدئياً. يرجى متابعة واتساب لأن فريق الوكالة قد يتواصل معك لتأكيد الخطوات التالية.",
    className: "border-green-400/30 bg-green-500/10 text-green-100",
  },
  approved: {
    label: "مقبول",
    description:
      "تم قبول الطلب مبدئياً. يرجى متابعة واتساب لأن فريق الوكالة قد يتواصل معك لتأكيد الخطوات التالية.",
    className: "border-green-400/30 bg-green-500/10 text-green-100",
  },
  rejected: {
    label: "غير مقبول حالياً",
    description:
      "لم يتم قبول الطلب في هذه المرحلة. يمكنك تطوير حسابك أو التواصل مع الوكالة لمعرفة الخيارات المناسبة لاحقاً.",
    className: "border-red-400/30 bg-red-500/10 text-red-100",
  },
  declined: {
    label: "غير مقبول حالياً",
    description:
      "لم يتم قبول الطلب في هذه المرحلة. يمكنك تطوير حسابك أو التواصل مع الوكالة لمعرفة الخيارات المناسبة لاحقاً.",
    className: "border-red-400/30 bg-red-500/10 text-red-100",
  },
};

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
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

export default function ApplicationStatusPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [application, setApplication] = useState<ApplicationRecord | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setApplication(null);

    const cleanedWhatsapp = normalizeDigits(whatsapp);

    if (!cleanedWhatsapp || cleanedWhatsapp.length < 6) {
      setMessage("يرجى إدخال رقم واتساب صحيح للبحث عن حالة الطلب.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("خدمة التتبع غير متاحة حالياً. يمكنك التواصل معنا عبر واتساب.");
      return;
    }

    setIsLoading(true);

    const searchKey = cleanedWhatsapp.slice(-8);

    const { data, error } = await supabase
      .from("agency_applications")
      .select("id, whatsapp, platform, status, created_at")
      .ilike("whatsapp", `%${searchKey}%`)
      .order("created_at", { ascending: false })
      .limit(1);

    setIsLoading(false);

    if (error) {
      console.error("Application status lookup error:", error);
      setMessage(
        "تعذر عرض حالة الطلب حالياً. يمكنك التواصل مع فريق الوكالة عبر واتساب للمتابعة."
      );
      return;
    }

    if (!data || data.length === 0) {
      setMessage(
        "لم يتم العثور على طلب بهذا الرقم. تأكد من إدخال نفس رقم الواتساب المستخدم عند التقديم."
      );
      return;
    }

    setApplication(data[0] as ApplicationRecord);
  }

  const statusInfo = application ? getStatusInfo(application.status) : null;

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] px-5 py-8 text-white">
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
            href="/programs"
            className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15"
          >
            البرامج المتاحة
          </Link>
        </nav>

        <header className="mb-8 rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.14)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
            HAMZA AGENCY Applications
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            تتبع حالة طلب الانضمام
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70">
            أدخل رقم الواتساب الذي استخدمته عند التقديم لمعرفة آخر حالة مسجلة لطلبك لدى وكالة حمزة.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur"
          >
            <label className="block text-sm font-black text-white/80">
              رقم واتساب المستخدم في الطلب
            </label>

            <input
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder="مثال: +905011730377"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/60"
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
              لحماية الخصوصية، تعرض هذه الصفحة حالة الطلب فقط ولا تعرض التفاصيل الشخصية الكاملة.
            </p>
          </form>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <h2 className="text-2xl font-black">نتيجة التتبع</h2>

            {!application && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5 text-white/60">
                أدخل رقم الواتساب واضغط على زر عرض الحالة لمعرفة نتيجة آخر طلب مرتبط بهذا الرقم.
              </div>
            )}

            {application && statusInfo && (
              <div className="mt-6 space-y-4">
                <div className={`rounded-2xl border p-5 ${statusInfo.className}`}>
                  <div className="text-sm font-bold opacity-80">الحالة الحالية</div>
                  <div className="mt-2 text-3xl font-black">{statusInfo.label}</div>
                  <p className="mt-3 leading-8 opacity-90">{statusInfo.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox label="المنصة" value={application.platform || "غير محدد"} />
                  <InfoBox label="تاريخ الطلب" value={formatDate(application.created_at)} />
                </div>

                <a
                  href="https://wa.me/905011730377"
                  target="_blank"
                  className="block rounded-2xl bg-green-500 px-5 py-4 text-center font-black text-white shadow-2xl transition hover:bg-green-400"
                >
                  تواصل مع الوكالة عبر واتساب
                </a>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-bold text-white/45">{label}</div>
      <div className="mt-2 font-black text-white">{value}</div>
    </div>
  );
}
