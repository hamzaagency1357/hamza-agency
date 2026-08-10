"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminBlogQuickLink() {
  const pathname = usePathname() || "/";
  if (!pathname.startsWith("/admin") || pathname === "/admin/login" || pathname === "/admin/blog") return null;

  return (
    <div dir="rtl" className="mx-auto w-full max-w-[1380px] px-5 pb-5 lg:px-8 print:hidden">
      <Link
        href="/admin/blog"
        className="inline-flex min-h-11 items-center rounded-2xl border border-purple-300/30 bg-[#12051c] px-5 py-3 text-sm font-black text-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition hover:border-yellow-300/35 hover:text-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
        aria-label="فتح إدارة المدونة"
      >
        إدارة المدونة
      </Link>
    </div>
  );
}
