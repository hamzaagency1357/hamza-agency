"use client";

import Link from "next/link";
import Image from "next/image";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export type GalleryDisplayItem = {
  id: number;
  title: string | null;
  slug: string | null;
  category: string | null;
  media_type: string | null;
  description: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  effect_type: string | null;
  external_url: string | null;
  alt_text: string | null;
  button_label: string | null;
  button_url: string | null;
  status: string | null;
  is_visible: boolean | null;
  is_featured: boolean | null;
  sort_order: number | null;
};

type CardText = { title: string; text: string };
type GalleryCopy = {
  backHome: string;
  badge: string;
  title: string;
  subtitle: string;
  intro: string;
  heroStats: CardText[];
  featuredBadge: string;
  featuredTitle: string;
  featuredText: string;
  regularBadge: string;
  regularTitle: string;
  regularText: string;
  performanceBadge: string;
  performanceTitle: string;
  performanceText: string;
  performanceItems: CardText[];
  ctaTitle: string;
  ctaText: string;
  browsePrograms: string;
  whatsapp: string;
  galleryCategory: string;
  visualScene: string;
  interactiveScene: string;
  galleryScene: string;
  libraryVideoTitle: string;
  libraryImageTitle: string;
  libraryVideoDescription: string;
  libraryImageDescription: string;
  fallbackTitle: string;
  fallbackDescription: string;
  learnMore: string;
  imageAlt: string;
  videoAlt: string;
};

