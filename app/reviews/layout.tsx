import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "تقييمات وكالة حمزة | آراء العملاء وصناع المحتوى",
  description:
    "اطلع على تقييمات وتجارب العملاء وصناع المحتوى مع وكالة حمزة في برامج البث المباشر، طلبات الانضمام، والخدمات الرقمية.",
  alternates: {
    canonical: `${siteUrl}/reviews`,
  },
  openGraph: {
    title: "تقييمات وكالة حمزة",
    description:
      "آراء وتجارب حول HAMZA AGENCY وخدماتها لصناع المحتوى والعملاء.",
    url: `${siteUrl}/reviews`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
