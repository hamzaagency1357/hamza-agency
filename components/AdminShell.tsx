"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AdminQuickNav from "@/components/AdminQuickNav";

const dailyActions = [
  { label: "طلبات الانضمام", description: "راجعي الطلبات الجديدة وحالاتها.", href: "/admin/applications" },
  { label: "طلبات الخدمات", description: "تابعي طلبات الخدمات وحالة التنفيذ.", href: "/admin/service-requests" },
  { label: "التقييمات", description: "راجعي التقييمات قبل النشر أو التعديل.", href: "/admin/reviews" },
  { label: "البرامج", description: "أديري البرامج والمحتوى المرتبط بها.", href: "/admin/programs" },
  { label: "المدونة والمحتوى", description: "انتقلي مباشرة إلى إدارة المقالات.", href: "/admin/blog" },
];

const authPaths = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = authPaths.has(pathname);
  const isDashboard = pathname === "/admin";

  if (isAuthPage) return <>{children}</>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#070009] text-white">
      <AdminQuickNav />
      <div className="min-h-screen md:pr-[292px]">
        {isDashboard && (
          <section className="relative z-20 mx-auto max-w-7xl px-5 pt-6 md:px-8 md:pt-8">
            <div className="rounded-[2rem] border border-purple-400/20 bg-black/45 p-5 shadow-[0_0_70px_rgba(124,58,237,0.14)] backdrop-blur-xl sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.22em] text-yellow-200">HAMZA AGENCY</p>
                  <h1 className="mt-2 text-2xl font-black sm:text-3xl">مرحبًا، لوحة تحكم HAMZA AGENCY</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">واجهة منظمة لمساعدتك على إدارة أعمالك اليومية بسهولة.</p>
                </div>
                <Link href="/admin/requests" className="inline-flex min-h-11 items-center justify-center rounded-full border border-purple-300/30 bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300">
                  مركز جميع الطلبات
                </Link>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-black">إجراءات سريعة</h2>
                  <span className="text-xs text-white/40">اختصارات للمهام الأكثر استخدامًا</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {dailyActions.map((action) => (
                    <Link key={action.href} href={action.href} className="min-h-[112px] rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-purple-300/35 hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-300">
                      <span className="block text-sm font-black text-white">{action.label}</span>
                      <span className="mt-2 block text-xs leading-6 text-white/50">{action.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        {children}
      </div>
    </div>
  );
}
