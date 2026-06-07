"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type CheckItem = {
  label: string;
  href: string;
};

type CheckResult = {
  status: "idle" | "checking" | "ok" | "warning" | "error";
  statusCode?: number;
  message: string;
  durationMs?: number;
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

const timeoutMs = 12000;

export default function LaunchChecklistPage() {
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [adminEmail, setAdminEmail] = useState("");
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [isRunning, setIsRunning] = useState(false);

  const allItems = useMemo(
    () => [...publicChecks, ...adminChecks, ...technicalChecks],
    []
  );

  const okCount = allItems.filter((item) => results[item.href]?.status === "ok")
    .length;
  const warningCount = allItems.filter(
    (item) => results[item.href]?.status === "warning"
  ).length;
  const errorCount = allItems.filter(
    (item) => results[item.href]?.status === "error"
  ).length;
  const checkedCount = okCount + warningCount + errorCount;
  const progress = Math.round((checkedCount / allItems.length) * 100);

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

  async function runSingleCheck(item: CheckItem): Promise<CheckResult> {
    const startedAt = performance.now();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(item.href, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });

      const durationMs = Math.round(performance.now() - startedAt);
      const finalUrl = new URL(response.url);
      const requestedUrl = new URL(item.href, window.location.origin);
      const redirectedToLogin = finalUrl.pathname.includes("/admin/login");

      if (redirectedToLogin) {
        return {
          status: "error",
          statusCode: response.status,
          message: "تم التحويل إلى صفحة تسجيل الدخول",
          durationMs,
        };
      }

      if (finalUrl.pathname !== requestedUrl.pathname) {
        return {
          status: response.ok ? "warning" : "error",
          statusCode: response.status,
          message: `تحويل إلى ${finalUrl.pathname}`,
          durationMs,
        };
      }

      if (!response.ok) {
        return {
          status: "error",
          statusCode: response.status,
          message: `HTTP ${response.status}`,
          durationMs,
        };
      }

      return {
        status: "ok",
        statusCode: response.status,
        message: "يعمل",
        durationMs,
      };
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = error instanceof Error ? error.message : "فشل الفحص";

      return {
        status: "error",
        message: message.includes("aborted") ? "انتهت مهلة الفحص" : message,
        durationMs,
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function runAllChecks() {
    setIsRunning(true);
    setResults(
      Object.fromEntries(
        allItems.map((item) => [
          item.href,
          { status: "checking", message: "جاري الفحص" },
        ])
      )
    );

    for (const item of allItems) {
      const result = await runSingleCheck(item);
      setResults((current) => ({ ...current, [item.href]: result }));
    }

    setIsRunning(false);
  }

  function resetResults() {
    setResults({});
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
            فحص تلقائي للروابط الأساسية مع تشخيص وسبب محتمل واقتراح إصلاح.
            الأدمن الحالي: {adminEmail}
          </p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-bold text-white/80">تقدم الفحص التلقائي</span>
              <span className="font-black text-yellow-200" dir="ltr">
                {progress}% — {checkedCount} / {allItems.length}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-yellow-300 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SummaryCard label="يعمل" value={okCount} tone="green" />
              <SummaryCard label="تحذير" value={warningCount} tone="yellow" />
              <SummaryCard label="خطأ" value={errorCount} tone="red" />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={runAllChecks}
                disabled={isRunning}
                className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunning ? "جاري الفحص..." : "تشغيل الفحص التلقائي"}
              </button>

              <button
                type="button"
                onClick={resetResults}
                disabled={isRunning}
                className="rounded-full border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-black text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                مسح النتائج
              </button>
            </div>
          </div>
        </div>

        <ChecklistSection title="الصفحات العامة" items={publicChecks} results={results} />
        <ChecklistSection title="صفحات الإدارة" items={adminChecks} results={results} />
        <ChecklistSection title="الفحوص التقنية" items={technicalChecks} results={results} />

        <div className="mt-8 rounded-[2rem] border border-purple-500/20 bg-purple-500/10 p-6">
          <h2 className="text-2xl font-black">ملاحظات الفحص</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-white/65">
            <li>الفحص يتحقق من استجابة الصفحة وكود الحالة والتحويلات غير المتوقعة.</li>
            <li>كل خطأ أو تحذير سيظهر معه تفسير مختصر واقتراح إصلاح.</li>
            <li>الإصلاحات الخطرة مثل تعديل كود أو RLS لا تتم تلقائياً حفاظاً على المشروع.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function ChecklistSection({
  title,
  items,
  results,
}: {
  title: string;
  items: CheckItem[];
  results: Record<string, CheckResult>;
}) {
  return (
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const result = results[item.href] || {
            status: "idle",
            message: "لم يتم الفحص بعد",
          };
          const advice = getFixAdvice(item, result);

          return (
            <div
              key={item.href}
              className={`rounded-2xl border p-4 transition ${resultClasses(
                result.status
              )}`}
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

                <span className={statusBadgeClasses(result.status)}>
                  {statusLabel(result.status)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
                <span>{result.message}</span>
                {typeof result.statusCode === "number" && (
                  <span dir="ltr">HTTP {result.statusCode}</span>
                )}
                {typeof result.durationMs === "number" && (
                  <span dir="ltr">{result.durationMs}ms</span>
                )}
              </div>

              {advice && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/62">
                  <span className="font-black text-yellow-100">اقتراح الإصلاح: </span>
                  {advice}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow" | "red";
}) {
  const tones = {
    green: "border-green-400/25 bg-green-500/10 text-green-100",
    yellow: "border-yellow-400/25 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/25 bg-red-500/10 text-red-100",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-black" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function getFixAdvice(item: CheckItem, result: CheckResult) {
  if (result.status === "idle" || result.status === "checking") return "";
  if (result.status === "ok") return "لا يحتاج إصلاح. افتح الصفحة بصرياً فقط للتأكد من التصميم والنصوص.";

  if (result.message.includes("تسجيل الدخول")) {
    return "راجع جلسة الأدمن أو صلاحيات الوصول. افتح الصفحة مباشرة بعد تسجيل الدخول وتأكد أنها لا تعيدك إلى صفحة الدخول.";
  }

  if (result.message.includes("تحويل إلى")) {
    return "يوجد تحويل غير متوقع. راجع المسار الصحيح، أو إعدادات redirect، أو حماية الصفحة.";
  }

  if (result.message.includes("مهلة")) {
    return "الصفحة بطيئة أو لا تستجيب. راجع البيانات الثقيلة، الصور، الفيديوهات، أو استعلامات Supabase.";
  }

  if (result.statusCode === 404) {
    return `المسار ${item.href} غير موجود. يجب إنشاء الصفحة أو تعديل الرابط إلى المسار الصحيح.`;
  }

  if (result.statusCode === 401 || result.statusCode === 403) {
    return "مشكلة صلاحيات. راجع Supabase Auth أو RLS أو شرط current_user_is_admin.";
  }

  if (result.statusCode && result.statusCode >= 500) {
    return "خطأ سيرفر. راجع كود الصفحة، استعلامات Supabase، ومتغيرات البيئة في Vercel.";
  }

  if (result.status === "warning") {
    return "افتح الرابط بصرياً وتأكد أن التحويل مقصود وأن الصفحة النهائية صحيحة.";
  }

  return "يحتاج مراجعة يدوية. افتح الرابط وشاهد الرسالة الظاهرة ثم أصلحه من الكود أو الإعدادات المناسبة.";
}

function statusLabel(status: CheckResult["status"]) {
  const labels = {
    idle: "انتظار",
    checking: "يفحص",
    ok: "OK",
    warning: "تحذير",
    error: "خطأ",
  };

  return labels[status];
}

function statusBadgeClasses(status: CheckResult["status"]) {
  const classes = {
    idle: "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/55",
    checking:
      "rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-100",
    ok: "rounded-full border border-green-400/30 bg-green-500/15 px-3 py-1 text-xs font-black text-green-100",
    warning:
      "rounded-full border border-yellow-400/30 bg-yellow-500/15 px-3 py-1 text-xs font-black text-yellow-100",
    error:
      "rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1 text-xs font-black text-red-100",
  };

  return classes[status];
}

function resultClasses(status: CheckResult["status"]) {
  const classes = {
    idle: "border-white/10 bg-black/25 hover:border-purple-400/50 hover:bg-purple-500/10",
    checking: "border-blue-400/20 bg-blue-500/10",
    ok: "border-green-400/20 bg-green-500/10",
    warning: "border-yellow-400/20 bg-yellow-500/10",
    error: "border-red-400/25 bg-red-500/10",
  };

  return classes[status];
}
