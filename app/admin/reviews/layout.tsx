import type { ReactNode } from "react";
import AdminReviewSubmissionsPanel from "@/components/AdminReviewSubmissionsPanel";

export default function ReviewsAdminLayout({children}:{children:ReactNode}){
  return <>{children}<AdminReviewSubmissionsPanel/></>;
}
