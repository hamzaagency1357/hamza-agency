import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "مركز المعرفة | وكالة حمزة",
  description:
    "مركز المعرفة في وكالة حمزة لتوضيح معلومات مفيدة لصناع المحتوى حول برامج البث المباشر، الخدمات الرقمية، وخطوات الانضمام والمتابعة.",
  alternates: {
    canonical: `${siteUrl}/knowledge-center`,
  },
  openGraph: {
    title: "مركز المعرفة | وكالة حمزة",
    description:
      "مقالات وإرشادات معرفية من وكالة حمزة حول صناعة المحتوى، برامج البث المباشر، والخدمات الرقمية.",
    url: `${siteUrl}/knowledge-center`,
    siteName: "HAMZA AGENCY",
    type: "website",
    locale: "ar",
  },
  twitter: {
    card: "summary_large_image",
    title: "مركز المعرفة | وكالة حمزة",
    description:
      "إرشادات ومعلومات مفيدة لصناع المحتوى حول البرامج والخدمات داخل وكالة حمزة.",
  },
};

export default function KnowledgeCenterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