const copy: Record<"ar" | "en" | "tr", GalleryCopy> = {
  ar: {
    backHome: "← العودة إلى الرئيسية",
    badge: "معرض HAMZA AGENCY",
    title: "معرض الوكالة",
    subtitle: "هوية بصرية فاخرة لصناع المحتوى",
    intro: "مساحة تعرض روح وكالة حمزة، برامجها، خدماتها، وتجربة صناع المحتوى بأسلوب بصري فاخر ينسجم مع هوية الوكالة وطبيعة عملها.",
    heroStats: [
      { title: "هوية فاخرة", text: "ألوان موف وذهبية" },
      { title: "حركة هادئة", text: "تجربة مريحة للعين" },
      { title: "تنظيم واضح", text: "مشاهد تخدم محتوى الوكالة" },
    ],
    featuredBadge: "مشاهد مميزة",
    featuredTitle: "لقطات تعبّر عن هوية الوكالة",
    featuredText: "مشاهد مصممة لتعكس طابع وكالة حمزة، وتعرض فكرة البرامج وصناعة المحتوى بأسلوب بصري أنيق ومباشر.",
    regularBadge: "المزيد من المعرض",
    regularTitle: "مشاهد إضافية من منظومة الوكالة",
    regularText: "مساحة قابلة للتوسع لعرض مواد بصرية مرتبطة بالبرامج، الخدمات، الشركاء، وهوية الوكالة.",
    performanceBadge: "تجربة مشاهدة مريحة",
    performanceTitle: "معرض أنيق يحافظ على سرعة التصفح",
    performanceText: "تم تنظيم المعرض ليقدّم تجربة مشاهدة جذابة دون إرباك الزائر، مع تركيز واضح على جمال الهوية وسلاسة التنقل بين الأقسام.",
    performanceItems: [
      { title: "عرض منظم", text: "مشاهد مرتبة حسب أهميتها" },
      { title: "هوية موحدة", text: "ألوان تنسجم مع الموقع" },
      { title: "تجربة مريحة", text: "حركة ناعمة وغير مزعجة" },
      { title: "قابل للتوسع", text: "مساحة لإضافة مواد جديدة" },
    ],
    ctaTitle: "هل تريد استكشاف برامج وكالة حمزة؟",
    ctaText: "يمكنك الانتقال إلى صفحة البرامج أو التواصل مباشرة عبر واتساب لمعرفة البرنامج الأنسب لك.",
    browsePrograms: "تصفح البرامج",
    whatsapp: "التواصل عبر واتساب",
    galleryCategory: "معرض الوكالة",
    visualScene: "مشهد بصري",
    interactiveScene: "مشهد تفاعلي",
    galleryScene: "مشهد من المعرض",
    libraryVideoTitle: "مشهد من معرض الوكالة",
    libraryImageTitle: "صورة من معرض الوكالة",
    libraryVideoDescription: "فيديو ضمن معرض وكالة حمزة.",
    libraryImageDescription: "صورة ضمن معرض وكالة حمزة.",
    fallbackTitle: "مشهد من وكالة حمزة",
    fallbackDescription: "لقطة بصرية ضمن معرض وكالة حمزة.",
    learnMore: "معرفة المزيد",
    imageAlt: "صورة من معرض وكالة حمزة",
    videoAlt: "فيديو من معرض وكالة حمزة",
  },
  en: {
    backHome: "← Back to home",
    badge: "HAMZA AGENCY GALLERY",
    title: "Agency gallery",
    subtitle: "A premium visual identity for content creators",
    intro: "A space that presents the spirit of HAMZA AGENCY, its programs, services, and creator experience through a premium visual style aligned with the agency's identity and way of work.",
    heroStats: [
      { title: "Premium identity", text: "Purple and gold tones" },
      { title: "Calm motion", text: "A comfortable visual experience" },
      { title: "Clear structure", text: "Scenes that support agency content" },
    ],
    featuredBadge: "Featured scenes",
    featuredTitle: "Moments that express the agency identity",
    featuredText: "Scenes designed to reflect the HAMZA AGENCY character and present programs and content creation through an elegant, direct visual style.",
    regularBadge: "More from the gallery",
    regularTitle: "Additional scenes from the agency ecosystem",
    regularText: "An expandable space for visual materials related to programs, services, partners, and the agency identity.",
    performanceBadge: "A comfortable viewing experience",
    performanceTitle: "An elegant gallery that keeps browsing fast",
    performanceText: "The gallery is organized to offer an engaging experience without overwhelming visitors, with a clear focus on the identity's beauty and smooth navigation between sections.",
    performanceItems: [
      { title: "Organized display", text: "Scenes arranged by importance" },
      { title: "Unified identity", text: "Colors that match the website" },
      { title: "Comfortable experience", text: "Smooth, non-distracting motion" },
      { title: "Expandable", text: "Space for adding new materials" },
    ],
    ctaTitle: "Want to explore HAMZA AGENCY programs?",
    ctaText: "You can visit the programs page or contact us directly on WhatsApp to learn which program suits you best.",
    browsePrograms: "Browse programs",
    whatsapp: "Contact via WhatsApp",
    galleryCategory: "Agency gallery",
    visualScene: "Visual scene",
    interactiveScene: "Interactive scene",
    galleryScene: "Gallery scene",
    libraryVideoTitle: "Agency gallery scene",
    libraryImageTitle: "Agency gallery image",
    libraryVideoDescription: "A video in the HAMZA AGENCY gallery.",
    libraryImageDescription: "An image in the HAMZA AGENCY gallery.",
    fallbackTitle: "A HAMZA AGENCY scene",
    fallbackDescription: "A visual moment in the HAMZA AGENCY gallery.",
    learnMore: "Learn more",
    imageAlt: "Image from the HAMZA AGENCY gallery",
    videoAlt: "Video from the HAMZA AGENCY gallery",
  },
  tr: {
    backHome: "← Ana sayfaya dön",
    badge: "HAMZA AGENCY GALERİ",
    title: "Ajans galerisi",
    subtitle: "İçerik üreticileri için premium görsel kimlik",
    intro: "HAMZA AGENCY'nin ruhunu, programlarını, hizmetlerini ve içerik üreticisi deneyimini ajansın kimliği ve çalışma biçimiyle uyumlu premium bir görsel tarzla sunan bir alan.",
    heroStats: [
      { title: "Premium kimlik", text: "Mor ve altın tonları" },
      { title: "Sakin hareket", text: "Gözü yormayan deneyim" },
      { title: "Açık düzen", text: "Ajans içeriğini destekleyen sahneler" },
    ],
    featuredBadge: "Öne çıkan sahneler",
    featuredTitle: "Ajans kimliğini yansıtan anlar",
    featuredText: "HAMZA AGENCY karakterini yansıtmak ve programlar ile içerik üretimi fikrini zarif, doğrudan bir görsel dille sunmak için tasarlanmış sahneler.",
    regularBadge: "Galeriden daha fazlası",
    regularTitle: "Ajans ekosisteminden ek sahneler",
    regularText: "Programlar, hizmetler, ortaklar ve ajans kimliğiyle ilgili görsel materyaller için genişletilebilir bir alan.",
    performanceBadge: "Rahat izleme deneyimi",
    performanceTitle: "Gezintiyi hızlı tutan zarif galeri",
    performanceText: "Galeri, ziyaretçiyi bunaltmadan ilgi çekici bir deneyim sunmak; kimliğin estetiğine ve bölümler arasında akıcı geçişe odaklanmak için düzenlenmiştir.",
    performanceItems: [
      { title: "Düzenli sunum", text: "Önem derecesine göre sıralanmış sahneler" },
      { title: "Tutarlı kimlik", text: "Siteyle uyumlu renkler" },
      { title: "Rahat deneyim", text: "Yumuşak ve dikkat dağıtmayan hareket" },
      { title: "Genişletilebilir", text: "Yeni materyaller eklemek için alan" },
    ],
    ctaTitle: "HAMZA AGENCY programlarını keşfetmek ister misiniz?",
    ctaText: "Programlar sayfasını ziyaret edebilir veya size en uygun programı öğrenmek için WhatsApp üzerinden doğrudan iletişime geçebilirsiniz.",
    browsePrograms: "Programları incele",
    whatsapp: "WhatsApp ile iletişime geç",
    galleryCategory: "Ajans galerisi",
    visualScene: "Görsel sahne",
    interactiveScene: "Etkileşimli sahne",
    galleryScene: "Galeri sahnesi",
    libraryVideoTitle: "Ajans galerisinden sahne",
    libraryImageTitle: "Ajans galerisinden görsel",
    libraryVideoDescription: "HAMZA AGENCY galerisindeki bir video.",
    libraryImageDescription: "HAMZA AGENCY galerisindeki bir görsel.",
    fallbackTitle: "HAMZA AGENCY sahnesi",
    fallbackDescription: "HAMZA AGENCY galerisinden görsel bir an.",
    learnMore: "Daha fazla bilgi",
    imageAlt: "HAMZA AGENCY galerisinden görsel",
    videoAlt: "HAMZA AGENCY galerisinden video",
  },
};

