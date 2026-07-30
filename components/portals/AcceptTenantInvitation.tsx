"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AcceptTenantInvitation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [state, setState] = useState<"checking" | "ready" | "submitting" | "success" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        setState("error");
        setMessage("الخدمة غير مهيأة حالياً.");
        return;
      }
      if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
        setState("error");
        setMessage("رابط الدعوة غير صالح.");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const next = `/portal/accept-invitation?token=${encodeURIComponent(token)}`;
        router.replace(`/portal/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setState("ready");
    })();
  }, [router, token]);

  async function accept() {
    if (!supabase || state === "submitting") return;
    setState("submitting");
    setMessage("");
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      setState("error");
      setMessage("انتهت الجلسة. سجّل الدخول مجدداً.");
      return;
    }
    try {
      const response = await fetch("/api/product-expansion/invitations/accept", {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.code === "string" ? body.code : "invitation_accept_failed");
      const membership = body.membership && typeof body.membership === "object" ? body.membership as Record<string, unknown> : {};
      const role = typeof membership.role === "string" ? membership.role : "";
      setState("success");
      setMessage("تم قبول الدعوة وربط الحساب بمساحة العمل بنجاح.");
      const target = ["creator", "client", "employee", "partner"].includes(role) ? `/portal/${role}` : "/admin/product-expansion";
      window.setTimeout(() => router.replace(target), 900);
    } catch (error) {
      setState("error");
      const code = error instanceof Error ? error.message : "invitation_accept_failed";
      const messages: Record<string, string> = {
        invitation_accept_failed: "تعذر قبول الدعوة. قد تكون منتهية أو مستخدمة أو مرتبطة ببريد مختلف.",
        unauthenticated: "يجب تسجيل الدخول أولاً.",
        invalid_token: "رمز الدعوة غير صالح.",
      };
      setMessage(messages[code] ?? "تعذر قبول الدعوة. تحقق من الحساب والرابط ثم أعد المحاولة.");
    }
  }

  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir="rtl">
      <section className="mx-auto max-w-xl rounded-3xl border border-violet-300/20 bg-white/5 p-7 shadow-2xl">
        <p className="text-sm text-violet-200">HAMZA AGENCY</p>
        <h1 className="mt-2 text-3xl font-black">قبول دعوة الانضمام</h1>
        <p className="mt-3 text-white/60">يجب أن يكون البريد المسجّل في حسابك مطابقاً للبريد الذي استلم الدعوة. الرابط صالح للاستخدام مرة واحدة فقط.</p>
        {state === "checking" && <p className="mt-6 rounded-xl bg-white/5 p-4">جارٍ التحقق من الجلسة والرابط…</p>}
        {message && <p role="status" className={`mt-6 rounded-xl border p-4 ${state === "success" ? "border-emerald-300/20 bg-emerald-500/10" : "border-red-300/20 bg-red-500/10"}`}>{message}</p>}
        {state === "ready" && <button type="button" onClick={() => void accept()} className="mt-6 min-h-12 w-full rounded-xl bg-violet-600 px-5 font-bold">قبول الدعوة</button>}
        {state === "submitting" && <button type="button" disabled className="mt-6 min-h-12 w-full rounded-xl bg-violet-600 px-5 font-bold opacity-60">جارٍ ربط العضوية…</button>}
        {state === "error" && <button type="button" onClick={() => router.replace("/portal/login")} className="mt-6 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-5 font-bold">العودة إلى تسجيل الدخول</button>}
      </section>
    </main>
  );
}
