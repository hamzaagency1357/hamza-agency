"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AdminQuickNav from "@/components/AdminQuickNav";

const authPaths = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (authPaths.has(pathname)) return <>{children}</>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#070009] text-white">
      <AdminQuickNav />
      <div className="min-h-screen lg:pr-[276px]">{children}</div>
    </div>
  );
}
