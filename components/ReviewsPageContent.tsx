"use client";

import { ReviewsBackLink, ReviewsHero } from "@/components/ReviewsStaticHeader";
import ReviewsStatsUi from "@/components/ReviewsStatsUi";
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
  ar: {
    featuredDefaultBadge: "نماذج مميزة",
    featuredBadge: "تقييمات مميزة",
    featuredTitle: "تجارب بارزة",
    featuredDefaultText: "نماذج مختارة توضّح طريقة عرض التقييمات قبل نشر آراء حقيقية من لوحة الإدارة.",
    featuredText: "تقييمات مختارة تظهر في مقدمة الصفحة لأنها تمثل تجربة واضحة مع الوكالة أو أحد برامجها.",
    allDefaultBadge: "نماذج إضافية",
    allBadge: "كل التقييمات",
    allTitle: "آراء إضافية",
    allText: "تقييمات يمكن إدارتها لاحقاً من لوحة التحكم، مع إمكانية إظهارها أو إخفائها وترتيبها.",
    ctaTitle: "لديك تجربة مع وكالة حمزة؟",
    ctaText: "يمكن لاحقاً إضافة نموذج تقييم رسمي من الموقع، أما حالياً يمكن إرسال رأيك لفريق الوكالة عبر واتساب ليتم مراجعته قبل النشر.",
    cta: "إرسال تقييم عبر واتساب",
    reviewer: "عميل وكالة حمزة",
    unknown: "غير محدد",
    defaultReview: "تقييم إيجابي لتجربة التعامل مع وكالة حمزة.",
    featuredTag: "تقييم مميز",
    sampleFeaturedTag: "نموذج مميز",
    sampleTag: "نموذج توضيحي",
  },
  en: {
    featuredDefaultBadge: "Featured examples",
    featuredBadge: "Featured reviews",
    featuredTitle: "Highlighted experiences",
    featuredDefaultText: "Selected examples showing how reviews appear before real feedback is published from the admin dashboard.",
    featuredText: "Selected reviews appear first because they represent a clear experience with the agency or one of its programs.",
    allDefaultBadge: "More examples",
    allBadge: "All reviews",
    allTitle: "Additional feedback",
    allText: "Reviews that can later be managed, shown, hidden, and ordered through the admin dashboard.",
    ctaTitle: "Have an experience with HAMZA AGENCY?",
    ctaText: "An official review form can be added later. For now, send your feedback to the agency team on WhatsApp for review before publication.",
    cta: "Send feedback on WhatsApp",
    reviewer: "HAMZA AGENCY client",
    unknown: "Not specified",
    defaultReview: "A positive review of the HAMZA AGENCY experience.",
    featuredTag: "Featured review",
    sampleFeaturedTag: "Featured example",
    sampleTag: "Display example",
  },
  tr: {
    featuredDefaultBadge: "Öne çıkan örnekler",
    featuredBadge: "Öne çıkan değerlendirmeler",
    featuredTitle: "Öne çıkan deneyimler",
    featuredDefaultText: "Yönetim panelinden gerçek görüşler yayınlanmadan önce değerlendirmelerin nasıl görüneceğini açıklayan seçilmiş örnekler.",
    featuredText: "Ajansla veya programlarından biriyle net bir deneyimi yansıttığı için ilk sırada gösterilen seçilmiş değerlendirmeler.",
    allDefaultBadge: "Ek örnekler",
    allBadge: "Tüm değerlendirmeler",
    allTitle: "Ek görüşler",
    allText: "Daha sonra yönetim panelinden yönetilebilen, gösterilebilen, gizlenebilen ve sıralanabilen değerlendirmeler.",
    ctaTitle: "HAMZA AGENCY ile deneyiminiz var mı?",
    ctaText: "İleride resmi bir değerlendirme formu eklenebilir. Şimdilik yayın öncesi inceleme için görüşünüzü WhatsApp üzerinden ajans ekibine gönderebilirsiniz.",
    cta: "WhatsApp ile görüş gönder",
    reviewer: "HAMZA AGENCY müşterisi",
    unknown: "Belirtilmedi",
    defaultReview: "HAMZA AGENCY deneyimi hakkında olumlu bir değerlendirme.",
    featuredTag: "Öne çıkan değerlendirme",
    sampleFeaturedTag: "Öne çıkan örnek",
    sampleTag: "Sunum örneği",
  },
};

