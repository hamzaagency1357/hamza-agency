import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "قصص نجاح وكالة حمزة | مسارات صناع المحتوى",
  description:
    "تعرف على قصص ومسارات العمل في وكالة حمزة لتنظيم طلبات صناع المحتوى، متابعة البرامج، وتحسين تجربة الانضمام والخدمات الرقمية.",
  alternates: {
    canonical: `${siteUrl}/success-stories`,
  },
  openGraph: {
    title: "قصص نجاح وكالة حمزة",
    description:
      "نماذج ومسارات عمل توضح طريقة دعم وكالة حمزة لصناع المحتوى والعملاء.",
    url: `${siteUrl}/success-stories`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function SuccessStoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
