"use client";

import Link from "next/link";
import Image from "next/image";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export type SuccessStory = {
  id: number;
  title: string | null;
  person_name: string | null;
  country: string | null;
  platform: string | null;
  result_summary: string | null;
  story: string | null;
  image_url: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  status: string | null;
  is_visible: boolean | null;
  created_at: string | null;
};

const copy = {
  ar: {
    back: "← العودة إلى الرئيسية",
    badge: "مسارات نجاح HAMZA AGENCY",
    title: "قصص ومسارات وكالة حمزة",
    accent: "طريقة عمل واضحة ونتائج منظمة",
    intro: "نعرض هنا مسارات العمل التي تعتمدها وكالة حمزة لدعم صناع المحتوى والعملاء، من التقديم الأول إلى المتابعة والتنظيم واختيار البرنامج المناسب.",
    note: "تظهر القصص المنشورة والمعتمدة هنا عند توفرها.",
    defaultStats: ["مسارات معروضة", "برامج وخدمات", "متابعة مباشرة"],
    publishedStats: ["قصص منشورة", "برامج وخدمات", "متابعة مباشرة"],
    whatsapp: "واتساب",
    featuredBadge: "مسارات مميزة",
    featuredTitle: "مسارات بارزة",
    featuredText: "مسارات مختارة توضّح كيف تساعد وكالة حمزة في جعل التقديم والمتابعة أكثر وضوحاً واحترافية.",
    regularBadge: "مسارات إضافية",
    regularTitle: "تجارب ومسارات أخرى",
    regularText: "مسارات إضافية توضّح طريقة تنظيم الوكالة للتواصل، الطلبات، البرامج، والخدمات الرقمية.",
    ctaTitle: "هل تريد أن تبدأ مسارك مع وكالة حمزة؟",
    ctaText: "يمكنك تصفح البرامج المتاحة أو التواصل مع فريق الوكالة عبر واتساب للحصول على توجيه مناسب قبل التقديم.",
    browsePrograms: "تصفح البرامج",
    contactWhatsapp: "التواصل عبر واتساب",
    featuredTag: "مسار مميز",
    unknown: "غير محدد",
    pathTitle: "مسار عمل",
    agency: "وكالة حمزة",
    result: "النتيجة المنظمة",
    fallbackStory: "مسار عمل احترافي يوضح أثر التنظيم والمتابعة في تجربة أفضل.",
    imageAlt: "قصة نجاح من وكالة حمزة",
  },
  en: {
    back: "← Back to home",
    badge: "HAMZA AGENCY SUCCESS PATHS",
    title: "HAMZA AGENCY stories and paths",
    accent: "Clear processes and organized results",
    intro: "Here we present the work paths HAMZA AGENCY uses to support content creators and clients, from the first application to follow-up, organization, and choosing the right program.",
    note: "Approved published stories will appear here as they become available.",
    defaultStats: ["Paths shown", "Programs and services", "Direct follow-up"],
    publishedStats: ["Published stories", "Programs and services", "Direct follow-up"],
    whatsapp: "WhatsApp",
    featuredBadge: "Featured paths",
    featuredTitle: "Highlighted paths",
    featuredText: "Selected paths showing how HAMZA AGENCY makes applications and follow-up clearer and more professional.",
    regularBadge: "Additional paths",
    regularTitle: "More experiences and paths",
    regularText: "Additional paths showing how the agency organizes communication, requests, programs, and digital services.",
    ctaTitle: "Would you like to start your path with HAMZA AGENCY?",
    ctaText: "Browse the available programs or contact the agency team on WhatsApp for suitable guidance before applying.",
    browsePrograms: "Browse programs",
    contactWhatsapp: "Contact via WhatsApp",
    featuredTag: "Featured path",
    unknown: "Not specified",
    pathTitle: "Work path",
    agency: "HAMZA AGENCY",
    result: "Organized result",
    fallbackStory: "A professional work path showing how organization and follow-up create a better experience.",
    imageAlt: "Success story from HAMZA AGENCY",
  },
  tr: {
    back: "← Ana sayfaya dön",
    badge: "HAMZA AGENCY BAŞARI YOLLARI",
    title: "HAMZA AGENCY hikâyeleri ve yolları",
    accent: "Açık süreçler ve düzenli sonuçlar",
    intro: "Burada, HAMZA AGENCY'nin içerik üreticilerini ve müşterileri desteklemek için kullandığı çalışma yollarını sunuyoruz: ilk başvurudan takibe, organizasyona ve doğru programı seçmeye kadar.",
    note: "Onaylanmış hikâyeler kullanıma sunuldukça burada yayınlanır.",
    defaultStats: ["Gösterilen yollar", "Programlar ve hizmetler", "Doğrudan takip"],
    publishedStats: ["Yayınlanmış hikâyeler", "Programlar ve hizmetler", "Doğrudan takip"],
    whatsapp: "WhatsApp",
    featuredBadge: "Öne çıkan yollar",
    featuredTitle: "Öne çıkan yollar",
    featuredText: "HAMZA AGENCY'nin başvuru ve takip süreçlerini daha açık ve profesyonel hâle nasıl getirdiğini gösteren seçilmiş yollar.",
    regularBadge: "Ek yollar",
    regularTitle: "Diğer deneyimler ve yollar",
    regularText: "Ajansın iletişim, talepler, programlar ve dijital hizmetleri nasıl düzenlediğini gösteren ek yollar.",
    ctaTitle: "HAMZA AGENCY ile yolunuza başlamak ister misiniz?",
    ctaText: "Başvuru yapmadan önce uygun yönlendirme almak için mevcut programları inceleyebilir veya ajans ekibiyle WhatsApp üzerinden iletişime geçebilirsiniz.",
    browsePrograms: "Programları incele",
    contactWhatsapp: "WhatsApp ile iletişime geç",
    featuredTag: "Öne çıkan yol",
    unknown: "Belirtilmedi",
    pathTitle: "Çalışma yolu",
    agency: "HAMZA AGENCY",
    result: "Düzenli sonuç",
    fallbackStory: "Organizasyon ve takibin daha iyi bir deneyim oluşturduğunu gösteren profesyonel bir çalışma yolu.",
    imageAlt: "HAMZA AGENCY başarı hikâyesi",
  },
};

