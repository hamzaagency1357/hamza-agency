import PortalModule from "@/components/portals/PortalModule";

export default async function PartnerModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <PortalModule role="partner" moduleKey={module} />;
}
