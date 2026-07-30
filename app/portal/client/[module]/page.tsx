import PortalModule from "@/components/portals/PortalModule";

export default async function ClientModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <PortalModule role="client" moduleKey={module} />;
}
