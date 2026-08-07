"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminBlogQuickLink() {
  const pathname = usePathname() || "/";
  if (!pathname.startsWith("/admin") || pathname === "/admin/blog") return null;

  return (
    <Link href="/admin/blog" className="fixed bottom-24 left-4 z-[75] inline-flex min-h-11 items-center rounded-full border border-purple-300/30 bg-[#160724]/95 px-4 py-3 text-sm font-black text-purple-100 shadow-2xl backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300" aria-label="فتح إدارة المدونة">
      إدارة المدونة
    </Link>
  );
}
