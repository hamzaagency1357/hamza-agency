import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "طلب خدمة رقمية | وكالة حمزة",
  description:
    "أرسل طلب خدمة رقمية إلى وكالة حمزة لمتابعة شحن منصة، سحب أرباح، دعم فني، أو خدمة مرتبطة بحسابات صناع المحتوى.",
  alternates: {
    canonical: `${siteUrl}/service-request`,
  },
  openGraph: {
    title: "طلب خدمة رقمية | وكالة حمزة",
    description:
      "نموذج رسمي لإرسال طلبات الخدمات الرقمية إلى HAMZA AGENCY مع متابعة عبر واتساب.",
    url: `${siteUrl}/service-request`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function ServiceRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
