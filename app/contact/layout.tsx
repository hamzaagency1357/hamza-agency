import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "تواصل معنا | وكالة حمزة",
  description:
    "صفحة التواصل الرسمية مع وكالة حمزة للاستفسار عن برامج صناع المحتوى، طلبات الانضمام، الخدمات الرقمية، ومتابعة الطلبات.",
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
  openGraph: {
    title: "تواصل معنا | وكالة حمزة",
    description:
      "قنوات التواصل الرسمية مع HAMZA AGENCY للاستفسارات وطلبات الانضمام والخدمات.",
    url: `${siteUrl}/contact`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
