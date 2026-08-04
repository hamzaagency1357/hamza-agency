import PortalModuleRouter from "@/components/portals/PortalModuleRouter";

export default async function CreatorModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <PortalModuleRouter role="creator" moduleKey={module} />;
}
