"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ServiceType =
  | "platform_topup"
  | "withdrawal"
  | "digital_service"
  | "technical_support"
  | "other";

type FormState = {
  fullName: string;
  country: string;
  whatsapp: string;
  serviceType: ServiceType;
  platform: string;
  accountIdentifier: string;
  requestedAmount: string;
  notes: string;
};

const serviceTypes: { value: ServiceType; label: string; hint: string }[] = [
  {
    value: "platform_topup",
    label: "شحن منصة",
    hint: "مثل شحن ألماس أو رصيد داخل منصة بث مباشر. لا ترسل كلمة مرور أو رمز تحقق.",
  },
  {
    value: "withdrawal",
    label: "سحب أرباح",
    hint: "طلب متابعة سحب أرباح من منصة أو برنامج. سيتم تأكيد التفاصيل عبر واتساب قبل أي متابعة.",
  },
  {
    value: "digital_service",
    label: "خدمة رقمية",
    hint: "أي خدمة رقمية مرتبطة بالحسابات أو المنصات بدون مشاركة بيانات دخول حساسة.",
  },
  {
    value: "technical_support",
    label: "دعم فني",
    hint: "مشكلة تقنية أو متابعة حساب أو منصة. اشرح المشكلة بدون إرسال كلمات مرور أو أكواد تحقق.",
  },
  {
    value: "other",
    label: "طلب آخر",
    hint: "اكتب تفاصيل الطلب في الملاحظات مع تجنب أي معلومات حساسة غير مطلوبة.",
  },
];

const platforms = [
  "TikTok",
  "BIGO LIVE",
  "Yaahlan",
  "Xena",
  "Catchii",
  "منصة أخرى",
];

const safetyNotes = [
  "لا ترسل كلمة مرور حسابك أو رمز التحقق أو أي بيانات دخول حساسة.",
  "اكتب معرف الحساب أو اسم المستخدم فقط إذا كان ضرورياً لفهم الطلب.",
  "احتفظ بكود الطلب بعد الإرسال لأنه يستخدم في صفحة تتبع طلب الخدمة.",
  "لا يوجد دفع إلكتروني مباشر داخل هذه الصفحة؛ يتم تأكيد التفاصيل عبر واتساب أولاً.",
];

