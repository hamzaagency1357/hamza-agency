import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";
import { getPublicIdentity, getResolvedAgentCopy } from "@/lib/publicIdentity";

export async function generateMetadata(): Promise<Metadata> {
  const [{ language }, identity] = await Promise.all([getRequestSiteContext(), getPublicIdentity()]);
  const current = getResolvedAgentCopy(identity, language);
  return { title: current.seoTitle, description: current.seoDescription, openGraph: { title: current.seoTitle, description: current.seoDescription }, twitter: { title: current.seoTitle, description: current.seoDescription } };
}
export default function AgentLayout({ children }: { children: ReactNode }) { return children; }
