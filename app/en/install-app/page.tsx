import type { Metadata } from "next";
import InstallAppPage from "@/components/InstallAppPage";

export const metadata: Metadata = {
  title: "Install the HAMZA AGENCY app",
  description: "Install HAMZA AGENCY from a clear and secure installation page.",
};

export default function EnglishInstallAppPage() {
  return <InstallAppPage language="en" />;
}