function useGalleryCopy() {
  const language = useSiteLanguage();
  return { language, direction: getLanguageDirection(language), text: copy[language] };
}

export function GalleryBackHomeLink() {
  const { direction, text } = useGalleryCopy();
  return <Link href="/" dir={direction} className="mb-8 inline-block text-purple-200">{text.backHome}</Link>;
}

export function GalleryHero() {
  const { direction, text } = useGalleryCopy();
  return <header dir={direction} className="overflow-hidden rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 text-center shadow-[0_0_60px_rgba(168,85,247,0.16)] backdrop-blur md:p-10"><div className="mx-auto mb-5 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-black text-yellow-100">{text.badge}</div><h1 className="text-5xl font-black leading-tight md:text-7xl">{text.title}<span className="block bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent">{text.subtitle}</span></h1><p className="mx-auto mt-6 max-w-4xl text-lg leading-9 text-white/72 md:text-xl">{text.intro}</p><div className="mt-8 grid gap-4 md:grid-cols-3">{text.heroStats.map((item) => <HeroStat key={item.title} value={item.title} label={item.text} />)}</div></header>;
}

export function GallerySectionHeader({ kind }: { kind: "featured" | "regular" }) {
  const { direction, text } = useGalleryCopy();
  const data = kind === "featured" ? { badge: text.featuredBadge, title: text.featuredTitle, description: text.featuredText, tone: "yellow" } : { badge: text.regularBadge, title: text.regularTitle, description: text.regularText, tone: "purple" };
  const colors = data.tone === "yellow" ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-100" : "border-purple-400/20 bg-purple-500/10 text-purple-100";
  return <div dir={direction} className="mb-6"><div className={`mb-3 inline-flex rounded-full border px-4 py-2 text-sm font-black ${colors}`}>{data.badge}</div><h2 className="text-4xl font-black">{data.title}</h2><p className="mt-3 max-w-3xl leading-8 text-white/60">{data.description}</p></div>;
}

export function GalleryPerformancePanel() {
  const { direction, text } = useGalleryCopy();
  return <section dir={direction} className="mt-14 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 backdrop-blur"><div className="mb-3 inline-flex rounded-full border border-green-400/20 bg-green-500/10 px-4 py-2 text-sm font-black text-green-100">{text.performanceBadge}</div><h2 className="text-3xl font-black">{text.performanceTitle}</h2><p className="mt-4 max-w-4xl leading-8 text-white/70">{text.performanceText}</p><div className="mt-7 grid gap-4 md:grid-cols-4">{text.performanceItems.map((item) => <PerformanceItem key={item.title} title={item.title} text={item.text} />)}</div></section>;
}

export function GalleryCta() {
  const { direction, text } = useGalleryCopy();
  return <section dir={direction} className="mt-14 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 text-center backdrop-blur"><h2 className="text-3xl font-black text-yellow-100">{text.ctaTitle}</h2><p className="mx-auto mt-4 max-w-3xl leading-8 text-white/70">{text.ctaText}</p><div className="mt-7 flex flex-col justify-center gap-3 md:flex-row"><Link href="/programs" className="rounded-full bg-purple-600 px-8 py-4 font-black text-white shadow-2xl">{text.browsePrograms}</Link><a href="https://wa.me/905011730377" target="_blank" rel="noreferrer" className="rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">{text.whatsapp}</a></div></section>;
}

