"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type PageStatus = "checking" | "ready" | "success" | "error";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<PageStatus>("checking");
  const [message, setMessage] = useState("جاري التحقق من رابط إعادة التعيين...");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function prepareRecoverySession() {
      if (!isSupabaseConfigured || !supabase) {
        setStatus("error");
        setMessage("Supabase غير متصل حالياً.");
        return;
      }

      const hash = window.location.hash;

      if (!hash) {
        setStatus("error");
        setMessage("رابط إعادة تعيين كلمة المرور غير مكتمل. أرسل رابطاً جديداً من Supabase.");
        return;
      }

      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setStatus("error");
        setMessage("رابط إعادة تعيين كلمة المرور منتهي أو غير صالح. أرسل رابطاً جديداً.");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setStatus("error");
        setMessage("تعذر تفعيل جلسة إعادة التعيين. أرسل رابطاً جديداً وجرب مرة أخرى.");
        return;
      }

      setStatus("ready");
      setMessage("اكتب كلمة مرور جديدة لحساب الإدارة.");
    }

    prepareRecoverySession();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setStatus("error");
      setMessage("Supabase غير متصل حالياً.");
      return;
    }

    if (password.length < 8) {
      setStatus("ready");
      setMessage("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("ready");
      setMessage("كلمتا المرور غير متطابقتين.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      setStatus("error");
      setMessage("لم يتم حفظ كلمة المرور الجديدة. أرسل رابطاً جديداً وجرب مرة أخرى.");
      return;
    }

    await supabase.auth.signOut();
    setStatus("success");
    setMessage("تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول إلى لوحة الإدارة.");
  }

  const isReady = status === "ready";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-black/45 p-6 shadow-[0_0_80px_rgba(124,58,237,0.18)]">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200">
            HAMZA AGENCY
          </p>
          <h1 className="mt-3 text-3xl font-black">إعادة تعيين كلمة المرور</h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            هذه الصفحة مخصصة لحسابات إدارة وكالة حمزة.
          </p>
        </div>

        <div
          className={`mb-5 rounded-2xl border p-4 text-sm leading-7 ${
            isSuccess
              ? "border-green-400/25 bg-green-500/10 text-green-100"
              : isError
                ? "border-red-400/25 bg-red-500/10 text-red-100"
                : "border-purple-400/25 bg-purple-500/10 text-purple-100"
          }`}
        >
          {message}
        </div>

        {isReady && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-purple-500/20 bg-black/50 px-4 py-3 outline-none focus:border-purple-400"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-purple-500/20 bg-black/50 px-4 py-3 outline-none focus:border-purple-400"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500 disabled:opacity-60"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
        )}

        {isSuccess && (
          <Link
            href="/admin/login"
            className="mt-5 block rounded-xl bg-purple-600 py-3 text-center font-bold hover:bg-purple-500"
          >
            الذهاب إلى تسجيل دخول الإدارة
          </Link>
        )}

        {isError && (
          <div className="mt-5 grid gap-3">
            <Link
              href="/admin/login"
              className="rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center font-bold text-white/75 hover:bg-white/10"
            >
              العودة إلى تسجيل الدخول
            </Link>
            <p className="text-center text-xs leading-6 text-white/45">
              إذا انتهت صلاحية الرابط، أرسل رابطاً جديداً من Supabase Authentication.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