const initialFormState: FormState = {
  fullName: "",
  country: "",
  whatsapp: "",
  serviceType: "platform_topup",
  platform: "TikTok",
  accountIdentifier: "",
  requestedAmount: "",
  notes: "",
};

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export default function ServiceRequestPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState("");
  const [message, setMessage] = useState("");

  const selectedService = useMemo(() => {
    return serviceTypes.find((item) => item.value === form.serviceType);
  }, [form.serviceType]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function generateRequestCode() {
    const year = new Date().getFullYear();
    const timePart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(Math.random() * 900 + 100);
    return `SR-${year}-${timePart}${randomPart}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSuccessCode("");

    const cleanedWhatsapp = normalizeDigits(form.whatsapp);

    if (!form.fullName.trim()) {
      setMessage("يرجى كتابة الاسم الكامل.");
      return;
    }

    if (!cleanedWhatsapp || cleanedWhatsapp.length < 8) {
      setMessage("يرجى كتابة رقم واتساب صحيح لا يقل عن 8 أرقام.");
      return;
    }

    if (!form.serviceType.trim()) {
      setMessage("يرجى اختيار نوع الخدمة.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("الاتصال بقاعدة البيانات غير مفعل حالياً.");
      return;
    }

    const requestCode = generateRequestCode();

    setIsSubmitting(true);

    const { error } = await supabase.from("service_requests").insert({
      request_code: requestCode,
      full_name: form.fullName.trim(),
      country: form.country.trim(),
      whatsapp: form.whatsapp.trim(),
      service_type: form.serviceType,
      platform: form.platform.trim(),
      account_identifier: form.accountIdentifier.trim(),
      requested_amount: form.requestedAmount.trim(),
      notes: form.notes.trim(),
      status: "new",
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Service request insert error:", error);
      setMessage(
        "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب."
      );
      return;
    }

    setSuccessCode(requestCode);
    setMessage(
      "تم استلام طلبك بنجاح. احتفظ بكود الطلب لاستخدامه في صفحة التتبع، وسيقوم فريق وكالة حمزة بمراجعة الطلب والتواصل معك عبر واتساب."
    );

    setForm(initialFormState);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] px-5 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.32),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(40,10,70,0.35),rgba(7,0,9,0.95))]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.55)_1px,transparent_0)] [background-size:44px_44px]" />
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
            href="/digital-services"
            className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15"
          >
            الخدمات الرقمية
          </Link>
        </nav>

        <div className="mb-8 rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.14)] backdrop-blur">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
            HAMZA AGENCY Digital Services
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            طلب خدمة رقمية
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70">
            أرسل طلبك للوكالة، وسيقوم فريق وكالة حمزة بمراجعة التفاصيل ثم
            التواصل معك عبر واتساب للتأكيد والمتابعة.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="الاسم الكامل">
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  placeholder="اكتب اسمك الكامل"
                  autoComplete="name"
                  className={inputClassName}
                />
              </Field>

              <Field label="الدولة">
                <input
                  value={form.country}
                  onChange={(event) =>
                    updateField("country", event.target.value)
                  }
                  placeholder="مثال: تركيا"
                  autoComplete="country-name"
                  className={inputClassName}
                />
              </Field>

              <Field label="رقم واتساب">
                <input
                  value={form.whatsapp}
                  onChange={(event) =>
                    updateField("whatsapp", event.target.value)
                  }
                  placeholder="+905011730377"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputClassName}
                />
              </Field>

              <Field label="نوع الخدمة">
                <select
                  value={form.serviceType}
                  onChange={(event) =>
                    updateField("serviceType", event.target.value as ServiceType)
                  }
                  className={inputClassName}
                >
                  {serviceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="المنصة">
                <select
                  value={form.platform}
                  onChange={(event) =>
                    updateField("platform", event.target.value)
                  }
                  className={inputClassName}
                >
                  {platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="معرّف الحساب / ID">
                <input
                  value={form.accountIdentifier}
                  onChange={(event) =>
                    updateField("accountIdentifier", event.target.value)
                  }
                  placeholder="اكتب ID الحساب أو اسم المستخدم"
                  autoComplete="off"
                  className={inputClassName}
                />
              </Field>

              <Field label="المبلغ أو الكمية المطلوبة">
                <input
                  value={form.requestedAmount}
                  onChange={(event) =>
                    updateField("requestedAmount", event.target.value)
                  }
                  placeholder="مثال: 1000 ألماسة / 50$ / حسب الطلب"
                  className={inputClassName}
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field label="ملاحظات إضافية">
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="اكتب أي تفاصيل تساعد فريق الوكالة على فهم الطلب بدون كلمات مرور أو رموز تحقق"
                  className={`${inputClassName} min-h-36 resize-none`}
                />
              </Field>
            </div>

            {selectedService && (
              <div className="mt-5 rounded-3xl border border-purple-400/20 bg-purple-500/10 p-5 text-sm leading-7 text-purple-100">
                <span className="font-black">ملاحظة:</span>{" "}
                {selectedService.hint}
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-50/80">
              <h2 className="font-black text-yellow-100">تنبيهات أمان قبل الإرسال</h2>
              <div className="mt-3 grid gap-2">
                {safetyNotes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>

            {message && (
              <div
                className={`mt-5 rounded-3xl border p-5 text-center font-bold leading-8 ${
                  successCode
                    ? "border-green-400/30 bg-green-500/10 text-green-100"
                    : "border-yellow-400/30 bg-yellow-500/10 text-yellow-100"
                }`}
              >
                <p>{message}</p>

                {successCode && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                    كود تتبع الطلب:
                    <span className="mr-2 font-black text-yellow-200" dir="ltr">
                      {successCode}
                    </span>
                    <Link
                      href="/service-status"
                      className="mt-3 block text-sm font-black text-purple-100 underline underline-offset-4"
                    >
                      فتح صفحة تتبع طلب الخدمة
                    </Link>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-xl font-black shadow-[0_0_35px_rgba(168,85,247,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "جارٍ إرسال الطلب..." : "إرسال طلب الخدمة"}
            </button>
          </form>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-6 backdrop-blur">
              <h2 className="text-2xl font-black text-yellow-100">
                مهم قبل الإرسال
              </h2>

              <p className="mt-4 leading-8 text-yellow-50/75">
                هذه الصفحة مخصصة لاستلام الطلب فقط. لا يوجد حالياً دفع إلكتروني
                مباشر داخل الموقع، وسيتم تأكيد التفاصيل عبر واتساب قبل تنفيذ أي
                خدمة.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <h2 className="text-2xl font-black">ماذا يحدث بعد الإرسال؟</h2>

              <div className="mt-5 space-y-4 text-white/65">
                <Step number="1" text="يتم حفظ طلبك في نظام وكالة حمزة." />
                <Step number="2" text="تحصل على كود طلب خاص لتتبّع الحالة." />
                <Step number="3" text="يراجع الفريق تفاصيل الخدمة المطلوبة." />
                <Step number="4" text="يتم التواصل معك عبر واتساب للتأكيد." />
                <Step number="5" text="بعد الاتفاق تبدأ متابعة الطلب." />
              </div>
            </div>

            <div className="rounded-[2rem] border border-green-400/20 bg-green-500/10 p-6 backdrop-blur">
              <h2 className="text-2xl font-black text-green-100">
                تحتاج تواصل مباشر؟
              </h2>

              <a
                href="https://wa.me/905011730377"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full justify-center rounded-full bg-green-500 px-6 py-4 font-black text-white"
              >
                فتح واتساب
              </a>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

const inputClassName =
  "w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/70 focus:ring-4 focus:ring-purple-500/10";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-3 block text-sm font-black text-white/75">
        {label}
      </span>
      {children}
    </label>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-black text-purple-100">
        {number}
      </div>

      <p className="leading-8">{text}</p>
    </div>
  );
}
