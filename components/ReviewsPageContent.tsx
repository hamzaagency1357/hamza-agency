"use client";

import Image from "next/image";
import { ReviewsBackLink, ReviewsHero } from "@/components/ReviewsStaticHeader";
import ReviewsStatsUi from "@/components/ReviewsStatsUi";
import { usePublishedReviews } from "@/components/ReviewsPublishedTranslations";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export type Review = {
  id: number;
  reviewer_name: string | null;
  country: string | null;
  platform: string | null;
  rating: number | null;
  content: string | null;
  avatar_url: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  status: string | null;
  is_visible: boolean | null;
  created_at: string | null;
};

const copy = {
  ar: { featuredBadge: "تقييمات مميزة", featuredTitle: "تجارب بارزة", featuredText: "تقييمات مختارة تظهر في مقدمة الصفحة لأنها تمثل تجربة واضحة مع الوكالة أو أحد برامجها.", allBadge: "كل التقييمات", allTitle: "آراء إضافية", allText: "آراء منشورة من صناع المحتوى والعملاء بعد المراجعة.", emptyTitle: "التقييمات المنشورة", emptyText: "لا توجد تقييمات منشورة للعرض حالياً. ستظهر هنا التقييمات الحقيقية بعد مراجعتها ونشرها من فريق الوكالة.", ctaTitle: "لديك تجربة مع وكالة حمزة؟", ctaText: "أرسل رأيك لفريق الوكالة عبر واتساب ليتم مراجعته قبل النشر.", cta: "إرسال تقييم عبر واتساب", reviewer: "عميل وكالة حمزة", unknown: "غير محدد", featuredTag: "تقييم مميز" },
  en: { featuredBadge: "Featured reviews", featuredTitle: "Highlighted experiences", featuredText: "Selected reviews appear first because they represent a clear experience with the agency or one of its programs.", allBadge: "All reviews", allTitle: "Additional feedback", allText: "Published creator and client feedback after review.", emptyTitle: "Published reviews", emptyText: "There are no published reviews to display right now. Genuine reviews will appear here after the agency team reviews and publishes them.", ctaTitle: "Have an experience with HAMZA AGENCY?", ctaText: "Send your feedback to the agency team on WhatsApp for review before publication.", cta: "Send feedback on WhatsApp", reviewer: "HAMZA AGENCY client", unknown: "Not specified", featuredTag: "Featured review" },
  tr: { featuredBadge: "Öne çıkan değerlendirmeler", featuredTitle: "Öne çıkan deneyimler", featuredText: "Ajansla veya programlarından biriyle net bir deneyimi yansıttığı için ilk sırada gösterilen seçilmiş değerlendirmeler.", allBadge: "Tüm değerlendirmeler", allTitle: "Ek görüşler", allText: "İncelendikten sonra yayınlanan içerik üreticisi ve müşteri görüşleri.", emptyTitle: "Yayınlanan değerlendirmeler", emptyText: "Şu anda gösterilecek yayınlanmış değerlendirme bulunmuyor. Gerçek değerlendirmeler ajans ekibi tarafından incelenip yayınlandıktan sonra burada görünür.", ctaTitle: "HAMZA AGENCY ile deneyiminiz var mı?", ctaText: "Görüşünüzü yayın öncesi inceleme için WhatsApp üzerinden ajans ekibine gönderin.", cta: "WhatsApp ile görüş gönder", reviewer: "HAMZA AGENCY müşterisi", unknown: "Belirtilmedi", featuredTag: "Öne çıkan değerlendirme" },
};

