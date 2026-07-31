"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchPortalAccess, isPortalRole } from "@/lib/productExpansion/portalAccessClient";

type Locale = "ar" | "en" | "tr";
const copy = {
  ar: { title: "تسجيل الدخول إلى البوابة", subtitle: "استخدم حسابك الموثق لدى وكالة حمزة.", email: "البريد الإلكتروني", password: "كلمة المرور", login: "دخول", loading: "جارٍ التحقق…", connection: "تعذر الاتصال بخدمة تسجيل الدخول.", invalid: "بيانات الدخول غير صحيحة أو الحساب غير متاح.", membership_pending: "العضوية بانتظار القبول أو التفعيل.", membership_suspended: "تم تعليق العضوية. تواصل مع إدارة وكالة حمزة.", membership_revoked: "تم إلغاء العضوية ولا يمكن استخدام هذه البوابة.", account_suspended: "تم تعليق الحساب مؤقتًا.", account_disabled: "الحساب معطّل أو بانتظار الحذف.", fallback: "تعذر التحقق من صلاحية الحساب حاليًا." },
  en: { title: "Portal sign in", subtitle: "Use your verified HAMZA AGENCY account.", email: "Email", password: "Password", login: "Sign in", loading: "Verifying…", connection: "The sign-in service is unavailable.", invalid: "The credentials are incorrect or the account is unavailable.", membership_pending: "Membership is awaiting acceptance or activation.", membership_suspended: "Membership is suspended. Contact HAMZA AGENCY administration.", membership_revoked: "Membership has been revoked.", account_suspended: "The account is temporarily suspended.", account_disabled: "The account is disabled or pending deletion.", fallback: "Account authorization could not be verified." },
  tr: { title: "Portal girişi", subtitle: "Doğrulanmış HAMZA AGENCY hesabınızı kullanın.", email: "E-posta", password: "Şifre", login: "Giriş yap", loading: "Doğrulanıyor…", connection: "Giriş hizmetine ulaşılamıyor.", invalid: "Bilgiler yanlış veya hesap kullanılamıyor.", membership_pending: "Üyelik kabul veya etkinleştirme bekliyor.", membership_suspended: "Üyelik askıya alındı. HAMZA AGENCY yönetimiyle iletişime geçin.", membership_revoked: "Üyelik iptal edildi.", account_suspended: "Hesap geçici olarak askıya alındı.", account_disabled: "Hesap devre dışı veya silinmeyi bekliyor.", fallback: "Hesap yetkisi doğrulanamadı." },
} satisfies Record<Locale, Record<string, string>>;

export default function PortalLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<Locale>("ar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const strings = copy[locale];

  useEffect(() => {
    const lang = document.documentElement.lang;
    setLocale(lang === "en" || lang === "tr" ? lang : "ar");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!supabase) return setError(strings.connection);
    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setLoading(false); setError(strings.invalid); return; }

    const access = await fetchPortalAccess(supabase);
    setLoading(false);
    if (!access.ok) {
      await supabase.auth.signOut();
      const key = access.code as keyof typeof strings;
      setError(typeof strings[key] === "string" ? strings[key] : strings.fallback);
      return;
    }
    if (!isPortalRole(access.role)) { router.replace("/admin"); return; }
    const roleRoot = `/portal/${access.role}`;
    const requested = searchParams.get("next");
    router.replace(requested?.startsWith(`${roleRoot}/`) || requested === roleRoot ? requested : roleRoot);
  }

  return <main className="min-h-screen px-4 py-28 text-white" dir={locale === "ar" ? "rtl" : "ltr"}><form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-violet-400/20 bg-black/75 p-6 shadow-2xl backdrop-blur"><h1 className="text-3xl font-black">{strings.title}</h1><p className="mt-2 text-sm text-white/65">{strings.subtitle}</p><label className="mt-6 block text-sm font-bold" htmlFor="email">{strings.email}</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-violet-300" /><label className="mt-4 block text-sm font-bold" htmlFor="password">{strings.password}</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-violet-300" />{error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}<button disabled={loading} className="mt-6 min-h-12 w-full rounded-xl bg-violet-600 px-4 font-black hover:bg-violet-500 disabled:opacity-60">{loading ? strings.loading : strings.login}</button></form></main>;
}
