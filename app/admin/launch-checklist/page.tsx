"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type CheckItem = {
  label: string;
  href: string;
  note?: string;
};

const publicChecks: CheckItem[] = [
  { label: "الرئيسية", href: "/" },
  { label: "البرامج", href: "/programs" },
  { label: "TikTok", href: "/programs/tiktok" },
  { label: "BIGO LIVE", href: "/programs/bigo-live" },
  { label: "Yaahlan", href: "/programs/yaahlan" },
  { label: "Xena", href: "/programs/xena" },
  { label: "Catchii", href: "/programs/catchii" },
  { label: "من نحن", href: "/about" },
  { label: "الخدمات", href: "/services" },
  { label: "الخدمات الرقمية", href: "/digital-services" },
  { label: "طلب خدمة", href: "/service-request" },
  { label: "الوظائف", href: "/jobs" },
  { label: "التقييمات", href: "/reviews" },
  { label: "قصص النجاح", href: "/success-stories" },
  { label: "شركاؤنا وبرامجنا", href: "/partners" },
  { label: "المعرض", href: "/gallery" },
  { label: "مركز المعرفة", href: "/knowledge-center" },
  { label: "FAQ", href: "/faq" },
  { label: "اتصل بنا", href: "/contact" },
  { label: "سياسة الخصوصية", href: "/privacy-policy" },
  { label: "الشروط والأحكام", href: "/terms-and-conditions" },
  { label: "AI Policy", href: "/ai-policy" },
];

const adminChecks: CheckItem[] = [
  { label: "لوحة التحكم", href: "/admin" },
  { label: "طلبات الخدمات", href: "/admin/service-requests" },
  { label: "البرامج", href: "/admin/programs" },
  { label: "الصفحات", href: "/admin/pages" },
  { label: "الوسائط", href: "/admin/media" },
  { label: "الإعلانات", href: "/admin/announcements" },
  { label: "الإعدادات", href: "/admin/settings" },
  { label: "الوظائف", href: "/admin/jobs" },
  { label: "التقييمات", href: "/admin/reviews" },
  { label: "قصص النجاح", href: "/admin/success-stories" },
  { label: "الشركاء", href: "/admin/partners" },
  { label: "المعرض", href: "/admin/gallery" },
];

const technicalChecks: CheckItem[] = [
  { label: "sitemap.xml", href: "/sitemap.xml" },
  { label: "robots.txt", href: "/robots.txt" },
  { label: "manifest.webmanifest", href: "/manifest.webmanifest" },
  { label: "health endpoint", href: "/api/health" },
];

export default function LaunchChecklistPage() {
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [adminEmail, setAdminEmail] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allItems = useMemo(
    () => [...publicChecks, ...adminChecks, ...technicalChecks],
    []
  );

  const doneCount = allItems.filter((item) => checked[item.href]).length;
  const progress = Math.round((doneCount / allItems.length) * 100);

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

  function toggleChecked(href: string) {
    setChecked((current) => ({ ...current, [href]: !current[href] }));
  }

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

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-bold text-white/80">تقدم الفحص</span>
              <span className="font-black text-yellow-200">
                {doneCount} / {allItems.length} — {progress}%
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-yellow-300 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <ChecklistSection
          title="الصفحات العامة"
          items={publicChecks}
          checked={checked}
          onToggle={toggleChecked}
        />
        <ChecklistSection
          title="صفحات الإدارة"
          items={adminChecks}
          checked={checked}
          onToggle={toggleChecked}
        />
        <ChecklistSection
          title="الفحوص التقنية"
          items={technicalChecks}
          checked={checked}
          onToggle={toggleChecked}
        />

        <div className="mt-8 rounded-[2rem] border border-purple-500/20 bg-purple-500/10 p-6">
          <h2 className="text-2xl font-black">ملاحظات المرحلة</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-white/65">
            <li>افتح كل رابط وتأكد أن الصفحة تعمل بدون رسائل اختبار أو نصوص داخلية.</li>
            <li>اضغط تم بعد فحص كل رابط حتى تعرف نسبة تقدم الفحص.</li>
            <li>تأكد من الجوال واللابتوب قبل اعتماد الإطلاق.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function ChecklistSection({
  title,
  items,
  checked,
  onToggle,
}: {
  title: string;
  items: CheckItem[];
  checked: Record<string, boolean>;
  onToggle: (href: string) => void;
}) {
  return (
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.href}
            className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-purple-400/50 hover:bg-purple-500/10"
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={item.href}
                target={item.href.startsWith("/admin") ? undefined : "_blank"}
                className="min-w-0 flex-1"
              >
                <div className="font-black text-white">{item.label}</div>
                <div className="mt-1 break-all text-xs text-white/45">
                  {item.href}
                </div>
              </Link>

              <button
                type="button"
                onClick={() => onToggle(item.href)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black transition ${
                  checked[item.href]
                    ? "border-green-400/40 bg-green-500/20 text-green-100"
                    : "border-white/10 bg-white/5 text-white/55"
                }`}
              >
                {checked[item.href] ? "تم" : "فحص"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
