import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "برامج وكالة حمزة | TikTok وBIGO LIVE وصناع المحتوى",
  description:
    "تعرف على برامج وكالة حمزة لصناع المحتوى على TikTok وBIGO LIVE وYaahlan وXena وCatchii، وابدأ طلب الانضمام إلى وكالة بث مباشر احترافية.",
  alternates: {
    canonical: `${siteUrl}/programs`,
  },
  openGraph: {
    title: "برامج وكالة حمزة لصناع المحتوى",
    description:
      "برامج متخصصة لصناع المحتوى والبث المباشر مع متابعة وتنظيم من HAMZA AGENCY.",
    url: `${siteUrl}/programs`,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
};

export default function ProgramsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
