"use client";

import { useEffect, useState } from "react";
import { getCurrentAdminProfile } from "@/lib/adminAccess";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export default function AdminSecurityPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshFactors() {
    if (!supabase) return;
    const { data, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) throw factorError;
    setVerifiedCount(data.totp.filter((factor) => factor.status === "verified").length);
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        if (!isSupabaseConfigured || !supabase) throw new Error("not_configured");
        const access = await getCurrentAdminProfile();
        if (!active) return;
        if (!access.isAuthorized || access.profile?.role !== "super_admin") {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        await refreshFactors();
      } catch {
        if (active) setError("تعذر تحميل إعدادات أمان الحساب.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function beginEnrollment() {
    if (!supabase) return;
    setError("");
    setMessage("");

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: verifiedCount === 0 ? "HAMZA AGENCY Admin" : `HAMZA AGENCY Backup ${verifiedCount + 1}`,
    });

    if (enrollError) {
      setError("تعذر بدء إعداد التحقق الثنائي.");
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setMessage("امسح رمز QR بتطبيق المصادقة، ثم أدخل الرمز المؤقت للتحقق.");
  }

  async function verifyEnrollment() {
    if (!supabase || !enrollment || !/^\d{6}$/.test(code.trim())) {
      setError("أدخل رمز تحقق صحيحًا من 6 أرقام.");
      return;
    }

    setError("");
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: code.trim(),
    });

    if (verifyError) {
      setError("تعذر التحقق من الرمز. تأكد من الرمز وحاول مجددًا.");
      return;
    }

    setEnrollment(null);
    setCode("");
    await refreshFactors();
    setMessage("تم تفعيل عامل التحقق الثنائي بنجاح. ستحتاج إليه في تسجيل الدخول القادم.");
  }

  if (loading) {
    return <div dir="rtl" className="p-6 text-white">جاري تحميل إعدادات الأمان...</div>;
  }

  if (!authorized) {
    return (
      <div dir="rtl" className="p-6 text-white">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5">هذه الصفحة متاحة للمدير الأعلى فقط.</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 p-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">أمان حساب الإدارة</h1>
        <p className="mt-2 text-sm text-zinc-400">
          إعداد التحقق الثنائي TOTP للحساب الإداري. لا يتم فرض MFA تلقائيًا من هذه الصفحة.
        </p>
      </div>

      <section className="rounded-2xl border border-purple-400/20 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">عوامل التحقق المفعلة</h2>
            <p className="mt-1 text-sm text-zinc-400">العدد الحالي: {verifiedCount}</p>
          </div>
          <button
            type="button"
            onClick={beginEnrollment}
            className="rounded-xl bg-purple-600 px-4 py-2 font-bold hover:bg-purple-500"
          >
            {verifiedCount === 0 ? "إعداد التحقق الثنائي" : "إضافة عامل احتياطي"}
          </button>
        </div>
      </section>

      {enrollment && (
        <section className="space-y-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.04] p-5">
          <h2 className="font-bold">ربط تطبيق المصادقة</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="رمز QR لإعداد التحقق الثنائي"
            className="mx-auto h-56 w-56 rounded-xl bg-white p-2"
          />
          <p className="text-sm text-zinc-300">إذا تعذر مسح QR، أدخل المفتاح التالي يدويًا في تطبيق المصادقة:</p>
          <code className="block overflow-x-auto rounded-xl bg-black/40 p-3 text-left text-sm" dir="ltr">
            {enrollment.secret}
          </code>
          <label htmlFor="mfa-enroll-code" className="block text-sm text-zinc-300">رمز التحقق</label>
          <input
            id="mfa-enroll-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-xl border border-purple-500/20 bg-black/50 px-4 py-3 text-center tracking-[0.35em] outline-none focus:border-purple-400"
            placeholder="000000"
          />
          <button
            type="button"
            onClick={verifyEnrollment}
            className="w-full rounded-xl bg-purple-600 px-4 py-3 font-bold hover:bg-purple-500"
          >
            تحقق وفعّل العامل
          </button>
        </section>
      )}

      {message && <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-4 text-green-100">{message}</div>}
      {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-100">{error}</div>}

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-zinc-300">
        <h2 className="mb-2 font-bold text-white">الاسترداد الآمن</h2>
        <p>
          Supabase لا يصدر recovery codes لـTOTP. للحماية من فقدان جهاز واحد، أضف عامل TOTP ثانٍ على جهاز مستقل بعد تفعيل العامل الأول، مع إبقاء استعادة كلمة المرور المؤمنة متاحة.
        </p>
      </section>
    </div>
  );
}
