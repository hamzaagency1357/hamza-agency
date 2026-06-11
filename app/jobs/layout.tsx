import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "وظائف وكالة حمزة | فرص عمل لصناع المحتوى والدعم",
  description:
    "فرص العمل المتاحة في وكالة حمزة لمتابعة صناع المحتوى، إدارة البرامج، ودعم الخدمات الرقمية ضمن نظام وكالة منظم.",
  alternates: {
    canonical: `${siteUrl}/jobs`,
  },
  openGraph: {
    title: "وظائف وكالة حمزة",
    description:
      "انضم إلى فريق HAMZA AGENCY في مجالات متابعة صناع المحتوى وإدارة البرامج والدعم.",
    url: `${siteUrl}/jobs`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
