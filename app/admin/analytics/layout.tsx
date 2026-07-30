import type { ReactNode } from "react";
import JobContactAnalyticsPanel from "@/components/admin/JobContactAnalyticsPanel";

export default function AnalyticsLayout({children}:{children:ReactNode}){
  return <><JobContactAnalyticsPanel />{children}</>;
}
