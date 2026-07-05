import { supabase } from "@/lib/supabase";
import {
  GalleryBackHomeLink,
  GalleryCard,
  GalleryCta,
  GalleryHero,
  GalleryPerformancePanel,
  GallerySectionHeader,
  type GalleryDisplayItem,
} from "@/components/GalleryStaticUi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GalleryItem = GalleryDisplayItem;
type MediaLibraryItem = { id: number; created_at: string | null; name: string | null; file_url: string | null; file_type: string | null; category: string | null; alt_text: string | null; page_slug: string | null; is_active: boolean | null };

const fallbackItems: GalleryItem[] = [
  { id:1, title:"هوية وكالة حمزة", slug:"luxury-agency-waves", category:"هوية الوكالة", media_type:"effect", description:"مشهد فاخر يعكس الطابع الملكي لوكالة حمزة من خلال ألوان موف وذهبية وحركة بصرية هادئة.", media_url:null, thumbnail_url:null, effect_type:"luxury_waves", external_url:null, alt_text:"مؤثر بصري فاخر لهوية وكالة حمزة", button_label:"اكتشف البرامج", button_url:"/programs", status:"published", is_visible:true, is_featured:true, sort_order:1 },
  { id:2, title:"مسار صانع المحتوى", slug:"creator-spotlight-motion", category:"صناع المحتوى", media_type:"effect", description:"تصميم بصري يعبّر عن بداية صانع المحتوى داخل منظومة وكالة حمزة وخطواته نحو الظهور بشكل احترافي.", media_url:null, thumbnail_url:null, effect_type:"creator_spotlight", external_url:null, alt_text:"مؤثر بصري لصناع المحتوى", button_label:"انضم الآن", button_url:"/programs", status:"published", is_visible:true, is_featured:true, sort_order:2 },
  { id:3, title:"تجربة البث المباشر", slug:"live-streaming-pulse", category:"البث المباشر", media_type:"effect", description:"مشهد مستوحى من طاقة البث المباشر والتفاعل مع الجمهور ضمن بيئة منظمة واحترافية.", media_url:null, thumbnail_url:null, effect_type:"live_pulse", external_url:null, alt_text:"مؤثر بصري للبث المباشر", button_label:"شاهد البرامج", button_url:"/programs", status:"published", is_visible:true, is_featured:true, sort_order:3 },
];

async function getCuratedGalleryItems(): Promise<GalleryItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("gallery_items").select("*").eq("status", "published").eq("is_visible", true).order("sort_order", { ascending: true }).limit(12);
  if (error || !data) return [];
  return data as GalleryItem[];
}

async function getMediaLibraryGalleryItems(): Promise<GalleryItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("media").select("id, created_at, name, file_url, file_type, category, alt_text, page_slug, is_active").eq("is_active", true).order("created_at", { ascending: false }).limit(30);
  if (error || !data) return [];
  return (data as MediaLibraryItem[]).filter((item) => {
    const url = item.file_url || "";
    const type = item.file_type || "";
    const category = item.category || "";
    const pageSlug = item.page_slug || "";
    return (url.startsWith("http") || url.startsWith("/")) && ["image", "logo", "video", "background_video"].includes(type) && (pageSlug === "gallery" || category === "gallery" || category === "general");
  }).map((item, index) => {
    const isVideo = item.file_type === "video" || item.file_type === "background_video";
    const url = item.file_url || "";
    return { id:900000 + item.id, title:isVideo ? "مشهد من معرض الوكالة" : "صورة من معرض الوكالة", slug:`media-library-${item.id}`, category:item.category === "gallery" || item.page_slug === "gallery" ? "معرض الوكالة" : "مكتبة الوسائط", media_type:isVideo ? "video" : "image", description:isVideo ? "فيديو ضمن معرض وكالة حمزة." : "صورة ضمن معرض وكالة حمزة.", media_url:url, thumbnail_url:isVideo ? null : url, effect_type:null, external_url:null, alt_text:isVideo ? "فيديو من معرض وكالة حمزة" : "صورة من معرض وكالة حمزة", button_label:null, button_url:null, status:"published", is_visible:true, is_featured:false, sort_order:1000 + index };
  });
}

async function getGalleryItems(): Promise<GalleryItem[]> {
  const [curatedItems, mediaItems] = await Promise.all([getCuratedGalleryItems(), getMediaLibraryGalleryItems()]);
  const allItems = [...curatedItems, ...mediaItems];
  return allItems.length === 0 ? fallbackItems : allItems;
}

export default async function GalleryPage() {
  const items = await getGalleryItems();
  const featuredItems = items.filter((item) => item.is_featured);
  const regularItems = items.filter((item) => !item.is_featured);

  return <main className="relative min-h-screen overflow-hidden bg-[#070009] text-white"><GalleryBackground /><section className="relative z-10 mx-auto max-w-7xl px-5 py-16"><GalleryBackHomeLink /><GalleryHero />{featuredItems.length > 0 && <section className="mt-14"><GallerySectionHeader kind="featured" /><div className="grid gap-6 lg:grid-cols-3">{featuredItems.map((item) => <GalleryCard key={item.id} item={item} featured />)}</div></section>}{regularItems.length > 0 && <section className="mt-14"><GallerySectionHeader kind="regular" /><div className="grid gap-6 md:grid-cols-2">{regularItems.map((item) => <GalleryCard key={item.id} item={item} />)}</div></section>}<GalleryPerformancePanel /><GalleryCta /></section></main>;
}

function GalleryBackground() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12)_0%,rgba(124,58,237,0.24)_35%,rgba(7,0,9,0.98)_74%)]" /><div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" /><div className="absolute -right-24 top-48 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" /><div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" /></div>;
}
