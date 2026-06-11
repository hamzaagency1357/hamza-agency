import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "الدعم بالذكاء الصناعي | وكالة حمزة",
  description:
    "صفحة الدعم بالذكاء الصناعي في وكالة حمزة لتنظيم الأسئلة المتكررة، توجيه الزوار، وتحويل الحالات الخاصة إلى واتساب رسمي.",
  alternates: {
    canonical: `${siteUrl}/ai-support`,
  },
  openGraph: {
    title: "الدعم بالذكاء الصناعي | وكالة حمزة",
    description:
      "مسار منظم للدعم الذكي داخل وكالة حمزة مع قواعد أمان واضحة وتحويل الحالات الخاصة إلى واتساب رسمي.",
    url: `${siteUrl}/ai-support`,
    siteName: "HAMZA AGENCY",
    type: "website",
    locale: "ar",
  },
  twitter: {
    card: "summary_large_image",
    title: "الدعم بالذكاء الصناعي | وكالة حمزة",
    description:
      "تنظيم الأسئلة المتكررة وتوجيه الزوار ضمن وكالة حمزة عبر مسار دعم ذكي وآمن.",
  },
};

export default function AiSupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
