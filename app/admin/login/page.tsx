"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("passwordReset") === "success") {
      setNotice("تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
      window.history.replaceState(null, "", "/admin/login");
    }
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!isSupabaseConfigured || !supabase) {
      setError("خدمة تسجيل الدخول غير متاحة حاليًا. حاول مرة أخرى بعد قليل.");
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
      setError("بيانات الدخول غير صحيحة. إذا نسيت كلمة المرور، استخدم رابط الاستعادة الآمن.");
      return;
    }

    router.push("/admin");
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

        <form onSubmit={handleLogin} className="space-y-4" aria-label="نموذج تسجيل دخول الإدارة">
          <div>
            <label htmlFor="admin-email" className="block mb-2 text-sm text-zinc-300">
              البريد الإلكتروني
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-purple-500/20 bg-black/50 px-4 py-3 outline-none focus:border-purple-400"
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block mb-2 text-sm text-zinc-300">
              كلمة المرور
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-purple-500/20 bg-black/50 px-4 py-3 outline-none focus:border-purple-400"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm leading-6">
              {error}
            </div>
          )}

          {notice && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-green-100 text-sm leading-6">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500 disabled:opacity-60"
          >
            {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>

          <Link
            href="/admin/forgot-password"
            className="block w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center text-sm font-bold text-white/70 hover:bg-white/10"
          >
            نسيت كلمة المرور؟
          </Link>
        </form>
      </div>
    </main>
  );
}
