import Link from "next/link";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import { getBlogPosts, getBlogCategories, getBlogTags } from "@/lib/blog/posts.mjs";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";
import type { BlogCategory, BlogTag } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlogListPage() {
  const siteContext = await getRequestSiteContext();
  const language = siteContext.language;
  const result = getBlogPosts({ language, page: 1, perPage: 6 });
  const categories = getBlogCategories(language) as Record<string, BlogCategory>;
  const tags = getBlogTags(language) as Record<string, BlogTag>;
  const locale = language === "ar" ? "ar-SA" : language === "tr" ? "tr-TR" : "en-US";
  const ctaLabel = language === "ar" ? "اقرأ المزيد" : language === "tr" ? "Devamını oku" : "Read more";

  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#070009]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.28)_0%,rgba(7,0,9,0.95)_70%)]" />
      </div>
      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-16">
        <PublicBreadcrumbs />
        <header className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-purple-200">Blog</p>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">{result.labels.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-white/70">
            {language === "ar"
              ? "محتوى عملي يشرح العمل الرقمي، إدارة البرامج، والهوية الرقمية بطريقة واضحة ومهنية."
              : language === "tr"
                ? "Dijital çalışma, program yönetimi ve marka kimliği hakkında açık ve profesyonel içerikler."
                : "Practical content about digital operations, programs, and brand identity in a clear professional tone."}
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          {Object.values(categories).map((category) => (
            <Link key={category.slug} href={`/blog?category=${category.slug}`} className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/80">
              {category.label}
            </Link>
          ))}
          {Object.values(tags).slice(0, 8).map((tag) => (
            <Link key={tag.slug} href={`/blog?tag=${tag.slug}`} className="rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-100">
              #{tag.label}
            </Link>
          ))}
        </div>

        {result.posts.length > 0 ? (
          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            {result.posts.map((post) => (
              <article key={post.id} className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">{categories[post.category]?.label || post.category}</span>
                  <span>{new Date(post.publishedAt || post.scheduledAt || Date.now()).toLocaleDateString(locale)}</span>
                </div>
                <h2 className="mt-5 text-2xl font-black leading-9">{post.copy.title}</h2>
                <p className="mt-4 leading-8 text-white/70">{post.copy.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="mt-6 inline-flex rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white">
                  {ctaLabel}
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
            <h2 className="text-2xl font-black">{result.labels.empty}</h2>
            <p className="mt-3 text-white/70">{language === "ar" ? "سيظهر المحتوى هنا فور نشره أو تحديثه." : language === "tr" ? "İçerik yayınlandığında veya güncellendiğinde burada görünür." : "Content will appear here as soon as it is published or updated."}</p>
          </section>
        )}
      </main>
    </PublicLanguageMain>
  );
}
