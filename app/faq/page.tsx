import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PageContent = {
  title: string | null;
  slug: string | null;
  content: string | null;
  is_published: boolean | null;
};

type Setting = {
  setting_key: string | null;
  setting_value: string | null;
  is_public: boolean | null;
};

type FaqItem = {
  id: number;
  question: string | null;
  answer: string | null;
  category: string | null;
  sort_order: number | null;
  is_published: boolean | null;
};

const fallbackFaqs: FaqItem[] = [
  {
    id: 1,
    question: "ما هي وكالة حمزة؟",
    answer:
      "وكالة حمزة هي وكالة لإدارة وتوظيف ودعم صناع المحتوى على منصات البث المباشر والتواصل الاجتماعي مثل TikTok وBIGO LIVE وYaahlan وXena وCatchii.",
    category: "عام",
    sort_order: 1,
    is_published: true,
  },
  {
    id: 2,
    question: "كيف أقدّم طلب انضمام؟",
    answer:
      "يمكنك الدخول إلى صفحة البرامج، اختيار البرنامج المناسب، ثم الضغط على زر الانضمام وتعبئة نموذج الطلب بالمعلومات المطلوبة.",
    category: "الانضمام",
    sort_order: 2,
    is_published: true,
  },
  {
    id: 3,
    question: "هل القبول مضمون بعد إرسال الطلب؟",
    answer:
      "لا، كل طلب يتم مراجعته من فريق الوكالة حسب معلومات المتقدم، البرنامج المختار، وشروط البرنامج المتاحة.",
    category: "الانضمام",
    sort_order: 3,
    is_published: true,
  },
  {
    id: 4,
    question: "هل يجب أن أملك عدد متابعين كبير؟",
    answer:
      "ليس شرطاً ثابتاً لكل البرامج. بعض البرامج تعتمد على النشاط والجدية ونوع المحتوى أكثر من رقم المتابعين فقط.",
    category: "الشروط",
    sort_order: 4,
    is_published: true,
  },
  {
    id: 5,
    question: "كيف سيتم التواصل معي بعد التقديم؟",
    answer:
      "بعد مراجعة الطلب، قد يتواصل معك فريق وكالة حمزة عبر رقم واتساب الذي أدخلته في نموذج الانضمام.",
    category: "المتابعة",
    sort_order: 5,
    is_published: true,
  },
  {
    id: 6,
    question: "هل توجد خدمات شحن وسحب أرباح؟",
    answer:
      "نعم، توجد صفحة خاصة للخدمات الرقمية مثل شحن المنصات وسحب الأرباح، لكن حالياً لا يوجد نظام محفظة أو دفع إلكتروني مباشر داخل الموقع. يتم التأكيد عبر واتساب.",
    category: "الخدمات الرقمية",
    sort_order: 6,
    is_published: true,
  },
  {
    id: 7,
    question: "هل الموقع رسمي للوكالة؟",
    answer:
      "نعم، الموقع مصمم ليكون منصة رسمية لإدارة محتوى وكالة حمزة، البرامج، طلبات الانضمام، والخدمات المرتبطة بصناع المحتوى.",
    category: "عام",
    sort_order: 7,
    is_published: true,
  },
  {
    id: 8,
    question: "هل يمكنني التواصل مع موظف؟",
    answer:
      "نعم، يمكنك التواصل عبر واتساب من صفحة اتصل بنا أو زر واتساب الموجود في الموقع.",
    category: "الدعم",
    sort_order: 8,
    is_published: true,
  },
];

async function getFaqPageData() {
  if (!supabase) {
    return {
      page: null,
      settings: [],
      faqs: fallbackFaqs,
    };
  }

  const [pageResult, settingsResult, faqsResult] = await Promise.all([
    supabase
      .from("pages")
      .select("title, slug, content, is_published")
      .eq("slug", "faq")
      .eq("is_published", true)
      .limit(1),

    supabase
      .from("settings")
      .select("setting_key, setting_value, is_public")
      .eq("is_public", true),

    supabase
      .from("faqs")
      .select("id, question, answer, category, sort_order, is_published")
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    page:
      !pageResult.error && pageResult.data && pageResult.data.length > 0
        ? pageResult.data[0]
        : null,

    settings:
      !settingsResult.error && settingsResult.data ? settingsResult.data : [],

    faqs:
      !faqsResult.error && faqsResult.data && faqsResult.data.length > 0
        ? faqsResult.data
        : fallbackFaqs,
  };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)
      ?.setting_value;

    if (value && value.trim()) return value.trim();
  }

  return fallback;
}

function groupFaqs(faqs: FaqItem[]) {
  return faqs.reduce<Record<string, FaqItem[]>>((groups, faq) => {
    const category = faq.category || "أسئلة عامة";

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(faq);
    return groups;
  }, {});
}

export default async function FaqPage() {
  const { page, settings, faqs } = await getFaqPageData();

  const agencyName = getSetting(
    settings,
    ["agency_name_ar", "agency_name", "site_name"],
    "وكالة حمزة"
  );

  const whatsapp = getSetting(
    settings,
    ["primary_whatsapp", "whatsapp", "support_whatsapp"],
    "+905011730377"
  );

  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");

  const title = page?.title || "الأسئلة الشائعة";

  const intro =
    page?.content ||
    "هنا تجد إجابات واضحة على أكثر الأسئلة شيوعاً حول وكالة حمزة، طريقة الانضمام، البرامج المتاحة، الخدمات الرقمية، وطريقة التواصل مع فريق الوكالة.";

  const groupedFaqs = groupFaqs(faqs);

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
      <FaqBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Link href="/" className="mb-8 inline-block text-purple-200">
          ← العودة إلى الرئيسية
        </Link>

        <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
          <div className="mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
            {agencyName}
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            {title}
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              كل ما تحتاج معرفته
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {Object.entries(groupedFaqs).map(([category, items]) => (
            <div
              key={category}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <div className="mb-6 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100">
                {category}
              </div>

              <div className="grid gap-4">
                {items.map((faq) => (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-white/10 bg-black/25 p-5"
                  >
                    <h2 className="text-2xl font-black">
                      {faq.question || "سؤال شائع"}
                    </h2>

                    <p className="mt-4 whitespace-pre-wrap leading-9 text-white/70">
                      {faq.answer || "سيتم إضافة الإجابة من لوحة التحكم."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            لم تجد إجابة لسؤالك؟
          </h2>

          <p className="mt-5 leading-9 text-white/75">
            يمكنك التواصل مع فريق وكالة حمزة عبر واتساب، وسيتم الرد عليك حسب
            توفر الفريق وضغط الطلبات.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">تواصل معنا مباشرة</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            أرسل سؤالك عبر واتساب وسنحاول مساعدتك بأقرب وقت.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black"
            >
              صفحة التواصل
            </Link>

            <a
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                "مرحباً، لدي سؤال بخصوص وكالة حمزة."
              )}`}
              target="_blank"
              className="rounded-full bg-green-500 px-7 py-4 font-black text-white"
            >
              واتساب
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function FaqBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.34)_0%,rgba(7,0,9,0.98)_68%)]" />

      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/16 blur-3xl" />

      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
