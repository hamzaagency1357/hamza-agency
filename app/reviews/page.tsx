import PublicLanguageMain from "@/components/PublicLanguageMain";
import ReviewsPageContent, { type Review } from "@/components/ReviewsPageContent";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fallbackReviews: Review[] = [
  {
    id: 1,
    reviewer_name: "نموذج تجربة من TikTok",
    country: "تركيا",
    platform: "TikTok",
    rating: 5,
    content: "مثال توضيحي لطريقة عرض تقييم من صانع محتوى بعد شرح خطوات الانضمام والمتابعة عبر واتساب.",
    avatar_url: null,
    is_featured: true,
    sort_order: 1,
    status: "published",
    is_visible: true,
    created_at: null,
  },
  {
    id: 2,
    reviewer_name: "نموذج تجربة بث مباشر",
    country: "سوريا",
    platform: "BIGO LIVE",
    rating: 5,
    content: "مثال توضيحي لتجربة تواصل واضحة ومتابعة طلب بدون تعقيد، ويستبدل لاحقاً بتقييمات حقيقية من لوحة الإدارة.",
    avatar_url: null,
    is_featured: true,
    sort_order: 2,
    status: "published",
    is_visible: true,
    created_at: null,
  },
  {
    id: 3,
    reviewer_name: "نموذج صانع محتوى جديد",
    country: "العراق",
    platform: "Yaahlan",
    rating: 5,
    content: "مثال يوضح كيف يمكن عرض رأي مختصر حول فهم الفرق بين البرامج والخطوات المطلوبة قبل التقديم.",
    avatar_url: null,
    is_featured: false,
    sort_order: 3,
    status: "published",
    is_visible: true,
    created_at: null,
  },
  {
    id: 4,
    reviewer_name: "نموذج خدمات رقمية",
    country: "تركيا",
    platform: "Digital Services",
    rating: 5,
    content: "مثال لطريقة عرض تجربة طلب خدمة من الموقع ثم المتابعة عبر واتساب بعد إرسال التفاصيل.",
    avatar_url: null,
    is_featured: false,
    sort_order: 4,
    status: "published",
    is_visible: true,
    created_at: null,
  },
];

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