export default function SuccessStoriesPageContent({ stories }: { stories: SuccessStory[] }) {
  const language = useSiteLanguage();
  const direction = getLanguageDirection(language);
  const t = copy[language];
  const featuredStories = stories.filter((story) => story.is_featured);
  const regularStories = stories.filter((story) => !story.is_featured);
  const isDefault = stories.every((story) => story.created_at === null);
  const statLabels = isDefault ? t.defaultStats : t.publishedStats;

  return (
    <section dir={direction} className="relative z-10 mx-auto max-w-7xl px-5 py-16">
      <Link href="/" className="mb-8 inline-block text-purple-200">{t.back}</Link>

      <header className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 text-center shadow-[0_0_55px_rgba(168,85,247,0.14)] backdrop-blur md:p-10">
        <div className="mx-auto mb-5 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">{t.badge}</div>
        <h1 className="text-5xl font-black leading-tight md:text-7xl">{t.title}<span className="block bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent">{t.accent}</span></h1>
        <p className="mx-auto mt-6 max-w-4xl text-lg leading-9 text-white/72 md:text-xl">{t.intro}</p>
        {isDefault ? <div className="mx-auto mt-6 max-w-4xl rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-50/80">{t.note}</div> : null}
      </header>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <StatCard title={statLabels[0]} value={String(stories.length)} />
        <StatCard title={statLabels[1]} value="5" />
        <StatCard title={statLabels[2]} value={t.whatsapp} />
      </div>

      {featuredStories.length > 0 ? <section className="mt-14"><SectionHeader badge={t.featuredBadge} title={t.featuredTitle} text={t.featuredText} tone="yellow" /><div className="grid gap-6 lg:grid-cols-2">{featuredStories.map((story) => <StoryCard key={story.id} story={story} featured />)}</div></section> : null}
      {regularStories.length > 0 ? <section className="mt-14"><SectionHeader badge={t.regularBadge} title={t.regularTitle} text={t.regularText} tone="purple" /><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{regularStories.map((story) => <StoryCard key={story.id} story={story} />)}</div></section> : null}

      <section className="mt-14 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
        <h2 className="text-3xl font-black text-green-100">{t.ctaTitle}</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{t.ctaText}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/programs" className="rounded-full bg-purple-600 px-8 py-4 font-black text-white shadow-2xl">{t.browsePrograms}</Link>
          <a href="https://wa.me/905011730377" target="_blank" rel="noreferrer" className="rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">{t.contactWhatsapp}</a>
        </div>
      </section>
    </section>
  );

  function StoryCard({ story, featured = false }: { story: SuccessStory; featured?: boolean }) {
    return <article className={`overflow-hidden rounded-[2rem] border backdrop-blur ${featured ? "border-yellow-400/25 bg-yellow-500/10 shadow-[0_0_45px_rgba(212,175,55,0.10)]" : "border-white/10 bg-white/[0.045]"}`}>
      <div className="relative min-h-48 border-b border-white/10 bg-black/25">
        {story.image_url ? <Image src={story.image_url} alt={story.title || t.imageAlt} fill sizes="(min-width: 768px) 50vw, 100vw" unoptimized className="object-cover opacity-90" /> : <div className="flex h-48 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),rgba(7,0,9,0.95))]"><div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-yellow-400/25 bg-yellow-500/10 text-3xl font-black text-yellow-100">★</div></div>}
        {featured ? <div className="absolute right-4 top-4 rounded-full border border-yellow-300/25 bg-yellow-500/20 px-4 py-2 text-xs font-black text-yellow-100 backdrop-blur">{t.featuredTag}</div> : null}
      </div>
      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-2"><Badge>{story.platform || "HAMZA AGENCY"}</Badge><Badge>{story.country || t.unknown}</Badge></div>
        <h3 className="text-2xl font-black leading-9">{story.title || t.pathTitle}</h3>
        <p className="mt-3 text-sm font-bold text-white/50">{story.person_name || t.agency}</p>
        {story.result_summary ? <div className="mt-5 rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-green-100"><div className="mb-2 text-sm font-black">{t.result}</div><p className="leading-7 text-white/70">{story.result_summary}</p></div> : null}
        <p className="mt-5 leading-8 text-white/72">{story.story || t.fallbackStory}</p>
      </div>
    </article>;
  }
}

function StatCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 text-center backdrop-blur"><div className="text-4xl font-black text-yellow-100">{value}</div><div className="mt-3 text-sm font-bold text-white/55">{title}</div></div>;
}

function SectionHeader({ badge, title, text, tone }: { badge: string; title: string; text: string; tone: "yellow" | "purple" }) {
  const className = tone === "yellow" ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-100" : "border-purple-400/20 bg-purple-500/10 text-purple-100";
  return <div className="mb-6"><div className={`mb-3 inline-flex rounded-full border px-4 py-2 text-sm font-black ${className}`}>{badge}</div><h2 className="text-4xl font-black">{title}</h2><p className="mt-3 max-w-3xl leading-8 text-white/60">{text}</p></div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">{children}</span>;
}
