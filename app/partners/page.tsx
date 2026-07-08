import { supabase } from "@/lib/supabase";
import {
  PartnersBackLink,
  PartnersHero,
  PartnersSectionHeader,
} from "@/components/PartnersStaticUi";
import { PartnersGuidanceUi, PartnersStatsUi } from "@/components/PartnersExtraUi";
import PartnersGridWithTranslations from "@/components/PartnersGridWithTranslations";
import PublicLanguageMain from "@/components/PublicLanguageMain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PartnerItem = {
  id: string | number;
  name: string;
  category: string;
  description: string;
  agreementLabel: string;
  logoUrl: string | null;
  programUrl: string;
  sortOrder: number;
  isFeatured: boolean;
};

const defaultPartners: PartnerItem[] = [
  { id: "tiktok", name: "TikTok", category: "صناعة المحتوى والبث المباشر", description: "تعمل وكالة حمزة ضمن اتفاق تعاون مع TikTok لتقديم مسار منظم لصناع المحتوى، يبدأ من التوجيه وفهم المتطلبات وصولاً إلى المتابعة المناسبة حسب طبيعة كل حالة.", agreementLabel: "اتفاق تعاون", logoUrl: null, programUrl: "/programs/tiktok", sortOrder: 1, isFeatured: true },
  { id: "bigo-live", name: "BIGO LIVE", category: "البث المباشر والمواهب", description: "ضمن اتفاقات التعاون الخاصة بالوكالة، يمثل BIGO LIVE أحد المسارات المهمة لصناع المحتوى المهتمين بالبث المباشر وبناء حضور تفاعلي احترافي.", agreementLabel: "اتفاق تعاون", logoUrl: null, programUrl: "/programs/bigo-live", sortOrder: 2, isFeatured: true },
  { id: "yaahlan", name: "Yaahlan", category: "المجتمعات والتواصل المباشر", description: "تعمل وكالة حمزة مع Yaahlan ضمن مسار يركز على تنظيم انضمام صناع المحتوى ومساعدتهم على فهم طبيعة البرنامج وخطوات المتابعة المناسبة.", agreementLabel: "اتفاق تعاون", logoUrl: null, programUrl: "/programs/yaahlan", sortOrder: 3, isFeatured: true },
  { id: "xena", name: "Xena", category: "صناعة المحتوى والتفاعل", description: "يأتي Xena ضمن البرامج التي تعمل معها وكالة حمزة لتوفير خيارات متنوعة أمام صناع المحتوى، مع شرح واضح لطبيعة العمل وما يناسب كل متقدم.", agreementLabel: "اتفاق تعاون", logoUrl: null, programUrl: "/programs/xena", sortOrder: 4, isFeatured: false },
  { id: "catchii", name: "Catchii", category: "المحتوى الاجتماعي والبث", description: "تعمل وكالة حمزة مع Catchii ضمن منظومة برامجها لدعم صناع المحتوى الراغبين بخيارات إضافية في مجال التواصل والبث والتفاعل الرقمي.", agreementLabel: "اتفاق تعاون", logoUrl: null, programUrl: "/programs/catchii", sortOrder: 5, isFeatured: false },
];

function normalizePartner(item: any, index: number): PartnerItem {
  return {
    id: item.id ?? item.slug ?? index + 1,
    name: item.name || item.title || "برنامج وكالة حمزة",
    category: item.category || item.type || "برنامج تعاون",
    description: item.description || item.summary || "برنامج ضمن اتفاقات التعاون الخاصة بوكالة حمزة لدعم وتنظيم مسارات صناع المحتوى.",
    agreementLabel: item.agreement_label || item.badge || "اتفاق تعاون",
    logoUrl: item.logo_url || item.image_url || null,
    programUrl: item.program_url || item.website_url || item.url || `/programs/${item.slug || ""}`,
    sortOrder: item.sort_order ?? index + 1,
    isFeatured: item.is_featured === true,
  };
}

async function getPartners(): Promise<PartnerItem[]> {
  if (!supabase) return defaultPartners;
  const { data, error } = await supabase.from("partners").select("*").order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return defaultPartners;
  const visiblePartners = data
    .filter((item: any) => item.is_visible !== false && item.status !== "hidden")
    .map((item: any, index: number) => normalizePartner(item, index))
    .filter((item: PartnerItem) => item.name.trim().length > 0)
    .sort((a: PartnerItem, b: PartnerItem) => a.sortOrder - b.sortOrder);
  return visiblePartners.length ? visiblePartners : defaultPartners;
}

export default async function PartnersPage() {
  const partners = await getPartners();
  const featuredPartners = partners.filter((partner) => partner.isFeatured);
  const otherPartners = partners.filter((partner) => !partner.isFeatured);

  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <PartnersBackground />
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:py-20">
        <PartnersBackLink />
        <PartnersHero />
        <PartnersStatsUi />
        {featuredPartners.length > 0 ? (
          <section className="mt-14">
            <PartnersSectionHeader section="main" />
            <div className="[&>div>section]:mt-0">
              <PartnersGridWithTranslations
                featuredPartners={featuredPartners}
                otherPartners={[]}
              />
            </div>
          </section>
        ) : null}
        {otherPartners.length > 0 ? (
          <section className="mt-14">
            <PartnersSectionHeader section="more" />
            <div className="[&>div>section]:mt-0">
              <PartnersGridWithTranslations
                featuredPartners={[]}
                otherPartners={otherPartners}
              />
            </div>
          </section>
        ) : null}
        <PartnersGuidanceUi />
      </section>
    </PublicLanguageMain>
  );
}

function PartnersBackground() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.15)_0%,rgba(124,58,237,0.24)_34%,rgba(7,0,9,0.98)_72%)]" /><div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" /><div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" /><div className="absolute bottom-0 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-purple-700/10 blur-3xl" /><div className="absolute inset-0 opacity-[0.055] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" /></div>;
}
