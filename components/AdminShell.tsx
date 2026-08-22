"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AdminMobileNavigation from "@/components/AdminMobileNavigation";

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
      <AdminMobileNavigation />
      <div className="min-h-screen lg:pr-[276px]" data-admin-workspace>{children}</div>
    </div>
  );
}
