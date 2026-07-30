import PortalModule from "@/components/portals/PortalModule";

export default async function EmployeeModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <PortalModule role="employee" moduleKey={module} />;
}
