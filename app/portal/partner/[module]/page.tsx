import PortalModuleRouter from "@/components/portals/PortalModuleRouter";

export default async function PartnerModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <PortalModuleRouter role="partner" moduleKey={module} />;
}
