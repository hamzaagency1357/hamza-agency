import "server-only";

import type { SiteLanguage } from "@/lib/i18n/locale";

export type PublicPageRecord = {
  id: number;
  title: string | null;
  slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  robots_index: boolean | null;
  robots_follow: boolean | null;
};

export type PublicSectionRecord = {
  id: number;
  section_key: string;
  section_type: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  media_url: string | null;
  sort_order: number;
  settings: Record<string, unknown> | null;
};

export const RESERVED_PUBLIC_SLUGS = new Set([
  "admin", "api", "about", "ai-policy", "ai-support", "apply", "application-status", "contact", "digital-services", "en", "faq", "gallery", "jobs", "knowledge-center", "partners", "privacy-policy", "programs", "reviews", "service-request", "service-status", "services", "success-stories", "terms-and-conditions", "tr", "reset-password", "login", "robots.txt", "sitemap.xml", "opengraph-image",
]);

export function normalizeCmsSlug(value: string) {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

export function isAllowedCmsSlug(value: string) {
  const slug = normalizeCmsSlug(value);
  return Boolean(slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_PUBLIC_SLUGS.has(slug));
}

async function supabaseRest<T>(path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 60, tags: ["public-pages"] },
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function getPublishedPublicPage(slugValue: string, language: SiteLanguage) {
  const slug = normalizeCmsSlug(slugValue);
  if (!isAllowedCmsSlug(slug)) return null;
  const pages = await supabaseRest<PublicPageRecord[]>(`pages?select=id,title,slug,seo_title,seo_description,canonical_url,og_title,og_description,og_image_url,robots_index,robots_follow&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&publishing_status=eq.published&limit=1`);
  const page = pages?.[0];
  if (!page) return null;
  const sections = await supabaseRest<PublicSectionRecord[]>(`sections?select=id,section_key,section_type,title,subtitle,content,media_url,sort_order,settings&page_id=eq.${page.id}&language=eq.${language}&is_visible=eq.true&is_published=eq.true&publishing_status=eq.published&order=sort_order.asc,id.asc`);
  if (!sections?.length) return null;
  return { page, sections };
}
