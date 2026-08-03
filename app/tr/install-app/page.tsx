import type { Metadata } from "next";
import InstallAppPage from "@/components/InstallAppPage";

export const metadata: Metadata = {
  title: "HAMZA AGENCY uygulamasını yükleyin",
  description: "HAMZA AGENCY'yi açık ve güvenli yükleme sayfasından yükleyin.",
};

export default function TurkishInstallAppPage() {
  return <InstallAppPage language="tr" />;
}