export default function ReviewsPageContent({ reviews }: { reviews: Review[] }) {
  const language = useSiteLanguage();
  const localizedReviews = usePublishedReviews(reviews);
  const t = copy[language];
  const direction = getLanguageDirection(language);
  const featuredReviews = localizedReviews.filter((review) => review.is_featured);
  const normalReviews = localizedReviews.filter((review) => !review.is_featured);
  const isDefault = localizedReviews.length === 0;
  const average = localizedReviews.length ? (localizedReviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) / localizedReviews.length).toFixed(1) : "—";

  return <section dir={direction} className="relative z-10 mx-auto max-w-7xl px-5 py-16"><ReviewsBackLink /><ReviewsHero isDefault={isDefault} /><ReviewsStatsUi isDefault={isDefault} count={localizedReviews.length} rating={average} />{featuredReviews.length > 0 ? <section className="mt-14"><SectionHeader badge={t.featuredBadge} title={t.featuredTitle} text={t.featuredText} tone="yellow" /><div className="grid gap-6 lg:grid-cols-2">{featuredReviews.map((review) => <ReviewCard key={review.id} review={review} featured />)}</div></section> : null}{localizedReviews.length > 0 ? <section className="mt-14"><SectionHeader badge={t.allBadge} title={t.allTitle} text={t.allText} tone="purple" /><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[...normalReviews, ...(normalReviews.length ? [] : featuredReviews)].map((review) => <ReviewCard key={`normal-${review.id}`} review={review} />)}</div></section> : <section className="mt-14 rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center backdrop-blur"><h2 className="text-3xl font-black">{t.emptyTitle}</h2><p className="mx-auto mt-4 max-w-2xl leading-8 text-white/65">{t.emptyText}</p></section>}<section className="mt-14 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur"><h2 className="text-3xl font-black text-green-100">{t.ctaTitle}</h2><p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{t.ctaText}</p><a href="https://wa.me/905011730377" target="_blank" rel="noreferrer" className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">{t.cta}</a></section></section>;

  function ReviewCard({ review, featured = false }: { review: Review; featured?: boolean }) {
    const initials = getInitials(review.reviewer_name);
    return <article data-user-generated-content="true" data-no-runtime-translate="true" className={`rounded-[2rem] border p-6 backdrop-blur ${featured ? "border-yellow-400/25 bg-yellow-500/10 shadow-[0_0_45px_rgba(212,175,55,0.10)]" : "border-white/10 bg-white/[0.045]"}`}><div className="flex items-start gap-4">{review.avatar_url ? <Image src={review.avatar_url} alt={review.reviewer_name || t.reviewer} width={56} height={56} unoptimized className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-400/25 bg-purple-500/10 text-lg font-black text-purple-100">{initials}</div>}<div className="min-w-0 flex-1"><h3 className="break-words text-xl font-black">{review.reviewer_name || t.reviewer}</h3><div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55"><span>{review.country || t.unknown}</span><span>•</span><span>{review.platform || "HAMZA AGENCY"}</span></div></div></div><div className="mt-5 text-xl tracking-widest">{renderStars(review.rating)}</div>{review.content?<p className="mt-5 leading-8 text-white/72">{review.content}</p>:null}{featured ? <div className="mt-5 inline-flex rounded-full border border-yellow-300/25 bg-yellow-500/10 px-4 py-2 text-xs font-black text-yellow-100">{t.featuredTag}</div> : null}</article>;
  }
}

function SectionHeader({ badge, title, text, tone }: { badge: string; title: string; text: string; tone: "yellow" | "purple" }) { const color = tone === "yellow" ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-100" : "border-purple-400/20 bg-purple-500/10 text-purple-100"; return <div className="mb-6"><div className={`mb-3 inline-flex rounded-full border px-4 py-2 text-sm font-black ${color}`}>{badge}</div><h2 className="text-4xl font-black">{title}</h2><p className="mt-3 max-w-3xl leading-8 text-white/60">{text}</p></div>; }
function getInitials(name: string | null) { if (!name) return "HA"; const words = name.trim().split(" ").filter(Boolean); return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase(); }
function renderStars(rating: number | null) { const safeRating = Math.max(1, Math.min(5, Number(rating || 5))); return Array.from({ length: 5 }).map((_, index) => <span key={index} className={index < safeRating ? "text-yellow-300" : "text-white/20"}>★</span>); }
