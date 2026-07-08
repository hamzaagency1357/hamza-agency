"use client";

import Link from "next/link";
import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const SAFE_RESET_MESSAGE = "إذا كان البريد مسجلاً، سيتم إرسال رابط استعادة كلمة المرور.";
const DEFAULT_SITE_URL = "https://hamza-agency.com";

function getResetRedirectUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (configuredSiteUrl) {
    return `${configuredSiteUrl}/admin/reset-password`;
  }

  if (typeof window === "undefined") {
    return `${DEFAULT_SITE_URL}/admin/reset-password`;
  }

  const currentOrigin = window.location.origin.replace(/\/+$/, "");
  const isLocalOrigin = currentOrigin.includes("localhost") || currentOrigin.includes("127.0.0.1");

  return `${isLocalOrigin ? DEFAULT_SITE_URL : currentOrigin}/admin/reset-password`;
}

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("يرجى إدخال البريد الإلكتروني.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("خدمة استعادة كلمة المرور غير متاحة حالياً.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getResetRedirectUrl(),
    });

    setIsSubmitting(false);

    if (error?.message?.toLowerCase().includes("rate limit")) {
      setError("تم طلب روابط كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مرة واحدة فقط.");
      return;
    }

    setMessage(SAFE_RESET_MESSAGE);
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-black/45 p-6 shadow-[0_0_80px_rgba(124,58,237,0.18)]">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200">
            HAMZA AGENCY
          </p>
          <h1 className="mt-3 text-3xl font-black">استعادة كلمة المرور</h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            أدخل بريد حساب الإدارة، وسنرسل رابطاً آمناً لتعيين كلمة مرور جديدة.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-purple-500/20 bg-black/50 px-4 py-3 outline-none focus:border-purple-400"
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </div>

          <p className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-sm leading-6 text-purple-100">
            لن نعرض هل البريد موجود أم لا. إذا كان الحساب مسجلاً، سيصلك رابط الاستعادة على البريد.
          </p>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm leading-6 text-green-100">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500 disabled:opacity-60"
          >
            {isSubmitting ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
          </button>

          <Link
            href="/admin/login"
            className="block rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center text-sm font-bold text-white/70 hover:bg-white/10"
          >
            العودة إلى تسجيل الدخول
          </Link>
        </form>
      </div>
    </main>
  );
}
