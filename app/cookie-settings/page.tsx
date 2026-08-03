import type { Metadata } from "next";
import CookieSettingsPage from "@/components/CookieSettingsPage";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

const metadataCopy = {
  ar: {
    title: "إعدادات ملفات الارتباط | HAMZA AGENCY",
    description: "إدارة ملفات الارتباط الضرورية والتحليلات والتفضيلات والتسويق.",
  },
  en: {
    title: "Cookie settings | HAMZA AGENCY",
    description: "Manage necessary cookies, analytics, preferences, and marketing choices.",
  },
  tr: {
    title: "Çerez ayarları | HAMZA AGENCY",
    description: "Gerekli çerezleri, analiz, tercih ve pazarlama seçimlerini yönetin.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const { language } = await getRequestSiteContext();
  return metadataCopy[language];
}

export default function CookieSettingsRoutePage() {
  return <CookieSettingsPage />;
}
