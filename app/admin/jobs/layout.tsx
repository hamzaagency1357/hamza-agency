import type { ReactNode } from "react";
import AdminJobsCsvExport from "@/components/admin/AdminJobsCsvExport";

export default function AdminJobsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AdminJobsCsvExport />
    </>
  );
}
