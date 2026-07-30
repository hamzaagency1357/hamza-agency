"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";

type Membership = {
  tenant_id: string;
  role: PortalRole;
  status: "invited" | "active" | "suspended" | "revoked";
};

type Copy = {
  title: string;
  subtitle: string;
  loading: string;
  denied: string;
  signOut: string;
  privacy: string;
  sessions: string;
  notifications: string;
};

const copy: Record<string, Copy> = {
  ar: {
    title: "بوابة التشغيل",
    subtitle: "مساحة آمنة ومخصصة لإدارة عملك مع وكالة حمزة.",
    loading: "جارٍ التحقق من الحساب…",
    denied: "لا يملك هذا الحساب عضوية فعالة في هذه البوابة.",
    signOut: "تسجيل الخروج",
    privacy: "مركز الخصوصية",
    sessions: "الأجهزة والجلسات",
    notifications: "الإشعارات",
  },
  en: {
    title: "Operations portal",
    subtitle: "A secure workspace for your activity with HAMZA AGENCY.",
    loading: "Verifying your account…",
    denied: "This account has no active membership for this portal.",
    signOut: "Sign out",
    privacy: "Privacy center",
    sessions: "Devices and sessions",
    notifications: "Notifications",
  },
  tr: {
    title: "Operasyon portalı",
    subtitle: "HAMZA AGENCY çalışmalarınız için güvenli alan.",
    loading: "Hesabınız doğrulanıyor…",
    denied: "Bu hesabın bu portal için etkin üyeliği yok.",
    signOut: "Çıkış yap",
    privacy: "Gizlilik merkezi",
    sessions: "Cihazlar ve oturumlar",
    notifications: "Bildirimler",
  },
};

const roleCards: Record<PortalRole, { href: string; ar: string; en: string; tr: string }[]> = {
  creator: [
    { href: "/portal/creator/profile", ar: "الملف الشخصي والبرنامج", en: "Profile and program", tr: "Profil ve program" },
    { href: "/portal/creator/tracking", ar: "سجل الطلبات والتتبع", en: "Requests and tracking", tr: "Başvurular ve takip" },
    { href: "/portal/creator/tasks", ar: "المهام والإعلانات", en: "Tasks and announcements", tr: "Görevler ve duyurular" },
    { href: "/portal/creator/support", ar: "الدعم والمعرفة", en: "Support and knowledge", tr: "Destek ve bilgi" },
  ],
  client: [
    { href: "/portal/client/requests", ar: "طلبات الخدمات", en: "Service requests", tr: "Hizmet talepleri" },
    { href: "/portal/client/orders", ar: "الطلبات والمدفوعات", en: "Orders and payments", tr: "Siparişler ve ödemeler" },
    { href: "/portal/client/files", ar: "الملفات الآمنة", en: "Secure files", tr: "Güvenli dosyalar" },
    { href: "/portal/client/support", ar: "الدعم", en: "Support", tr: "Destek" },
  ],
  employee: [
    { href: "/portal/employee/tasks", ar: "المهام المعينة", en: "Assigned tasks", tr: "Atanan görevler" },
    { href: "/portal/employee/queue", ar: "قائمة الانتظار وSLA", en: "Queue and SLA", tr: "Kuyruk ve SLA" },
    { href: "/portal/employee/escalations", ar: "التصعيدات", en: "Escalations", tr: "Eskalasyonlar" },
    { href: "/portal/employee/performance", ar: "ملخص الأداء", en: "Performance summary", tr: "Performans özeti" },
  ],
  partner: [
    { href: "/portal/partner/profile", ar: "ملف الشريك", en: "Partner profile", tr: "İş ortağı profili" },
    { href: "/portal/partner/offers", ar: "البرامج والعروض", en: "Programs and offers", tr: "Programlar ve teklifler" },
    { href: "/portal/partner/referrals", ar: "الإحالات والعملاء المحتملون", en: "Referrals and leads", tr: "Yönlendirmeler ve fırsatlar" },
    { href: "/portal/partner/reports", ar: "التقارير", en: "Reports", tr: "Raporlar" },
  ],
};

export default function PortalDashboard({ role, locale = "ar" }: { role: PortalRole; locale?: "ar" | "en" | "tr" }) {
  const router = useRouter();
  const strings = copy[locale] ?? copy.ar;
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [email, setEmail] = useState("");
  const cards = useMemo(() => roleCards[role], [role]);

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        setState("denied");
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace(`/portal/login?next=/portal/${role}`);
        return;
      }
      setEmail(auth.user.email ?? "");
      const { data, error } = await supabase
        .from("tenant_memberships")
        .select("tenant_id,role,status")
        .eq("user_id", auth.user.id)
        .eq("role", role)
        .eq("status", "active")
        .limit(1)
        .maybeSingle<Membership>();
      setState(!error && data ? "ready" : "denied");
    })();
  }, [role, router]);

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace("/portal/login");
  }

  if (state === "loading") return <main className="min-h-screen px-5 py-28 text-center text-white">{strings.loading}</main>;
  if (state === "denied") return <main className="min-h-screen px-5 py-28 text-center text-white"><h1 className="text-2xl font-bold">{strings.denied}</h1></main>;

  return (
    <main className="min-h-screen px-4 py-24 text-white sm:px-8">
      <section className="mx-auto max-w-6xl rounded-3xl border border-violet-400/20 bg-black/70 p-5 shadow-2xl backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-violet-200">{email}</p>
            <h1 className="mt-1 text-3xl font-black">{strings.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">{strings.subtitle}</p>
          </div>
          <button onClick={signOut} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-bold hover:bg-white/10">{strings.signOut}</button>
        </div>

        <div className="grid gap-4 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="min-h-32 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-violet-300/50 hover:bg-violet-500/10">
              <span className="text-lg font-bold">{card[locale]}</span>
            </Link>
          ))}
        </div>

        <nav className="grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          <Link href={`/portal/${role}/privacy`} className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-center hover:bg-white/10">{strings.privacy}</Link>
          <Link href={`/portal/${role}/sessions`} className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-center hover:bg-white/10">{strings.sessions}</Link>
          <Link href={`/portal/${role}/notifications`} className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-center hover:bg-white/10">{strings.notifications}</Link>
        </nav>
      </section>
    </main>
  );
}
