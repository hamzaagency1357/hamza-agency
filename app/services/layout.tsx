import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "خدمات وكالة حمزة | إدارة ودعم صناع المحتوى",
  description:
    "خدمات وكالة حمزة تشمل إدارة صناع المحتوى، متابعة طلبات الانضمام، دعم البرامج، تنظيم التواصل، والخدمات الرقمية لصناع المحتوى.",
  alternates: {
    canonical: `${siteUrl}/services`,
  },
  openGraph: {
    title: "خدمات وكالة حمزة",
    description:
      "خدمات تنظيمية وتشغيلية لصناع المحتوى على منصات البث المباشر والتواصل الاجتماعي.",
    url: `${siteUrl}/services`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