export default function ReviewsPageContent({ reviews }: { reviews: Review[] }) {
  const language = useSiteLanguage();
  const t = copy[language];
  const direction = getLanguageDirection(language);
  const featuredReviews = reviews.filter((review) => review.is_featured);
  const normalReviews = reviews.filter((review) => !review.is_featured);
  const isDefault = reviews.every((review) => review.created_at === null);
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) / reviews.length).toFixed(1) : "5.0";

  return (
    <section dir={direction} className="relative z-10 mx-auto max-w-7xl px-5 py-16">
      <ReviewsBackLink />
      <ReviewsHero isDefault={isDefault} />
      <ReviewsStatsUi isDefault={isDefault} count={reviews.length} rating={average} />

      {featuredReviews.length > 0 ? (
        <section className="mt-14">
          <SectionHeader
            badge={isDefault ? t.featuredDefaultBadge : t.featuredBadge}
            title={t.featuredTitle}
            text={isDefault ? t.featuredDefaultText : t.featuredText}
            tone="yellow"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {featuredReviews.map((review) => <ReviewCard key={review.id} review={review} featured isDefault={isDefault} />)}
          </div>
        </section>
      ) : null}

      <section className="mt-14">
        <SectionHeader
          badge={isDefault ? t.allDefaultBadge : t.allBadge}
          title={t.allTitle}
          text={t.allText}
          tone="purple"
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...normalReviews, ...(normalReviews.length ? [] : featuredReviews)].map((review) => <ReviewCard key={`normal-${review.id}`} review={review} isDefault={isDefault} />)}
        </div>
      </section>

      <section className="mt-14 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
        <h2 className="text-3xl font-black text-green-100">{t.ctaTitle}</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{t.ctaText}</p>
        <a href="https://wa.me/905011730377" target="_blank" rel="noreferrer" className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">{t.cta}</a>
      </section>
    </section>
  );

  function ReviewCard({ review, featured = false, isDefault = false }: { review: Review; featured?: boolean; isDefault?: boolean }) {
    const initials = getInitials(review.reviewer_name);
    return (
      <article className={`rounded-[2rem] border p-6 backdrop-blur ${featured ? "border-yellow-400/25 bg-yellow-500/10 shadow-[0_0_45px_rgba(212,175,55,0.10)]" : "border-white/10 bg-white/[0.045]"}`}>
        <div className="flex items-start gap-4">
          {review.avatar_url ? <img src={review.avatar_url} alt={review.reviewer_name || t.reviewer} className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-400/25 bg-purple-500/10 text-lg font-black text-purple-100">{initials}</div>}
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-xl font-black">{review.reviewer_name || t.reviewer}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55"><span>{review.country || t.unknown}</span><span>•</span><span>{review.platform || "HAMZA AGENCY"}</span></div>
          </div>
        </div>
        <div className="mt-5 text-xl tracking-widest">{renderStars(review.rating)}</div>
        <p className="mt-5 leading-8 text-white/72">{review.content || t.defaultReview}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {featured ? <div className="inline-flex rounded-full border border-yellow-300/25 bg-yellow-500/10 px-4 py-2 text-xs font-black text-yellow-100">{isDefault ? t.sampleFeaturedTag : t.featuredTag}</div> : null}
          {isDefault ? <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black text-white/55">{t.sampleTag}</div> : null}
        </div>
      </article>
    );
  }
}

function SectionHeader({ badge, title, text, tone }: { badge: string; title: string; text: string; tone: "yellow" | "purple" }) {
  const color = tone === "yellow" ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-100" : "border-purple-400/20 bg-purple-500/10 text-purple-100";
  return <div className="mb-6"><div className={`mb-3 inline-flex rounded-full border px-4 py-2 text-sm font-black ${color}`}>{badge}</div><h2 className="text-4xl font-black">{title}</h2><p className="mt-3 max-w-3xl leading-8 text-white/60">{text}</p></div>;
}

function getInitials(name: string | null) {
  if (!name) return "HA";
  const words = name.trim().split(" ").filter(Boolean);
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function renderStars(rating: number | null) {
  const safeRating = Math.max(1, Math.min(5, Number(rating || 5)));
  return Array.from({ length: 5 }).map((_, index) => <span key={index} className={index < safeRating ? "text-yellow-300" : "text-white/20"}>★</span>);
}
