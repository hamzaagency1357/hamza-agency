import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  CmsPublishedText,
  CmsPublishedTranslationsProvider,
  type CmsPublishedTranslationSource,
} from "@/components/CmsPublishedTranslations";
import {
  findCmsSection,
  getCmsPageWithSections,
  getCmsText,
  type CmsSection,
} from "@/lib/pageSections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Setting = {
  setting_key: string | null;
  setting_value: string | null;
};

type TranslationFieldValues = {
  title?: string | null;
  summary?: string | null;
  content?: string | null;
};

function getSectionContent(
  section: CmsSection | null,
  fallback: { title: string; subtitle: string; content: string }
) {
  return {
    title: getCmsText(section?.title, fallback.title),
    subtitle: getCmsText(section?.subtitle, fallback.subtitle),
    content: getCmsText(section?.content, fallback.content),
  };
}

function getRequiredFields(values: TranslationFieldValues): CmsPublishedTranslationSource["requiredFields"] {
  const fields: Array<"title" | "summary" | "content"> = [];
  if (values.title?.trim()) fields.push("title");
  if (values.summary?.trim()) fields.push("summary");
  if (values.content?.trim()) fields.push("content");
  return fields;
}

function createCmsTranslationSource({
  sourceKey,
  sourceType,
  sourceId,
  values,
  fallback,
}: {
  sourceKey: string;
  sourceType: CmsPublishedTranslationSource["sourceType"];
  sourceId: number | null | undefined;
  values: TranslationFieldValues;
  fallback: CmsPublishedTranslationSource["fallback"];
}): CmsPublishedTranslationSource {
  return {
    sourceKey,
    sourceType,
    sourceId: sourceId ?? "",
    requiredFields: getRequiredFields(values),
    fallback,
  };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value && value.trim()) return value.trim();
  }

  return fallback;
}

async function getPrivacyPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("privacy-policy"),
    supabase
      ? supabase
          .from("settings")
          .select("setting_key, setting_value")
          .eq("is_public", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    page: pageData.page,
    sections: pageData.sections,
    settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [],
  };
}

const privacySections = [
  {
    title: "المعلومات التي نجمعها",
    text: "عند إرسال طلب الانضمام أو التواصل مع وكالة حمزة، قد نقوم بجمع معلومات مثل الاسم الثلاثي، الدولة، رقم واتساب، البرنامج المختار، الخبرات السابقة، الملاحظات الإضافية، ومعلومات التواصل التي يرسلها المستخدم طوعاً.",
  },
  {
    title: "كيف نستخدم المعلومات",
    text: "نستخدم المعلومات لمراجعة الطلبات، التواصل مع المتقدمين، متابعة حالة الطلب، تقديم الدعم، تحسين خدمات الوكالة، وتنظيم البرامج والخدمات المرتبطة بصناع المحتوى.",
  },
  {
    title: "التواصل عبر واتساب",
    text: "قد يتم التواصل مع المستخدم عبر رقم واتساب الذي يقدمه في نموذج الانضمام أو صفحة التواصل، وذلك لمتابعة الطلبات أو طلب معلومات إضافية أو تقديم الدعم.",
  },
  {
    title: "حماية البيانات",
    text: "نعمل على حماية البيانات قدر الإمكان من خلال استخدام أدوات موثوقة، وتقليل الوصول إلى المعلومات حسب حاجة العمل والمتابعة داخل الوكالة.",
  },
  {
    title: "مشاركة البيانات",
    text: "لا نبيع بيانات المستخدمين. قد يتم استخدام البيانات داخلياً من قبل فريق الوكالة أو المسؤولين عن البرامج لمراجعة الطلبات وتقديم الدعم اللازم.",
  },
  {
    title: "الاحتفاظ بالبيانات",
    text: "قد نحتفظ ببيانات الطلبات لفترة مناسبة لأغراض المتابعة والإدارة والسجلات التشغيلية، ما لم يطلب المستخدم حذف بياناته وكان ذلك ممكناً من الناحية التشغيلية.",
  },
  {
    title: "ملفات تعريف الارتباط والتحليلات",
    text: "قد يستخدم الموقع أدوات قياس وتحليل لتحسين تجربة المستخدم وفهم أداء الصفحات، مع مراعاة حماية البيانات قدر الإمكان.",
  },
  {
    title: "خدمات الطرف الثالث",
    text: "يعتمد الموقع على خدمات خارجية مثل الاستضافة وقاعدة البيانات وخدمات التواصل. قد تخضع هذه الخدمات لسياسات خصوصية خاصة بها.",
  },
  {
    title: "حقوق المستخدم",
    text: "يمكن للمستخدم التواصل مع وكالة حمزة للاستفسار عن بياناته أو طلب تحديثها أو طلب حذفها عندما يكون ذلك ممكناً حسب طبيعة الطلب والنظام التشغيلي.",
  },
  {
    title: "تحديث سياسة الخصوصية",
    text: "قد يتم تعديل سياسة الخصوصية من وقت لآخر بما يتناسب مع تطور خدمات الوكالة والموقع، وسيتم نشر النسخة الأحدث في هذه الصفحة.",
  },
];

