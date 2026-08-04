import type { Metadata } from "next";
import { Suspense } from "react";
import AcceptTenantInvitation from "@/components/portals/AcceptTenantInvitation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "قبول دعوة الانضمام | HAMZA AGENCY",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  referrer: "no-referrer",
};

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#09050f] p-24 text-center text-white">جارٍ تحميل الدعوة…</main>}>
      <AcceptTenantInvitation />
    </Suspense>
  );
}
