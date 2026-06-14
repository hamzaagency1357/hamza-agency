import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "الشروط والأحكام | وكالة حمزة",
  description:
    "الشروط والأحكام الخاصة باستخدام موقع وكالة حمزة، طلبات الانضمام، الخدمات الرقمية، وقنوات التواصل الرسمية.",
  alternates: {
    canonical: `${siteUrl}/terms-and-conditions`,
  },
  openGraph: {
    title: "الشروط والأحكام | وكالة حمزة",
    description:
      "الشروط الرسمية لاستخدام موقع HAMZA AGENCY وخدماته الرقمية وقنوات التواصل المعتمدة.",
    url: `${siteUrl}/terms-and-conditions`,
    siteName: "HAMZA AGENCY",
    type: "website",
    locale: "ar",
  },
  twitter: {
    card: "summary_large_image",
    title: "الشروط والأحكام | وكالة حمزة",
    description:
      "الشروط والأحكام الرسمية الخاصة بموقع وكالة حمزة وخدماته.",
  },
};

export default function TermsAndConditionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
