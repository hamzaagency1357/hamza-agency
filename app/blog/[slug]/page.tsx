import Link from "next/link";
import { notFound } from "next/navigation";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import { getBlogPostBySlug, getRelatedBlogPosts } from "@/lib/blog/posts.mjs";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const siteContext = await getRequestSiteContext();
  const language = siteContext.language;
  const { slug } = await params;
  const post = getBlogPostBySlug(slug, { language, preview: false });
  if (!post) notFound();
  const related = getRelatedBlogPosts(post, { language, preview: false, limit: 3 });

  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#070009]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.24)_0%,rgba(7,0,9,0.96)_70%)]" />
      </div>
      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-16">
        <PublicBreadcrumbs currentLabel={post.copy.title} />
        <Link href="/blog" className="mb-8 inline-flex w-fit rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black text-white/80">
          {language === "ar" ? "← العودة إلى المدونة" : language === "tr" ? "← Bloga dön" : "← Back to blog"}
        </Link>
        <article className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-purple-200">{post.category}</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">{post.copy.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-white/70">{post.copy.excerpt}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/60">
            {post.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">#{tag}</span>)}
          </div>
          <div className="prose prose-invert mt-10 max-w-none leading-9 text-white/75" dangerouslySetInnerHTML={{ __html: post.copy.content }} />
        </article>

        {related.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-2xl font-black">Related articles</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <Link key={item.id} href={`/blog/${item.slug}`} className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
                  <h3 className="text-lg font-black">{item.copy.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/65">{item.copy.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </PublicLanguageMain>
  );
}