export default async function PrivacyPolicyPage() {
  const { page, sections, settings } = await getPrivacyPageData();

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
  const overviewSection = findCmsSection(sections, "privacy-overview");
  const dataUsageSection = findCmsSection(sections, "data-usage");

  const overview = getSectionContent(overviewSection, {
    title: "سياسة الخصوصية",
    subtitle: "كيف نتعامل مع البيانات",
    content:
      "توضح سياسة الخصوصية آلية جمع واستخدام وحماية بيانات المتقدمين والعملاء عند استخدام موقع وكالة حمزة ونماذجها.",
  });
  const dataUsage = getSectionContent(dataUsageSection, {
    title: "استخدام البيانات",
    subtitle: "تُستخدم البيانات لمراجعة الطلبات وتحسين التواصل",
    content:
      "تُستخدم البيانات المقدمة عبر النماذج لأغراض مراجعة الطلبات، التواصل، تقديم الدعم، وتحسين تجربة المستخدم.",
  });

  const title = page?.title || overview.title;
  const hasPageContent = Boolean(page?.content?.trim());
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({
      sourceKey: "privacy-page",
      sourceType: "pages",
      sourceId: page?.id,
      values: {
        title: page?.title,
        summary: page?.seo_description,
        content: page?.content,
      },
      fallback: { title, content: page?.content?.trim() || "" },
    }),
    createCmsTranslationSource({
      sourceKey: "privacy-overview",
      sourceType: "sections",
      sourceId: overviewSection?.id,
      values: {
        title: overviewSection?.title,
        summary: overviewSection?.subtitle,
        content: overviewSection?.content,
      },
      fallback: {
        title: overview.title,
        summary: overview.subtitle,
        content: overview.content,
      },
    }),
    createCmsTranslationSource({
      sourceKey: "privacy-data-usage",
      sourceType: "sections",
      sourceId: dataUsageSection?.id,
      values: {
        title: dataUsageSection?.title,
        summary: dataUsageSection?.subtitle,
        content: dataUsageSection?.content,
      },
      fallback: {
        title: dataUsage.title,
        summary: dataUsage.subtitle,
        content: dataUsage.content,
      },
    }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
        <PrivacyBackground />

        <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
          <Link href="/" className="mb-8 inline-block text-purple-200">
            ← العودة إلى الرئيسية
          </Link>

          <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-yellow-400/30 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
              {agencyName}
            </div>

            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              <CmsPublishedText sourceKey="privacy-page" field="title" fallback={title} />
              <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
                <CmsPublishedText sourceKey="privacy-overview" field="summary" fallback={overview.subtitle} />
              </span>
            </h1>

            <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
              {hasPageContent ? (
                <CmsPublishedText sourceKey="privacy-page" field="content" fallback={page?.content || ""} />
              ) : (
                <CmsPublishedText sourceKey="privacy-overview" field="content" fallback={overview.content} />
              )}
            </p>
          </div>

          <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
            <h2 className="text-3xl font-black text-yellow-100">
              <CmsPublishedText sourceKey="privacy-data-usage" field="title" fallback={dataUsage.title} />
            </h2>
            <p className="mt-3 text-lg font-bold text-yellow-100/80">
              <CmsPublishedText sourceKey="privacy-data-usage" field="summary" fallback={dataUsage.subtitle} />
            </p>
            <p className="mt-5 leading-9 text-white/75">
              <CmsPublishedText sourceKey="privacy-data-usage" field="content" fallback={dataUsage.content} />
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {privacySections.map((section) => (
              <div key={section.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
                <h2 className="text-3xl font-black">{section.title}</h2>
                <p className="mt-5 leading-9 text-white/70">{section.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
            <h2 className="text-3xl font-black">بيانات طلبات الانضمام</h2>
            <p className="mt-5 leading-9 text-white/75">
              عند تعبئة نموذج الانضمام، يتم حفظ البيانات بهدف مراجعة الطلب ومتابعته. يمكن أن تشمل هذه البيانات الاسم، الدولة، رقم واتساب، البرنامج، الخبرات السابقة، الملاحظات، وحالة الطلب.
            </p>
          </div>

          <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
            <h2 className="text-3xl font-black">للاستفسار حول الخصوصية</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
              يمكنك التواصل مع وكالة حمزة عبر واتساب للاستفسار عن البيانات أو طلب تحديث معلوماتك.
            </p>
            <a
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("مرحباً، لدي استفسار بخصوص سياسة الخصوصية في وكالة حمزة.")}`}
              target="_blank"
              className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
            >
              تواصل واتساب
            </a>
          </div>
        </section>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}

function PrivacyBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.32)_0%,rgba(7,0,9,0.98)_68%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
