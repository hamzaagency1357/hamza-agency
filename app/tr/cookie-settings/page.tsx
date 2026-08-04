import type { Metadata } from "next";
import CookieSettingsPage from "@/components/CookieSettingsPage";

export const metadata: Metadata = {
  title: "Çerez ayarları | HAMZA AGENCY",
  description: "Gerekli çerezleri, analiz, tercih ve pazarlama seçimlerini yönetin.",
};

export default function TurkishCookieSettingsPage() {
  return <CookieSettingsPage />;
}
