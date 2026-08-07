import "server-only";

import type {
  BlogCategory,
  BlogLanguage,
  BlogListResult,
  BlogPost,
  BlogPostsOptions,
  BlogTag,
} from "@/lib/blog/posts";
import {
  getBlogCategories,
  getBlogFeed,
  getBlogPostBySlug,
  getBlogPosts,
  getBlogTags,
} from "@/lib/blog/posts.mjs";

type DatabaseTranslation = {
  language: BlogLanguage;
  title: string | null;
  excerpt: string | null;
  content_html: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

type DatabasePost = {
  id: number | string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "unpublished";
  category: string | null;
  tags: string[] | null;
  featured_image_url: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  updated_at: string | null;
  blog_post_translations: DatabaseTranslation[] | null;
};

const validLanguages: readonly BlogLanguage[] = ["ar", "en", "tr"];

function normalizeLanguage(language?: string): BlogLanguage {
  return language === "en" || language === "tr" ? language : "ar";
}

function isPublicNow(post: DatabasePost, now = Date.now()) {
  if (post.status === "published") {
    return !post.published_at || new Date(post.published_at).getTime() <= now;
  }
  return (
    post.status === "scheduled" &&
    Boolean(post.scheduled_at) &&
    new Date(post.scheduled_at as string).getTime() <= now
  );
}

function safeText(value: string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function mapDatabasePost(row: DatabasePost, language: BlogLanguage): BlogPost | null {
  const translations = Array.isArray(row.blog_post_translations)
    ? row.blog_post_translations.filter((item) => validLanguages.includes(item.language))
    : [];
  const arabic = translations.find((item) => item.language === "ar");
  const selected = translations.find((item) => item.language === language) || arabic;
  if (!selected || !safeText(selected.title).trim()) return null;

  const contentByLanguage = Object.fromEntries(
    translations.map((item) => [
      item.language,
      {
        title: safeText(item.title),
        excerpt: safeText(item.excerpt),
        content: safeText(item.content_html),
        seoTitle: safeText(item.seo_title),
        seoDescription: safeText(item.seo_description),
      },
    ])
  );

  const copy = {
    title: safeText(selected.title) || safeText(arabic?.title),
    excerpt: safeText(selected.excerpt) || safeText(arabic?.excerpt),
    content: safeText(selected.content_html) || safeText(arabic?.content_html),
    seoTitle: safeText(selected.seo_title) || safeText(arabic?.seo_title),
    seoDescription: safeText(selected.seo_description) || safeText(arabic?.seo_description),
  };

  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    updatedAt: row.updated_at,
    category: row.category || "general",
    tags: Array.isArray(row.tags) ? row.tags : [],
    featuredImage: row.featured_image_url,
    contentByLanguage,
    copy,
  };
}

async function fetchPublicDatabasePosts({ slug }: { slug?: string } = {}): Promise<DatabasePost[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const url = new URL("/rest/v1/blog_posts", supabaseUrl);
    url.searchParams.set(
      "select",
      "id,slug,status,category,tags,featured_image_url,published_at,scheduled_at,updated_at,blog_post_translations(language,title,excerpt,content_html,seo_title,seo_description)"
    );
    if (slug) url.searchParams.set("slug", `eq.${slug}`);
    url.searchParams.set("order", "published_at.desc.nullslast,updated_at.desc");
    url.searchParams.set("limit", slug ? "1" : "250");

    const response = await fetch(url, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as DatabasePost[];
    return rows.filter((row) => isPublicNow(row));
  } catch {
    return null;
  }
}

function applyFilters(posts: BlogPost[], { search = "", category = "", tag = "" }: Pick<BlogPostsOptions, "search" | "category" | "tag">) {
  const normalizedSearch = search.trim().toLowerCase();
  return posts.filter((post) => {
    if (category && post.category !== category) return false;
    if (tag && !post.tags.includes(tag)) return false;
    if (!normalizedSearch) return true;
    const haystack = `${post.copy.title} ${post.copy.excerpt} ${post.copy.content} ${post.category} ${post.tags.join(" ")}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}

function labelsFor(language: BlogLanguage) {
  return getBlogPosts({ language, preview: false }).labels;
}

export async function getServerBlogPosts(options: BlogPostsOptions = {}): Promise<BlogListResult> {
  const language = normalizeLanguage(options.language);
  const rows = await fetchPublicDatabasePosts();
  if (rows === null) return getBlogPosts({ ...options, language, preview: false });

  const mapped = rows.map((row) => mapDatabasePost(row, language)).filter((post): post is BlogPost => Boolean(post));
  const filtered = applyFilters(mapped, options);
  const perPage = Math.min(Math.max(Number(options.perPage) || 6, 1), 24);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(Number(options.page) || 1, 1), totalPages);
  const start = (page - 1) * perPage;

  return {
    posts: filtered.slice(start, start + perPage),
    page,
    perPage,
    total,
    totalPages,
    language,
    labels: labelsFor(language),
  };
}

export async function getServerBlogPostBySlug(slug: string, languageInput: BlogLanguage = "ar"): Promise<BlogPost | null> {
  const language = normalizeLanguage(languageInput);
  const rows = await fetchPublicDatabasePosts({ slug });
  if (rows === null) return getBlogPostBySlug(slug, { language, preview: false });
  return rows[0] ? mapDatabasePost(rows[0], language) : null;
}

export async function getServerBlogTaxonomy(languageInput: BlogLanguage = "ar"): Promise<{ categories: Record<string, BlogCategory>; tags: Record<string, BlogTag> }> {
  const language = normalizeLanguage(languageInput);
  const rows = await fetchPublicDatabasePosts();
  if (rows === null) return { categories: getBlogCategories(language), tags: getBlogTags(language) };

  const posts = rows.map((row) => mapDatabasePost(row, language)).filter((post): post is BlogPost => Boolean(post));
  const categoryLabels: Record<string, string> = {
    seo: language === "ar" ? "تحسين الظهور" : "SEO",
    operations: language === "ar" ? "العمليات" : language === "tr" ? "Operasyonlar" : "Operations",
    planning: language === "ar" ? "التخطيط" : language === "tr" ? "Planlama" : "Planning",
    news: language === "ar" ? "الأخبار" : language === "tr" ? "Haberler" : "News",
    guides: language === "ar" ? "الأدلة" : language === "tr" ? "Rehberler" : "Guides",
  };

  const categories = posts.reduce<Record<string, BlogCategory>>((accumulator, post) => {
    if (!accumulator[post.category]) accumulator[post.category] = { slug: post.category, label: categoryLabels[post.category] || post.category };
    return accumulator;
  }, {});
  const tags = posts.reduce<Record<string, BlogTag>>((accumulator, post) => {
    for (const tag of post.tags) if (!accumulator[tag]) accumulator[tag] = { slug: tag, label: tag };
    return accumulator;
  }, {});
  return { categories, tags };
}

export async function getServerRelatedBlogPosts(post: BlogPost, languageInput: BlogLanguage = "ar", limit = 3) {
  const language = normalizeLanguage(languageInput);
  const rows = await fetchPublicDatabasePosts();
  const candidates = rows === null
    ? getBlogFeed(language)
    : rows.map((row) => mapDatabasePost(row, language)).filter((item): item is BlogPost => Boolean(item));
  return candidates
    .filter((item) => item.id !== post.id && (item.category === post.category || item.tags.some((tag) => post.tags.includes(tag))))
    .slice(0, limit);
}

export async function getServerBlogFeed(languageInput: BlogLanguage = "ar") {
  const language = normalizeLanguage(languageInput);
  const rows = await fetchPublicDatabasePosts();
  if (rows === null) return getBlogFeed(language);
  return rows.map((row) => mapDatabasePost(row, language)).filter((post): post is BlogPost => Boolean(post)).slice(0, 50);
}
