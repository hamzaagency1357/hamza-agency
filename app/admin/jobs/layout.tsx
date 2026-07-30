import type { ReactNode } from "react";
import AdminJobsCsvExport from "@/components/admin/AdminJobsCsvExport";
import TrackingCodeConsole from "@/components/admin/TrackingCodeConsole";

export default function AdminJobsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TrackingCodeConsole kind="jobs" />
      {children}
      <AdminJobsCsvExport />
    </>
  );
}
