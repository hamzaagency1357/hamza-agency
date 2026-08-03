import type { Metadata } from "next";
import InstallAppPage from "@/components/InstallAppPage";

export const metadata: Metadata = {
  title: "تثبيت تطبيق HAMZA AGENCY",
  description: "ثبّت موقع HAMZA AGENCY كتطبيق من صفحة واضحة وآمنة.",
};

export default function ArabicInstallAppPage() {
  return <InstallAppPage language="ar" />;
}
