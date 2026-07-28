import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicPageBuilderRenderer from "@/components/PublicPageBuilderRenderer";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";
import { getPublishedPublicPage, isAllowedCmsSlug } from "@/lib/publicPageData";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const context = await getRequestSiteContext();
  const data = await getPublishedPublicPage(slug, context.language);
  if (!data) return { title: "HAMZA AGENCY", robots: { index: false, follow: false } };
  const canonical = data.page.canonical_url || `https://hamza-agency.com${context.language === "ar" ? "" : `/${context.language}`}/${slug}`;
  const title = data.page.seo_title || data.page.og_title || data.page.title || "HAMZA AGENCY";
  const description = data.page.seo_description || data.page.og_description || "";
  return {
    metadataBase: new URL("https://hamza-agency.com"), title, description,
    alternates: { canonical, languages: { ar:`https://hamza-agency.com/${slug}`, en:`https://hamza-agency.com/en/${slug}`, tr:`https://hamza-agency.com/tr/${slug}` } },
    openGraph: { title, description, url: canonical, siteName:"HAMZA AGENCY", images: data.page.og_image_url ? [{ url:data.page.og_image_url }] : undefined },
    robots: { index:data.page.robots_index !== false, follow:data.page.robots_follow !== false },
  };
}

export default async function DynamicPublicPage({ params }: Props) {
  const { slug } = await params;
  if (!isAllowedCmsSlug(slug)) notFound();
  const context = await getRequestSiteContext();
  const data = await getPublishedPublicPage(slug, context.language);
  if (!data) notFound();
  return <main dir={context.direction} className="min-h-screen overflow-x-hidden bg-[#070009] text-white"><PublicPageBuilderRenderer sections={data.sections}/></main>;
}
