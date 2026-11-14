import { notFound } from "next/navigation";
import { cache } from "react";
import { PROGRAM_SLUGS } from "@/lib/i18n/publicLocales";
import { generatePublicMetadataForRequest } from "@/lib/i18n/serverPublicMetadata";
import { readProgramMediaBySlug } from "@/lib/programMediaServer";

const fallbackProgramSlugs: ReadonlySet<string> = new Set(PROGRAM_SLUGS);

const hasPublicProgram = cache(async (slug: string) => {
  if (fallbackProgramSlugs.has(slug)) return true;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;
  return (await readProgramMediaBySlug(slug))?.slug === slug;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await hasPublicProgram(slug))) {
    return { alternates: null, robots: { index: false, follow: false, googleBot: { index: false, follow: false } } };
  }
  return generatePublicMetadataForRequest();
}

export default async function ProgramDetailsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await hasPublicProgram(slug))) notFound();
  return children;
}
