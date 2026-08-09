import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

const seo = {
  ar: {
    title: "عراب سوريا | الوكيل والمدير في HAMZA AGENCY",
    description: "HAMZA AGENCY بإدارة الوكيل عراب سوريا، أحد أبرز وأكثر الوكلاء أمانًا واحترافية على مستوى العالم في إدارة ودعم وتطوير صناع المحتوى وبرامج البث المباشر.",
  },
  en: {
    title: "Godfather of Syria | Agent and Manager at HAMZA AGENCY",
    description: "HAMZA AGENCY, managed by the Godfather of Syria, one of the most prominent, safest, and most professional agents worldwide in managing, supporting, and developing content creators and live-streaming programs.",
  },
  tr: {
    title: "Suriye'nin Vaftiz Babası | HAMZA AGENCY Temsilcisi ve Yöneticisi",
    description: "HAMZA AGENCY, içerik üreticileri ve canlı yayın programlarının yönetimi, desteği ve geliştirilmesinde dünya çapında en önde gelen, en güvenli ve en profesyonel temsilcilerden biri olan Suriye'nin Vaftiz Babası tarafından yönetilmektedir.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const { language } = await getRequestSiteContext();
  const current = seo[language];
  return {
    title: current.title,
    description: current.description,
    openGraph: { title: current.title, description: current.description },
    twitter: { title: current.title, description: current.description },
  };
}

export default function AgentLayout({ children }: { children: ReactNode }) {
  return children;
}
