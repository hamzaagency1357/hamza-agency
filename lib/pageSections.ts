import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type CmsPage = {
  id: number;
  title: string | null;
  slug: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image: string | null;
  is_homepage: boolean | null;
  is_published: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CmsSection = {
  id: number;
  page_id: number | null;
  section_key: string | null;
  section_type: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  settings?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CmsPageWithSections = {
  page: CmsPage | null;
  sections: CmsSection[];
};

export async function getCmsPageWithSections(
  slug: string,
  options: { includeHidden?: boolean } = {}
): Promise<CmsPageWithSections> {
  if (!isSupabaseConfigured || !supabase) {
    return { page: null, sections: [] };
  }

  const normalizedSlug = normalizePageSlug(slug);

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select(
      "id, title, slug, content, seo_title, seo_description, seo_keywords, og_image, is_homepage, is_published, sort_order, created_at, updated_at"
    )
    .eq("slug", normalizedSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (pageError || !page) {
    return { page: null, sections: [] };
  }

  let sectionsQuery = supabase
    .from("sections")
    .select(
      "id, page_id, section_key, section_type, title, subtitle, content, sort_order, is_visible, settings, created_at, updated_at"
    )
    .eq("page_id", page.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!options.includeHidden) {
    sectionsQuery = sectionsQuery.eq("is_visible", true);
  }

  const { data: sections, error: sectionsError } = await sectionsQuery;

  if (sectionsError || !sections) {
    return { page: page as CmsPage, sections: [] };
  }

  return {
    page: page as CmsPage,
    sections: sections as CmsSection[],
  };
}

export async function getCmsSectionsByPageSlug(slug: string): Promise<CmsSection[]> {
  const result = await getCmsPageWithSections(slug);
  return result.sections;
}

export function normalizePageSlug(slug: string) {
  const normalized = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized === "home" || normalized === "homepage") return "home";
  return normalized;
}

export function findCmsSection(
  sections: CmsSection[],
  sectionKey: string
): CmsSection | null {
  return sections.find((section) => section.section_key === sectionKey) || null;
}

export function getCmsText(
  value: string | null | undefined,
  fallback = ""
): string {
  const text = value?.trim();
  return text || fallback;
}
