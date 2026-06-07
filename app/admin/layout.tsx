import type { ReactNode } from "react";
import AdminQuickNav from "@/components/AdminQuickNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AdminQuickNav />
    </>
  );
}
