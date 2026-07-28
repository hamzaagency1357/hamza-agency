import PublicLanguageMain from "@/components/PublicLanguageMain";
import ReviewsPageContent, { type Review } from "@/components/ReviewsPageContent";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fallbackReviews: Review[] = [];

async function getReviews(): Promise<Review[]> {
  if (!supabase) return fallbackReviews;

  const { data, error } = await supabase
    .from("reviews")
    .select("id, reviewer_name, country, platform, rating, content, avatar_url, is_featured, sort_order, status, is_visible, created_at")
    .eq("is_visible", true)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return fallbackReviews;
  return data as Review[];
}

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <ReviewsBackground />
      <ReviewsPageContent reviews={reviews} />
    </PublicLanguageMain>
  );
}

function ReviewsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.18)_0%,rgba(124,58,237,0.20)_34%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" />
    </div>
  );
}