export function GalleryCard({ item, featured = false }: { item: GalleryDisplayItem; featured?: boolean }) {
  const { direction, text } = useGalleryCopy();
  const mediaType = item.media_type || "effect";
  const isLibraryUpload = item.id >= 900000;
  const title = isLibraryUpload ? mediaType === "video" ? text.libraryVideoTitle : text.libraryImageTitle : item.title || text.fallbackTitle;
  const description = isLibraryUpload ? mediaType === "video" ? text.libraryVideoDescription : text.libraryImageDescription : item.description || text.fallbackDescription;
  const buttonUrl = isLibraryUpload ? null : item.button_url || "/programs";
  const buttonLabel = isLibraryUpload ? null : item.button_label || text.learnMore;
  const cardTypeLabel = mediaType === "effect" ? text.visualScene : mediaType === "video" ? text.interactiveScene : text.galleryScene;
  const alt = mediaType === "video" ? text.videoAlt : text.imageAlt;

  return <article dir={direction} className={`overflow-hidden rounded-[2rem] border backdrop-blur transition hover:-translate-y-1 ${featured ? "border-yellow-400/25 bg-yellow-500/10 shadow-[0_0_45px_rgba(212,175,55,0.10)]" : "border-white/10 bg-white/[0.045]"}`}><div className="relative aspect-[16/10] overflow-hidden bg-black/40">{mediaType === "image" && item.media_url ? <Image src={item.thumbnail_url || item.media_url} alt={alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized className="object-contain bg-black/45 p-2" /> : mediaType === "video" && item.media_url ? <video src={item.media_url} className="h-full w-full object-contain bg-black/45 p-2" controls preload="metadata" aria-label={text.videoAlt} /> : mediaType === "video" && item.thumbnail_url ? <div className="relative h-full w-full"><Image src={item.thumbnail_url} alt={text.videoAlt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized className="object-cover" /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl">▶</div></div></div> : <GeneratedVisual effectType={item.effect_type || "luxury_waves"} />}<div className="absolute right-4 top-4 rounded-full border border-yellow-400/20 bg-black/45 px-3 py-1 text-xs font-black text-yellow-100 backdrop-blur">{item.category || text.galleryCategory}</div><div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-black text-white/70 backdrop-blur">{cardTypeLabel}</div></div><div className="p-6"><h3 className="text-2xl font-black">{title}</h3><p className="mt-4 leading-8 text-white/65">{description}</p>{buttonUrl && buttonLabel ? buttonUrl.startsWith("http") ? <a href={buttonUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white/75">{buttonLabel}</a> : <Link href={buttonUrl} className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white/75">{buttonLabel}</Link> : null}</div></article>;
}

function GeneratedVisual({ effectType }: { effectType: string }) {
  const label = effectType === "creator_spotlight" ? "CREATOR" : effectType === "live_pulse" ? "LIVE" : effectType === "program_network" ? "NETWORK" : effectType === "digital_glow" ? "DIGITAL" : "HAMZA";
  return <div className={`relative h-full w-full overflow-hidden ${effectType}`}><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(250,204,21,0.28),rgba(124,58,237,0.22)_35%,rgba(5,0,8,0.95)_75%)]" /><div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-300/20 bg-purple-500/10 shadow-[0_0_80px_rgba(168,85,247,0.35)]" /><div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-300/15" /><div className="absolute -left-20 top-10 h-36 w-36 rounded-full bg-purple-500/30 blur-3xl" /><div className="absolute -right-20 bottom-10 h-36 w-36 rounded-full bg-yellow-400/20 blur-3xl" /><div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:42px_42px]" /><div className="absolute inset-0 flex items-center justify-center"><div className="rounded-[2rem] border border-white/10 bg-black/35 px-8 py-5 text-center backdrop-blur"><div className="text-4xl font-black tracking-[0.18em] text-white">{label}</div><div className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-100/75">HAMZA AGENCY</div></div></div><div className="absolute bottom-6 left-6 right-6 h-1 rounded-full bg-gradient-to-r from-transparent via-yellow-200/50 to-transparent" /></div>;
}

function HeroStat({ value, label }: { value: string; label: string }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur"><div className="text-2xl font-black text-yellow-100">{value}</div><div className="mt-2 text-sm font-bold text-white/55">{label}</div></div>; }
function PerformanceItem({ title, text }: CardText) { return <div className="rounded-3xl border border-white/10 bg-black/25 p-5"><h3 className="font-black text-white">{title}</h3><p className="mt-2 text-sm text-white/55">{text}</p></div>; }
