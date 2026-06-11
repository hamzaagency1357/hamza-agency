import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "المعرض | وكالة حمزة",
  description:
    "معرض وكالة حمزة لعرض الهوية البصرية والبرامج والخدمات المرتبطة بصناع المحتوى والبث المباشر.",
  alternates: {
    canonical: `${siteUrl}/gallery`,
  },
  openGraph: {
    title: "المعرض | وكالة حمزة",
    description:
      "صور ومواد تعريفية من وكالة حمزة حول البرامج والخدمات ومسارات صناع المحتوى.",
    url: `${siteUrl}/gallery`,
    siteName: "HAMZA AGENCY",
    type: "website",
    locale: "ar",
  },
  twitter: {
    card: "summary_large_image",
    title: "المعرض | وكالة حمزة",
    description:
      "صفحة المعرض الرسمية لوكالة حمزة لعرض المواد التعريفية والهوية البصرية.",
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
