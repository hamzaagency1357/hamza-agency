import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "الشركاء | وكالة حمزة",
  description:
    "صفحة شركاء وكالة حمزة وبرامج التعاون الرسمية المرتبطة بصناع المحتوى والبث المباشر والخدمات الرقمية.",
  alternates: {
    canonical: `${siteUrl}/partners`,
  },
  openGraph: {
    title: "الشركاء | وكالة حمزة",
    description:
      "تعرف على شركاء وبرامج التعاون داخل HAMZA AGENCY ومسارات دعم صناع المحتوى.",
    url: `${siteUrl}/partners`,
    siteName: "HAMZA AGENCY",
    type: "website",
    locale: "ar",
  },
  twitter: {
    card: "summary_large_image",
    title: "الشركاء | وكالة حمزة",
    description:
      "صفحة الشركاء الرسمية لوكالة حمزة وبرامج التعاون المرتبطة بصناع المحتوى.",
  },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
