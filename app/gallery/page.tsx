import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GalleryItem = {
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

type MediaLibraryItem = {
  id: number;
  created_at: string | null;
  name: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
  alt_text: string | null;
  page_slug: string | null;
  is_active: boolean | null;
};

const fallbackItems: GalleryItem[] = [
  {
    id: 1,
    title: "هوية وكالة حمزة",
    slug: "luxury-agency-waves",
    category: "هوية الوكالة",
    media_type: "effect",
    description:
      "مشهد فاخر يعكس الطابع الملكي لوكالة حمزة من خلال ألوان موف وذهبية وحركة بصرية هادئة.",
    media_url: null,
    thumbnail_url: null,
    effect_type: "luxury_waves",
    external_url: null,
    alt_text: "مؤثر بصري فاخر لهوية وكالة حمزة",
    button_label: "اكتشف البرامج",
    button_url: "/programs",
    status: "published",
    is_visible: true,
    is_featured: true,
    sort_order: 1,
  },
  {
    id: 2,
    title: "مسار صانع المحتوى",
    slug: "creator-spotlight-motion",
    category: "صناع المحتوى",
    media_type: "effect",
    description:
      "تصميم بصري يعبّر عن بداية صانع المحتوى داخل منظومة وكالة حمزة وخطواته نحو الظهور بشكل احترافي.",
    media_url: null,
    thumbnail_url: null,
    effect_type: "creator_spotlight",
    external_url: null,
    alt_text: "مؤثر بصري لصناع المحتوى",
    button_label: "انضم الآن",
    button_url: "/programs",
    status: "published",
    is_visible: true,
    is_featured: true,
    sort_order: 2,
  },
  {
    id: 3,
    title: "تجربة البث المباشر",
    slug: "live-streaming-pulse",
    category: "البث المباشر",
    media_type: "effect",
    description:
      "مشهد مستوحى من طاقة البث المباشر والتفاعل مع الجمهور ضمن بيئة منظمة واحترافية.",
    media_url: null,
    thumbnail_url: null,
    effect_type: "live_pulse",
    external_url: null,
    alt_text: "مؤثر بصري للبث المباشر",
    button_label: "شاهد البرامج",
    button_url: "/programs",
    status: "published",
    is_visible: true,
    is_featured: true,
    sort_order: 3,
  },
];

async function getCuratedGalleryItems(): Promise<GalleryItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("status", "published")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .limit(12);

  if (error || !data) return [];
  return data as GalleryItem[];
}

async function getMediaLibraryGalleryItems(): Promise<GalleryItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("media")
    .select(
      "id, created_at, name, file_url, file_type, category, alt_text, page_slug, is_active"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return (data as MediaLibraryItem[])
    .filter((item) => {
      const url = item.file_url || "";
      const type = item.file_type || "";
      const category = item.category || "";
      const pageSlug = item.page_slug || "";
      const isRealMedia = url.startsWith("http") || url.startsWith("/");
      const isVisualFile = ["image", "logo", "video", "background_video"].includes(type);
      const isGalleryReady =
        pageSlug === "gallery" || category === "gallery" || category === "general";

      return isRealMedia && isVisualFile && isGalleryReady;
    })
    .map((item, index) => {
      const isVideo = item.file_type === "video" || item.file_type === "background_video";
      const url = item.file_url || "";

      return {
        id: 900000 + item.id,
        title: isVideo ? "مشهد من معرض الوكالة" : "صورة من معرض الوكالة",
        slug: `media-library-${item.id}`,
        category:
          item.category === "gallery" || item.page_slug === "gallery"
            ? "معرض الوكالة"
            : "مكتبة الوسائط",
        media_type: isVideo ? "video" : "image",
        description: isVideo
          ? "فيديو ضمن معرض وكالة حمزة."
          : "صورة ضمن معرض وكالة حمزة.",
        media_url: url,
        thumbnail_url: isVideo ? null : url,
        effect_type: null,
        external_url: null,
        alt_text: isVideo ? "فيديو من معرض وكالة حمزة" : "صورة من معرض وكالة حمزة",
        button_label: null,
        button_url: null,
        status: "published",
        is_visible: true,
        is_featured: false,
        sort_order: 1000 + index,
      };
    });
}

async function getGalleryItems(): Promise<GalleryItem[]> {
  const curatedItems = await getCuratedGalleryItems();
  const mediaItems = await getMediaLibraryGalleryItems();
  const allItems = [...curatedItems, ...mediaItems];

  if (allItems.length === 0) return fallbackItems;
  return allItems;
}

