import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة | وكالة حمزة",
  description:
    "إجابات الأسئلة الشائعة حول وكالة حمزة، برامج البث المباشر، طلبات الانضمام، الخدمات الرقمية، وطرق التواصل الرسمية.",
  alternates: {
    canonical: `${siteUrl}/faq`,
  },
  openGraph: {
    title: "الأسئلة الشائعة | وكالة حمزة",
    description:
      "صفحة الأسئلة الشائعة الرسمية لوكالة حمزة حول البرامج، الخدمات، التقديم، والتواصل.",
    url: `${siteUrl}/faq`,
    siteName: "HAMZA AGENCY",
    type: "website",
    locale: "ar",
  },
  twitter: {
    card: "summary_large_image",
    title: "الأسئلة الشائعة | وكالة حمزة",
    description:
      "إجابات مختصرة وواضحة عن الأسئلة المتكررة حول وكالة حمزة وخدماتها.",
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
