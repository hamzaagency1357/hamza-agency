import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "من نحن | وكالة حمزة HAMZA AGENCY",
  description:
    "وكالة حمزة هي وكالة احترافية لإدارة وتطوير ودعم صناع المحتوى على منصات البث المباشر والتواصل الاجتماعي، مع نظام متابعة وبرامج متعددة.",
  alternates: {
    canonical: `${siteUrl}/about`,
  },
  openGraph: {
    title: "من نحن | وكالة حمزة",
    description:
      "تعرف على HAMZA AGENCY وطريقة عملها في إدارة وتطوير صناع المحتوى.",
    url: `${siteUrl}/about`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
