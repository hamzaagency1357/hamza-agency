"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResetMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase غير متصل حالياً.");
      return;
    }

    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setError("بيانات الدخول غير صحيحة. إذا كنت متأكداً من البريد، استخدم خيار نسيت كلمة المرور لتعيين كلمة جديدة.");
      return;
    }

    router.push("/admin");
  }

  async function handlePasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResetMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase غير متصل حالياً.");
      return;
    }

    if (!email) {
      setError("اكتب بريد حساب الإدارة أولاً.");
      return;
    }

    setIsSendingReset(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const technicalMessage = error.message || "خطأ غير معروف من Supabase";

        if (technicalMessage.toLowerCase().includes("rate limit")) {
          setError(`تم إرسال روابط كثيرة خلال وقت قصير. انتظر 60 إلى 90 دقيقة ثم حاول مرة واحدة فقط. سبب Supabase: ${technicalMessage}`);
          return;
        }

        setError(`تعذر إرسال رابط استعادة كلمة المرور. سبب Supabase: ${technicalMessage}`);
        return;
      }

      setResetMessage("تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد. افتح الإيميل واتبع الرابط.");
    } catch (error) {
      const technicalMessage = error instanceof Error ? error.message : "خطأ غير معروف";
      setError(`تعذر الاتصال بـ Supabase لإرسال رابط الاستعادة. السبب التقني: ${technicalMessage}`);
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#070009] text-white flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-black/40 p-6 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center">
          تسجيل دخول الإدارة
        </h1>

        <p className="text-zinc-400 text-center mb-8">
          لوحة إدارة وكالة حمزة
        </p>

        {!isResetMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-zinc-300">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-purple-500/20 bg-black/50 px-4 py-3 outline-none focus:border-purple-400"
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-zinc-300">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-purple-500/20 bg-black/50 px-4 py-3 outline-none focus:border-purple-400"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm leading-6">
                {error}
              </div>
            )}

            {resetMessage && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-green-100 text-sm leading-6">
                {resetMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500 disabled:opacity-60"
            >
              {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setResetMessage("");
                setIsResetMode(true);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white/70 hover:bg-white/10"
            >
              نسيت كلمة المرور؟
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-zinc-300">
                بريد حساب الإدارة
              </label>
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
              سنرسل رابطاً آمناً إلى البريد لتعيين كلمة مرور جديدة. الرابط يفتح صفحة إعادة التعيين داخل الموقع الرسمي.
            </p>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm leading-6">
                {error}
              </div>
            )}

            {resetMessage && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-green-100 text-sm leading-6">
                {resetMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingReset}
              className="w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500 disabled:opacity-60"
            >
              {isSendingReset ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setResetMessage("");
                setIsResetMode(false);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white/70 hover:bg-white/10"
            >
              العودة إلى تسجيل الدخول
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
