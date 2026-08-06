import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import {
  getServerBlogPostBySlug,
  getServerBlogTaxonomy,
  getServerRelatedBlogPosts,
} from "@/lib/blog/serverPosts";
import {
  buildPublicMetadata,
  getRequestSiteContext,
} from "@/lib/i18n/serverPublicMetadata";
import {
  getLanguageAlternates,
  getLocalizedAbsoluteUrl,
  localizePublicHref,
  SITE_URL,
} from "@/lib/i18n/publicLocales";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const copy = {
  ar: { back: "العودة إلى المدونة", related: "مقالات ذات صلة", published: "نُشر في", updated: "آخر تحديث", category: "التصنيف" },
  en: { back: "Back to blog", related: "Related articles", published: "Published", updated: "Last updated", category: "Category" },
  tr: { back: "Bloga dön", related: "İlgili makaleler", published: "Yayınlandı", updated: "Son güncelleme", category: "Kategori" },
} as const;

function safeBackgroundImage(value: string | null) {
  if (!value || !/^https?:\/\//i.test(value)) return undefined;
  return `url("${value.replaceAll('"', "%22")}")`;
}

function sanitizeRenderableHtml(value: string) {
  return value
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, siteContext] = await Promise.all([params, getRequestSiteContext()]);
  const post = await getServerBlogPostBySlug(slug, siteContext.language);
  if (!post) {
    return {
      title: siteContext.language === "ar" ? "المقال غير موجود | عراب سوريا" : siteContext.language === "tr" ? "Makale bulunamadı | Arab Syria" : "Article not found | Arab Syria",
      robots: { index: false, follow: false },
    };
  }
  const publicPath = `/blog/${post.slug}`;
  const base = buildPublicMetadata(publicPath, siteContext.language);
  const canonical = getLocalizedAbsoluteUrl(publicPath, siteContext.language);
  const title = post.copy.seoTitle?.trim() || `${post.copy.title} | ${siteContext.language === "ar" ? "عراب سوريا" : "Arab Syria"}`;
  const description = post.copy.seoDescription?.trim() || post.copy.excerpt;
  const image = post.featuredImage || `${SITE_URL}/opengraph-image`;
  return {
    ...base,
    title,
    description,
    alternates: { canonical, languages: getLanguageAlternates(publicPath) },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "عراب سوريا",
      locale: siteContext.language === "ar" ? "ar_AR" : siteContext.language === "tr" ? "tr_TR" : "en_US",
      type: "article",
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || post.publishedAt || undefined,
      tags: post.tags,
      images: [{ url: image, width: 1200, height: 630, alt: post.copy.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, siteContext] = await Promise.all([params, getRequestSiteContext()]);
  const language = siteContext.language;
  const post = await getServerBlogPostBySlug(slug, language);
  if (!post) notFound();
  const [related, taxonomy] = await Promise.all([
    getServerRelatedBlogPosts(post, language, 3),
    getServerBlogTaxonomy(language),
  ]);
  const t = copy[language];
  const locale = language === "ar" ? "ar-SA" : language === "tr" ? "tr-TR" : "en-US";
  const publicPath = `/blog/${post.slug}`;
  const canonical = getLocalizedAbsoluteUrl(publicPath, language);
  const backgroundImage = safeBackgroundImage(post.featuredImage);
  const publishedValue = post.publishedAt || post.scheduledAt;
  const safeHtml = sanitizeRenderableHtml(post.copy.content);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: post.copy.title,
    description: post.copy.excerpt,
    image: post.featuredImage ? [post.featuredImage] : undefined,
    datePublished: publishedValue || undefined,
    dateModified: post.updatedAt || publishedValue || undefined,
    inLanguage: language,
    mainEntityOfPage: canonical,
    keywords: post.tags.join(", "),
    author: { "@type": "Organization", name: "عراب سوريا", url: SITE_URL },
    publisher: { "@type": "Organization", name: "HAMZA AGENCY", alternateName: "عراب سوريا", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/Logo%20hamza%20agency.jpg` } },
  };

  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }} />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.24)_0%,rgba(7,0,9,0.96)_70%)]" /></div>
      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-12 md:py-16">
        <PublicBreadcrumbs currentLabel={post.copy.title} />
        <Link href={localizePublicHref("/blog", language)} className="mb-8 inline-flex min-h-11 w-fit items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">{t.back}</Link>
        <article className="overflow-hidden rounded-[2rem] border border-purple-400/20 bg-black/35 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur">
          {backgroundImage ? <div role="img" aria-label={post.copy.title} className="h-64 bg-cover bg-center md:h-96" style={{ backgroundImage }} /> : <div aria-hidden="true" className="h-36 bg-[radial-gradient(circle_at_20%_20%,rgba(245,215,110,0.25),transparent_38%),linear-gradient(135deg,rgba(124,58,237,0.45),rgba(7,0,9,0.9))]" />}
          <div className="p-7 md:p-10">
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-2 font-black text-purple-100">{t.category}: {taxonomy.categories[post.category]?.label || post.category}</span>
              {publishedValue ? <time dateTime={publishedValue}>{t.published} {new Date(publishedValue).toLocaleDateString(locale)}</time> : null}
              {post.updatedAt && post.updatedAt !== publishedValue ? <time dateTime={post.updatedAt}>{t.updated} {new Date(post.updatedAt).toLocaleDateString(locale)}</time> : null}
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">{post.copy.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-9 text-white/70">{post.copy.excerpt}</p>
            {post.tags.length ? <div className="mt-7 flex flex-wrap gap-3 text-sm text-white/60">{post.tags.map((tag) => <Link key={tag} href={`${localizePublicHref("/blog", language)}?tag=${encodeURIComponent(tag)}`} className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">#{tag}</Link>)}</div> : null}
            <div className="prose prose-invert mt-10 max-w-none leading-9 text-white/80 prose-a:text-purple-200 prose-headings:text-white prose-li:my-2" dangerouslySetInnerHTML={{ __html: safeHtml }} />
          </div>
        </article>
        {related.length > 0 ? <section className="mt-14" aria-labelledby="related-title"><h2 id="related-title" className="text-2xl font-black">{t.related}</h2><div className="mt-6 grid gap-6 md:grid-cols-3">{related.map((item) => <Link key={item.id} href={localizePublicHref(`/blog/${item.slug}`, language)} className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur transition hover:border-purple-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"><h3 className="text-lg font-black">{item.copy.title}</h3><p className="mt-3 text-sm leading-7 text-white/65">{item.copy.excerpt}</p></Link>)}</div></section> : null}
      </main>
    </PublicLanguageMain>
  );
}
