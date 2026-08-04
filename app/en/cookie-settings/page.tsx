import type { Metadata } from "next";
import CookieSettingsPage from "@/components/CookieSettingsPage";

export const metadata: Metadata = {
  title: "Cookie settings | HAMZA AGENCY",
  description: "Manage necessary cookies, analytics, preferences, and marketing choices.",
};

export default function EnglishCookieSettingsPage() {
  return <CookieSettingsPage />;
}
