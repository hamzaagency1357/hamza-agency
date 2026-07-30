import MarketplaceClient from "@/components/marketplace/MarketplaceClient";
import { getServerTenantRuntime } from "@/lib/productExpansion/serverTenantRuntime";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Marketplace | HAMZA AGENCY",
  description: "Products and services published by HAMZA AGENCY and approved partners.",
};

export default async function MarketplacePage() {
  const tenant = await getServerTenantRuntime();
  return <MarketplaceClient tenantId={tenant.id} />;
}
