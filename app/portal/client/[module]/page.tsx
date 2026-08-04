import PortalModuleRouter from "@/components/portals/PortalModuleRouter";

export default async function ClientModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <PortalModuleRouter role="client" moduleKey={module} />;
}
