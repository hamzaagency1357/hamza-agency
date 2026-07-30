import PortalModule from "@/components/portals/PortalModule";

export default async function CreatorModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <PortalModule role="creator" moduleKey={module} />;
}
