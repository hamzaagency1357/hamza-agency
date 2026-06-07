"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const publicChecks = [
  ["الرئيسية", "/"],
  ["البرامج", "/programs"],
  ["TikTok", "/programs/tiktok"],
  ["BIGO LIVE", "/programs/bigo-live"],
  ["Yaahlan", "/programs/yaahlan"],
  ["Xena", "/programs/xena"],
  ["Catchii", "/programs/catchii"],
  ["من نحن", "/about"],
  ["الخدمات", "/services"],
  ["الخدمات الرقمية", "/digital-services"],
  ["طلب خدمة", "/service-request"],
  ["الوظائف", "/jobs"],
  ["التقييمات", "/reviews"],
  ["قصص النجاح", "/success-stories"],
  ["شركاؤنا وبرامجنا", "/partners"],
  ["المعرض", "/gallery"],
  ["مركز المعرفة", "/knowledge-center"],
  ["FAQ", "/faq"],
  ["اتصل بنا", "/contact"],
  ["سياسة الخصوصية", "/privacy-policy"],
  ["الشروط والأحكام", "/terms-and-conditions"],
  ["AI Policy", "/ai-policy"],
];

const adminChecks = [
  ["لوحة التحكم", "/admin"],
  ["طلبات الخدمات", "/admin/service-requests"],
  ["البرامج", "/admin/programs"],
  ["الصفحات", "/admin/pages"],
  ["الوسائط", "/admin/media"],
  ["الإعلانات", "/admin/announcements"],
  ["الإعدادات", "/admin/settings"],
  ["الوظائف", "/admin/jobs"],
  ["التقييمات", "/admin/reviews"],
  ["قصص النجاح", "/admin/success-stories"],
  ["الشركاء", "/admin/partners"],
  ["المعرض", "/admin/gallery"],
];

const technicalChecks = [
  ["sitemap.xml", "/sitemap.xml"],
  ["robots.txt", "/robots.txt"],
  ["manifest.webmanifest", "/manifest.webmanifest"],
  ["health endpoint", "/api/health"],
];

export default function LaunchChecklistPage() {
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    async function checkAdminAccess() {
      if (!isSupabaseConfigured || !supabase) {
        router.replace("/admin/login");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const { data: isAdmin, error } = await supabase.rpc(
        "current_user_is_admin"
      );

      if (error || !isAdmin) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(session.user.email || "");
      setStatus("ready");
    }

    checkAdminAccess();
  }, [router]);

  if (status === "checking") {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white"
      >
        <div className="rounded-3xl border border-purple-500/25 bg-black/45 p-8 text-center">
          جاري التحقق من صلاحية الدخول...
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-yellow-400/25 bg-black/45 p-6 shadow-[0_0_80px_rgba(124,58,237,0.16)]">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-yellow-200">
            HAMZA AGENCY
          </p>
          <h1 className="mt-3 text-4xl font-black">فحص الإطلاق V1</h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            صفحة داخلية لمراجعة روابط الإطلاق الأساسية بسرعة قبل ربط الدومين
            الرسمي. الأدمن الحالي: {adminEmail}
          </p>
        </div>

        <ChecklistSection title="الصفحات العامة" items={publicChecks} />
        <ChecklistSection title="صفحات الإدارة" items={adminChecks} />
        <ChecklistSection title="الفحوص التقنية" items={technicalChecks} />

        <div className="mt-8 rounded-[2rem] border border-purple-500/20 bg-purple-500/10 p-6">
          <h2 className="text-2xl font-black">ملاحظات المرحلة</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-white/65">
            <li>افتح كل رابط وتأكد أن الصفحة تعمل بدون رسائل اختبار أو نصوص داخلية.</li>
            <li>تأكد من الجوال واللابتوب قبل اعتماد الإطلاق.</li>
            <li>بعد اكتمال الفحص، ننتقل لربط الدومين الرسمي.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function ChecklistSection({
  title,
  items,
}: {
  title: string;
  items: string[][];
}) {
  return (
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            target={href.startsWith("/admin") ? undefined : "_blank"}
            className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-purple-400/50 hover:bg-purple-500/10"
          >
            <div className="font-black text-white">{label}</div>
            <div className="mt-1 text-xs text-white/45">{href}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
