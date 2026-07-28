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

type PartnerRow = {
  id?: string | number | null;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  category?: string | null;
  type?: string | null;
  description?: string | null;
  summary?: string | null;
  agreement_label?: string | null;
  badge?: string | null;
  logo_url?: string | null;
  image_url?: string | null;
  program_url?: string | null;
  website_url?: string | null;
  url?: string | null;
  sort_order?: number | null;
  is_featured?: boolean | null;
  is_visible?: boolean | null;
  status?: string | null;
};

const defaultPartners: PartnerItem[] = [
  { id: "tiktok", name: "TikTok", category: "صناعة المحتوى والبث المباشر", description: "يوضح مسار TikTok لصناع المحتوى خطوات فهم المتطلبات والتقديم والمتابعة المناسبة لكل حالة.", agreementLabel: "مسار برنامج", logoUrl: null, programUrl: "/programs/tiktok", sortOrder: 1, isFeatured: true },
  { id: "bigo-live", name: "BIGO LIVE", category: "البث المباشر والمواهب", description: "يمثل BIGO LIVE مساراً متاحاً لصناع المحتوى المهتمين بالبث المباشر وبناء حضور تفاعلي احترافي.", agreementLabel: "مسار برنامج", logoUrl: null, programUrl: "/programs/bigo-live", sortOrder: 2, isFeatured: true },
  { id: "yaahlan", name: "Yaahlan", category: "المجتمعات والتواصل المباشر", description: "يركز مسار Yaahlan على مساعدة صناع المحتوى في فهم طبيعة البرنامج وخطوات التقديم والمتابعة.", agreementLabel: "مسار برنامج", logoUrl: null, programUrl: "/programs/yaahlan", sortOrder: 3, isFeatured: true },
  { id: "xena", name: "Xena", category: "صناعة المحتوى والتفاعل", description: "يقدم مسار Xena خياراً إضافياً لصناع المحتوى، مع شرح واضح لطبيعة العمل وما يناسب كل متقدم.", agreementLabel: "مسار برنامج", logoUrl: null, programUrl: "/programs/xena", sortOrder: 4, isFeatured: false },
  { id: "catchii", name: "Catchii", category: "المحتوى الاجتماعي والبث", description: "يقدم مسار Catchii خياراً لصناع المحتوى المهتمين بالتواصل والبث والتفاعل الرقمي.", agreementLabel: "مسار برنامج", logoUrl: null, programUrl: "/programs/catchii", sortOrder: 5, isFeatured: false },
];

function normalizePartner(item: PartnerRow, index: number): PartnerItem {
  const slug = item.slug || "";

  return {
    id: item.id ?? item.slug ?? index + 1,
    name: item.name || item.title || "برنامج وكالة حمزة",
    category: item.category || item.type || "برنامج لصناع المحتوى",
    description: item.description || item.summary || "مسار برنامج متاح عبر وكالة حمزة لمساعدة صناع المحتوى على فهم الخيارات وخطوات التقديم.",
    agreementLabel: item.agreement_label || item.badge || "مسار برنامج",
    logoUrl: item.logo_url || item.image_url || null,
    programUrl: item.program_url || item.website_url || item.url || `/programs/${slug}`,
    sortOrder: item.sort_order ?? index + 1,
    isFeatured: item.is_featured === true,
  };
}

async function getPartners(): Promise<PartnerItem[]> {
  if (!supabase) return defaultPartners;
  const { data, error } = await supabase.from("partners").select("*").order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return defaultPartners;
  const visiblePartners = (data as PartnerRow[])
    .filter((item) => item.is_visible !== false && item.status !== "hidden")
    .map((item, index) => normalizePartner(item, index))
    .filter((item) => item.name.trim().length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
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
