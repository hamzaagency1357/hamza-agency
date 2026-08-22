import type { ReactNode } from "react";
import AdminShell from "@/components/AdminShell";
import "./admin-usability.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
