"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type PageStatus = "checking" | "ready" | "success" | "error";

const SAFE_LINK_ERROR = "رابط إعادة التعيين غير صالح أو انتهت صلاحيته. أرسل رابطاً جديداً من صفحة نسيت كلمة المرور.";

function getHashParams() {
  const rawHash = window.location.hash.replace(/^#/, "");
  const paramsPart = rawHash.includes("?")
    ? (rawHash.split("?").pop() ?? "")
    : rawHash;

  return new URLSearchParams(paramsPart);
}

function getAuthParam(name: string) {
  const url = new URL(window.location.href);
  const hashParams = getHashParams();

  return url.searchParams.get(name) ?? hashParams.get(name);
}

function clearSensitiveUrl() {
  window.history.replaceState(null, "", "/admin/reset-password");
}

export default function AdminResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<PageStatus>("checking");
  const [message, setMessage] = useState("جاري التحقق من رابط إعادة التعيين...");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let isComplete = false;
    let subscription: { unsubscribe: () => void } | null = null;

    function markReady() {
      if (!isMounted || isComplete) return;

      isComplete = true;
      clearSensitiveUrl();
      setStatus("ready");
      setMessage("اكتب كلمة مرور جديدة لحساب الإدارة.");
    }

    function markError(text = SAFE_LINK_ERROR) {
      if (!isMounted || isComplete) return;

      isComplete = true;
      clearSensitiveUrl();
      setStatus("error");
      setMessage(text);
    }

    async function prepareRecoverySession() {
      if (!isSupabaseConfigured || !supabase) {
        markError("خدمة استعادة كلمة المرور غير متاحة حالياً.");
        return;
      }

      const listener = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          markReady();
        }
      });

      subscription = listener.data.subscription;

      try {
        const urlError = getAuthParam("error") ?? getAuthParam("error_description");

        if (urlError) {
          markError();
          return;
        }

        const code = getAuthParam("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            markError();
            return;
          }

          markReady();
          return;
        }

        const accessToken = getAuthParam("access_token");
        const refreshToken = getAuthParam("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            markError();
            return;
          }

          markReady();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 800));

        if (isComplete) return;

        const { data } = await supabase.auth.getSession();

        if (data.session) {
          markReady();
          return;
        }

        markError();
      } catch {
        markError();
      }
    }

    prepareRecoverySession();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    if (!isSupabaseConfigured || !supabase) {
      setStatus("error");
      setMessage("خدمة استعادة كلمة المرور غير متاحة حالياً.");
      return;
    }

    if (password.length < 8) {
      setFormError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setIsSaving(false);
      setFormError("تعذر حفظ كلمة المرور الجديدة. أرسل رابطاً جديداً وحاول مرة أخرى.");
      return;
    }

    await supabase.auth.signOut();
    setIsSaving(false);
    setStatus("success");
    setMessage("تم تحديث كلمة المرور بنجاح. سيتم تحويلك إلى تسجيل الدخول.");
    router.replace("/admin/login?passwordReset=success");
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
          <h1 className="mt-3 text-3xl font-black">تعيين كلمة مرور جديدة</h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            هذه الصفحة مخصصة لاستعادة حسابات إدارة وكالة حمزة فقط.
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

            {formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-200">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500 disabled:opacity-60"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
        )}

        {isError && (
          <div className="mt-5 grid gap-3">
            <Link
              href="/admin/forgot-password"
              className="rounded-xl bg-purple-600 py-3 text-center font-bold hover:bg-purple-500"
            >
              إرسال رابط جديد
            </Link>
            <Link
              href="/admin/login"
              className="rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center font-bold text-white/75 hover:bg-white/10"
            >
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
