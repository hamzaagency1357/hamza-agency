import type { Metadata } from "next";
import InstallAppPage from "@/components/InstallAppPage";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

const metadataCopy = {
  ar: {
    title: "تثبيت تطبيق HAMZA AGENCY",
    description: "ثبّت موقع HAMZA AGENCY كتطبيق من صفحة واضحة وآمنة.",
  },
  en: {
    title: "Install the HAMZA AGENCY app",
    description: "Install HAMZA AGENCY from a clear and secure installation page.",
  },
  tr: {
    title: "HAMZA AGENCY uygulamasını yükleyin",
    description: "HAMZA AGENCY'yi açık ve güvenli yükleme sayfasından yükleyin.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const { language } = await getRequestSiteContext();
  return metadataCopy[language];
}

export default function InstallAppRoutePage() {
  return <InstallAppPage />;
}
