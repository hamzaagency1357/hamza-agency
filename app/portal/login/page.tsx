"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PortalLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("تعذر الاتصال بخدمة تسجيل الدخول.");
      return;
    }
    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      setError("بيانات الدخول غير صحيحة أو الحساب غير متاح.");
      return;
    }
    const next = searchParams.get("next");
    router.replace(next?.startsWith("/portal/") ? next : "/portal/creator");
  }

  return (
    <main className="min-h-screen px-4 py-28 text-white">
      <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-violet-400/20 bg-black/75 p-6 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-black">تسجيل الدخول إلى البوابة</h1>
        <p className="mt-2 text-sm text-white/65">استخدم حسابك الموثق لدى وكالة حمزة.</p>
        <label className="mt-6 block text-sm font-bold" htmlFor="email">البريد الإلكتروني</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-violet-300" />
        <label className="mt-4 block text-sm font-bold" htmlFor="password">كلمة المرور</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-violet-300" />
        {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
        <button disabled={loading} className="mt-6 min-h-12 w-full rounded-xl bg-violet-600 px-4 font-black hover:bg-violet-500 disabled:opacity-60">{loading ? "جارٍ التحقق…" : "دخول"}</button>
      </form>
    </main>
  );
}
