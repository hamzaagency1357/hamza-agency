import SuccessStoriesPageContent, { type SuccessStory } from "@/components/SuccessStoriesPageContent";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const professionalDefaultStories: SuccessStory[] = [
  { id: 1, title: "مسار انطلاق صانع محتوى جديد", person_name: "مسار صناع المحتوى", country: "عدة دول", platform: "TikTok", result_summary: "تحويل خطوة التقديم من تواصل عشوائي إلى مسار واضح يبدأ بالمعلومات الصحيحة وينتهي بمتابعة منظمة.", story: "تساعد وكالة حمزة صناع المحتوى الجدد على فهم البرامج المتاحة، شروط الانضمام، وطريقة المتابعة قبل إرسال الطلب. هذا المسار يمنح المتقدم صورة أوضح عن الخطوات المطلوبة ويقلل الأخطاء التي قد تؤخر القبول أو التواصل.", image_url: null, is_featured: true, sort_order: 1, status: "published", is_visible: true, created_at: null },
  { id: 2, title: "مسار تنظيم طلبات البث المباشر", person_name: "إدارة برامج البث", country: "عدة دول", platform: "BIGO LIVE", result_summary: "جمع بيانات المتقدمين بطريقة مرتبة تساعد فريق الوكالة على مراجعة الطلبات ومتابعتها باحتراف.", story: "بدلاً من استقبال معلومات ناقصة عبر المحادثات فقط، تعتمد الوكالة نموذجاً منظماً يجمع الاسم، الدولة، رقم واتساب، المنصة، والخبرة السابقة. هذا يساعد الإدارة على مراجعة الطلبات بسرعة أكبر والتواصل مع الحالات المناسبة بوضوح.", image_url: null, is_featured: true, sort_order: 2, status: "published", is_visible: true, created_at: null },
  { id: 3, title: "مسار اختيار البرنامج الأنسب", person_name: "توجيه المتقدمين", country: "عدة دول", platform: "Yaahlan", result_summary: "مساعدة المتقدم على فهم الفرق بين البرامج قبل اختيار المسار الأقرب لهدفه وتجربته.", story: "تختلف برامج البث من حيث طبيعة العمل، شروط القبول، ونظام المتابعة. لذلك تهتم وكالة حمزة بتوضيح الفروقات الأساسية للمتقدمين حتى يكون اختيار البرنامج مبنياً على فهم واضح وليس على تجربة عشوائية.", image_url: null, is_featured: false, sort_order: 3, status: "published", is_visible: true, created_at: null },
  { id: 4, title: "مسار متابعة الخدمات الرقمية", person_name: "فريق الخدمات الرقمية", country: "تركيا وخارجها", platform: "Digital Services", result_summary: "تنظيم طلبات الخدمات الرقمية مثل الشحن والسحب عبر نموذج واضح وتأكيد مباشر عبر واتساب.", story: "تتعامل الوكالة مع طلبات الخدمات الرقمية بطريقة منظمة تبدأ بجمع معلومات الطلب الأساسية، ثم مراجعتها قبل التواصل مع العميل عبر واتساب. هذا الأسلوب يقلل الالتباس ويحافظ على وضوح الطلب قبل التنفيذ.", image_url: null, is_featured: false, sort_order: 4, status: "published", is_visible: true, created_at: null },
];

async function getSuccessStories(): Promise<SuccessStory[]> {
  if (!supabase) return professionalDefaultStories;

  const { data, error } = await supabase
    .from("success_stories")
    .select("id, title, person_name, country, platform, result_summary, story, image_url, is_featured, sort_order, status, is_visible, created_at")
    .eq("is_visible", true)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return professionalDefaultStories;
  return data as SuccessStory[];
}

export default async function SuccessStoriesPage() {
  const stories = await getSuccessStories();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <SuccessStoriesBackground />
      <SuccessStoriesPageContent stories={stories} />
    </main>
  );
}

function SuccessStoriesBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.16)_0%,rgba(124,58,237,0.22)_34%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute bottom-0 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-purple-700/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.055] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" />
    </div>
  );
}
