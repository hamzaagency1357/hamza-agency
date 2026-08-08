"use client";

import { usePathname } from "next/navigation";
import type { SiteLanguage } from "@/lib/i18n/locale";
import { AGENT_PUBLIC_PATH, getLocalizedAbsoluteUrl, getProgramSlugFromPath, isSupportedPublicPath, PROGRAM_SLUGS, SITE_URL, stripLocalePrefix } from "@/lib/i18n/publicLocales";
import { getPublicSeoCopy } from "@/lib/i18n/publicSeo";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const logoUrl = `${SITE_URL}/Logo%20hamza%20agency.jpg`;
const organizationId = `${SITE_URL}/#organization`;
const agentId = `${SITE_URL}${AGENT_PUBLIC_PATH}#person`;
const homeLabel: Record<SiteLanguage, string> = { ar: "الرئيسية", en: "Home", tr: "Ana Sayfa" };
const agentDisplayName: Record<SiteLanguage, string> = { ar: "عراب سوريا", en: "Godfather of Syria", tr: "Suriye'nin Vaftiz Babası" };
function buildOrganization(description: string) { return { "@context": "https://schema.org", "@type": "Organization", "@id": organizationId, name: "HAMZA AGENCY", alternateName: ["وكالة حمزة", "Hamza Agency"], url: SITE_URL, logo: { "@type": "ImageObject", url: logoUrl }, image: logoUrl, description, employee: { "@id": agentId }, areaServed: ["TR", "SY", "SA", "AE", "IQ", "JO", "LB", "EG"], availableLanguage: ["ar", "en", "tr"] }; }
function buildLocalBusiness(description: string) { return { "@context": "https://schema.org", "@type": "LocalBusiness", "@id": `${SITE_URL}/#localbusiness`, name: "HAMZA AGENCY", alternateName: "وكالة حمزة", url: SITE_URL, logo: logoUrl, image: logoUrl, description, parentOrganization: { "@id": organizationId }, employee: { "@id": agentId }, areaServed: ["TR", "SY", "Middle East"] }; }
function buildAgent(language: SiteLanguage) { return { "@context": "https://schema.org", "@type": "Person", "@id": agentId, name: agentDisplayName[language], alternateName: ["عراب سوريا", "⚔عܓོراب✴سܓོوريا⚔", "Godfather of Syria", "Suriye'nin Vaftiz Babası"], url: getLocalizedAbsoluteUrl(AGENT_PUBLIC_PATH, language), jobTitle: language === "ar" ? "الوكيل والمدير في HAMZA AGENCY" : language === "tr" ? "HAMZA AGENCY Temsilcisi ve Yöneticisi" : "Agent and Manager at HAMZA AGENCY", worksFor: { "@id": organizationId }, knowsAbout: ["Content creator management", "Live-streaming programs", "Creator support", "Privacy and safety"] }; }
function buildWebsite(language: SiteLanguage, description: string) { const url = getLocalizedAbsoluteUrl("/", language); return { "@context": "https://schema.org", "@type": "WebSite", "@id": `${url}#website`, name: "HAMZA AGENCY", alternateName: language === "ar" ? "وكالة حمزة" : "Hamza Agency", url, description, inLanguage: language, publisher: { "@id": organizationId }, about: { "@id": agentId } }; }

export default function StructuredData() {
  const pathname = usePathname() || "/";
  const language = useSiteLanguage();
  const publicPath = stripLocalePrefix(pathname);
  if (!isSupportedPublicPath(publicPath)) return null;
  const copy = getPublicSeoCopy(publicPath, language);
  const url = getLocalizedAbsoluteUrl(publicPath, language);
  const items: unknown[] = [
    buildOrganization(copy.description), buildLocalBusiness(copy.description), buildAgent(language), buildWebsite(language, getPublicSeoCopy("/", language).description),
    { "@context": "https://schema.org", "@type": copy.schemaType || "WebPage", "@id": `${url}#webpage`, url, name: copy.title, description: copy.description, inLanguage: language, isPartOf: { "@id": `${getLocalizedAbsoluteUrl("/", language)}#website` }, publisher: { "@id": organizationId }, about: publicPath === AGENT_PUBLIC_PATH ? { "@id": agentId } : undefined },
  ];
  const crumbs = [{ "@type": "ListItem", position: 1, name: homeLabel[language], item: getLocalizedAbsoluteUrl("/", language) }];
  if (publicPath !== "/") crumbs.push({ "@type": "ListItem", position: 2, name: copy.title, item: url });
  items.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs });
  if (publicPath === "/programs") items.push({ "@context": "https://schema.org", "@type": "ItemList", itemListElement: PROGRAM_SLUGS.map((slug, index) => ({ "@type": "ListItem", position: index + 1, url: getLocalizedAbsoluteUrl(`/programs/${slug}`, language) })) });
  if (getProgramSlugFromPath(publicPath) || publicPath === "/service-request") items.push({ "@context": "https://schema.org", "@type": "Service", name: copy.title, description: copy.description, url, provider: { "@id": organizationId } });
  if (publicPath === "/faq") items.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: language === "ar" ? "من هو الوكيل الذي يدير HAMZA AGENCY؟" : language === "tr" ? "HAMZA AGENCY'yi yöneten temsilci kimdir?" : "Who is the agent managing HAMZA AGENCY?", acceptedAnswer: { "@type": "Answer", text: language === "ar" ? "عراب سوريا هو الوكيل والمدير في HAMZA AGENCY." : language === "tr" ? "Suriye'nin Vaftiz Babası, HAMZA AGENCY temsilcisi ve yöneticisidir." : "The Godfather of Syria is the agent and manager at HAMZA AGENCY." } }] });
  return <>{items.map((item, index) => <script key={`${publicPath}-${index}`} type="application/ld+json" data-site-language={language} dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }} />)}</>;
}
