import type { Metadata } from "next";
import {
  buildPublicMetadata,
  getRequestSiteContext,
} from "@/lib/i18n/serverPublicMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const context = await getRequestSiteContext();
  return buildPublicMetadata("/blog", context.language);
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
