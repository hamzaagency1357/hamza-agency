import PortalModuleRouter from "@/components/portals/PortalModuleRouter";

export default async function EmployeeModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <PortalModuleRouter role="employee" moduleKey={module} />;
}
