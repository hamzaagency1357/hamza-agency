import { Suspense } from "react";
import AcceptTenantInvitation from "@/components/portals/AcceptTenantInvitation";

export const dynamic = "force-dynamic";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#09050f] p-24 text-center text-white">جارٍ تحميل الدعوة…</main>}>
      <AcceptTenantInvitation />
    </Suspense>
  );
}
