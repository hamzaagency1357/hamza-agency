import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "الخدمات الرقمية | وكالة حمزة",
  description:
    "اطلب خدمات رقمية من وكالة حمزة مثل متابعة شحن المنصات، سحب الأرباح، الدعم الفني، وخدمات الحسابات مع تأكيد ومتابعة عبر واتساب.",
  alternates: {
    canonical: `${siteUrl}/digital-services`,
  },
  openGraph: {
    title: "الخدمات الرقمية | وكالة حمزة",
    description:
      "خدمات رقمية منظمة لصناع المحتوى والعملاء مع متابعة واضحة من HAMZA AGENCY.",
    url: `${siteUrl}/digital-services`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function DigitalServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