export default async function GalleryPage() {
  const items = await getGalleryItems();
  const featuredItems = items.filter((item) => item.is_featured);
  const regularItems = items.filter((item) => !item.is_featured);

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
      <GalleryBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Link href="/" className="mb-8 inline-block text-purple-200">
          ← العودة إلى الرئيسية
        </Link>

        <header className="overflow-hidden rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 text-center shadow-[0_0_60px_rgba(168,85,247,0.16)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-black text-yellow-100">
            HAMZA AGENCY GALLERY
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            معرض الوكالة
            <span className="block bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent">
              هوية بصرية فاخرة لصناع المحتوى
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-4xl text-lg leading-9 text-white/72 md:text-xl">
            مساحة تعرض روح وكالة حمزة، برامجها، خدماتها، وتجربة صناع المحتوى
            بأسلوب بصري فاخر ينسجم مع هوية الوكالة وطبيعة عملها.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <HeroStat value="هوية فاخرة" label="ألوان موف وذهبية" />
            <HeroStat value="حركة هادئة" label="تجربة مريحة للعين" />
            <HeroStat value="تنظيم واضح" label="مشاهد تخدم محتوى الوكالة" />
          </div>
        </header>

        {featuredItems.length > 0 && (
          <section className="mt-14">
            <div className="mb-6">
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-sm font-black text-yellow-100">
                مشاهد مميزة
              </div>

              <h2 className="text-4xl font-black">لقطات تعبّر عن هوية الوكالة</h2>

              <p className="mt-3 max-w-3xl leading-8 text-white/60">
                مشاهد مصممة لتعكس طابع وكالة حمزة، وتعرض فكرة البرامج وصناعة
                المحتوى بأسلوب بصري أنيق ومباشر.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {featuredItems.map((item) => (
                <GalleryCard key={item.id} item={item} featured />
              ))}
            </div>
          </section>
        )}

        {regularItems.length > 0 && (
          <section className="mt-14">
            <div className="mb-6">
              <div className="mb-3 inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm font-black text-purple-100">
                المزيد من المعرض
              </div>

              <h2 className="text-4xl font-black">مشاهد إضافية من منظومة الوكالة</h2>

              <p className="mt-3 max-w-3xl leading-8 text-white/60">
                مساحة قابلة للتوسع لعرض مواد بصرية مرتبطة بالبرامج، الخدمات،
                الشركاء، وهوية الوكالة.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {regularItems.map((item) => (
                <GalleryCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 backdrop-blur">
          <div className="mb-3 inline-flex rounded-full border border-green-400/20 bg-green-500/10 px-4 py-2 text-sm font-black text-green-100">
            تجربة مشاهدة مريحة
          </div>

          <h2 className="text-3xl font-black">
            معرض أنيق يحافظ على سرعة التصفح
          </h2>

          <p className="mt-4 max-w-4xl leading-8 text-white/70">
            تم تنظيم المعرض ليقدّم تجربة مشاهدة جذابة دون إرباك الزائر، مع
            تركيز واضح على جمال الهوية وسلاسة التنقل بين الأقسام.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-4">
            <PerformanceItem title="عرض منظم" text="مشاهد مرتبة حسب أهميتها" />
            <PerformanceItem title="هوية موحدة" text="ألوان تنسجم مع الموقع" />
            <PerformanceItem title="تجربة مريحة" text="حركة ناعمة وغير مزعجة" />
            <PerformanceItem title="قابل للتوسع" text="مساحة لإضافة مواد جديدة" />
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            هل تريد استكشاف برامج وكالة حمزة؟
          </h2>

          <p className="mx-auto mt-4 max-w-3xl leading-8 text-white/70">
            يمكنك الانتقال إلى صفحة البرامج أو التواصل مباشرة عبر واتساب لمعرفة
            البرنامج الأنسب لك.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 md:flex-row">
            <Link
              href="/programs"
              className="rounded-full bg-purple-600 px-8 py-4 font-black text-white shadow-2xl"
            >
              تصفح البرامج
            </Link>

            <a
              href="https://wa.me/905011730377"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
            >
              التواصل عبر واتساب
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}

function GalleryCard({
  item,
  featured = false,
}: {
  item: GalleryItem;
  featured?: boolean;
}) {
  const mediaType = item.media_type || "effect";
  const isLibraryUpload = item.id >= 900000;
  const title = isLibraryUpload
    ? mediaType === "video"
      ? "مشهد من معرض الوكالة"
      : "صورة من معرض الوكالة"
    : item.title || "مشهد من وكالة حمزة";
  const description = isLibraryUpload
    ? mediaType === "video"
      ? "فيديو ضمن معرض وكالة حمزة."
      : "صورة ضمن معرض وكالة حمزة."
    : item.description || "لقطة بصرية ضمن معرض وكالة حمزة.";
  const buttonUrl = isLibraryUpload ? null : item.button_url || "/programs";
  const buttonLabel = isLibraryUpload ? null : item.button_label || "معرفة المزيد";
  const imageAlt = mediaType === "video" ? "فيديو من معرض وكالة حمزة" : "صورة من معرض وكالة حمزة";

  return (
    <article
      className={`overflow-hidden rounded-[2rem] border backdrop-blur transition hover:-translate-y-1 ${
        featured
          ? "border-yellow-400/25 bg-yellow-500/10 shadow-[0_0_45px_rgba(212,175,55,0.10)]"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
        {mediaType === "image" && item.media_url ? (
          <img
            src={item.thumbnail_url || item.media_url}
            alt={imageAlt}
            loading="lazy"
            className="h-full w-full object-contain bg-black/45 p-2"
          />
        ) : mediaType === "video" && item.media_url ? (
          <video
            src={item.media_url}
            className="h-full w-full object-contain bg-black/45 p-2"
            controls
            preload="metadata"
            aria-label="فيديو من معرض وكالة حمزة"
          />
        ) : mediaType === "video" && item.thumbnail_url ? (
          <div className="relative h-full w-full">
            <img
              src={item.thumbnail_url}
              alt="فيديو من معرض وكالة حمزة"
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl">
                ▶
              </div>
            </div>
          </div>
        ) : (
          <GeneratedVisual effectType={item.effect_type || "luxury_waves"} />
        )}

        <div className="absolute right-4 top-4 rounded-full border border-yellow-400/20 bg-black/45 px-3 py-1 text-xs font-black text-yellow-100 backdrop-blur">
          {item.category || "معرض الوكالة"}
        </div>

        <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-black text-white/70 backdrop-blur">
          {mediaType === "effect"
            ? "مشهد بصري"
            : mediaType === "video"
              ? "مشهد تفاعلي"
              : "مشهد من المعرض"}
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-black">{title}</h3>

        <p className="mt-4 leading-8 text-white/65">{description}</p>

        {buttonUrl && buttonLabel ? (
          buttonUrl.startsWith("http") ? (
            <a
              href={buttonUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white/75"
            >
              {buttonLabel}
            </a>
          ) : (
            <Link
              href={buttonUrl}
              className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white/75"
            >
              {buttonLabel}
            </Link>
          )
        ) : null}
      </div>
    </article>
  );
}

function GeneratedVisual({ effectType }: { effectType: string }) {
  const label =
    effectType === "creator_spotlight"
      ? "CREATOR"
      : effectType === "live_pulse"
        ? "LIVE"
        : effectType === "program_network"
          ? "NETWORK"
          : effectType === "digital_glow"
            ? "DIGITAL"
            : "HAMZA";

  return (
    <div className={`relative h-full w-full overflow-hidden ${effectType}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(250,204,21,0.28),rgba(124,58,237,0.22)_35%,rgba(5,0,8,0.95)_75%)]" />
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-300/20 bg-purple-500/10 shadow-[0_0_80px_rgba(168,85,247,0.35)]" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-300/15" />
      <div className="absolute -left-20 top-10 h-36 w-36 rounded-full bg-purple-500/30 blur-3xl" />
      <div className="absolute -right-20 bottom-10 h-36 w-36 rounded-full bg-yellow-400/20 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-[2rem] border border-white/10 bg-black/35 px-8 py-5 text-center backdrop-blur">
          <div className="text-4xl font-black tracking-[0.18em] text-white">
            {label}
          </div>
          <div className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-100/75">
            HAMZA AGENCY
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 h-1 rounded-full bg-gradient-to-r from-transparent via-yellow-200/50 to-transparent" />
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur">
      <div className="text-2xl font-black text-yellow-100">{value}</div>
      <div className="mt-2 text-sm font-bold text-white/55">{label}</div>
    </div>
  );
}

function PerformanceItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/55">{text}</p>
    </div>
  );
}

function GalleryBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12)_0%,rgba(124,58,237,0.24)_35%,rgba(7,0,9,0.98)_74%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-48 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" />
    </div>
  );
}
