import Link from "next/link";
import TenantGovernanceConsole from "@/components/admin/TenantGovernanceConsole";

export const metadata = { title: "Tenant Governance | HAMZA AGENCY" };

export default function ProductExpansionAdminPage() {
  return (
    <>
      <div className="bg-[#09050f] px-4 pt-8 text-white" dir="rtl">
        <div className="mx-auto flex max-w-7xl justify-end">
          <Link href="/admin/product-operations" className="min-h-11 rounded-xl bg-violet-600 px-5 py-3 font-bold">فتح إدارة التشغيل المتكاملة</Link>
        </div>
      </div>
      <TenantGovernanceConsole />
    </>
  );
}
