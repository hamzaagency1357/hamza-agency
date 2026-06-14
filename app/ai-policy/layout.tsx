import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";

export const metadata: Metadata = {
  title: "سياسة الدعم الذكي | وكالة حمزة",
  description: "صفحة توضح طريقة استخدام الدعم الذكي داخل موقع وكالة حمزة وحدود المعلومات المعروضة للزوار.",
  alternates: {
    canonical: `${siteUrl}/ai-policy`,
  },
  openGraph: {
    title: "سياسة الدعم الذكي | وكالة حمزة",
    description: "معلومات عامة حول الدعم الذكي داخل موقع HAMZA AGENCY.",
    url: `${siteUrl}/ai-policy`,
    siteName: "HAMZA AGENCY",
    type: "website",
    locale: "ar",
  },
  twitter: {
    card: "summary_large_image",
    title: "سياسة الدعم الذكي | وكالة حمزة",
    description: "معلومات عامة حول الدعم الذكي داخل موقع وكالة حمزة.",
  },
};

export default function AiPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
