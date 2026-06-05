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

async function getPrivacyPageData() {
  if (!supabase) {
    return {
      page: null,
      settings: [],
    };
  }

  const [pageResult, settingsResult] = await Promise.all([
    supabase
      .from("pages")
      .select("title, slug, content, is_published")
      .eq("slug", "privacy-policy")
      .eq("is_published", true)
      .limit(1),

    supabase
      .from("settings")
      .select("setting_key, setting_value, is_public")
      .eq("is_public", true),
  ]);

  return {
    page:
      !pageResult.error && pageResult.data && pageResult.data.length > 0
        ? pageResult.data[0]
        : null,

    settings:
      !settingsResult.error && settingsResult.data ? settingsResult.data : [],
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

const privacySections = [
  {
    title: "المعلومات التي نجمعها",
    text: "عند إرسال طلب الانضمام أو التواصل مع وكالة حمزة، قد نقوم بجمع معلومات مثل الاسم الثلاثي، الدولة، رقم واتساب، البرنامج المختار، الخبرات السابقة، الملاحظات الإضافية، ومعلومات التواصل التي يرسلها المستخدم طوعاً.",
  },
  {
    title: "كيف نستخدم المعلومات",
    text: "نستخدم المعلومات لمراجعة طلبات الانضمام، التواصل مع المتقدمين، متابعة حالة الطلب، تقديم الدعم، تحسين خدمات الوكالة، وتنظيم البرامج والخدمات داخل لوحة الإدارة.",
  },
  {
    title: "التواصل عبر واتساب",
    text: "قد يتم التواصل مع المستخدم عبر رقم واتساب الذي يقدمه في نموذج الانضمام أو صفحة التواصل، وذلك لمتابعة الطلبات أو طلب معلومات إضافية أو تقديم الدعم.",
  },
  {
    title: "حماية البيانات",
    text: "نعمل على حماية البيانات قدر الإمكان من خلال استخدام أدوات إدارة وقاعدة بيانات موثوقة، وتقليل الوصول إلى المعلومات بحسب صلاحيات الإدارة داخل النظام.",
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
    text: "قد يستخدم الموقع لاحقاً أدوات تحليل مثل Google Analytics أو أدوات مشابهة لفهم أداء الموقع وتحسين تجربة المستخدم، وسيتم توضيح ذلك عند تفعيل هذه الأدوات.",
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
  const { page, settings } = await getPrivacyPageData();

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

  const title = page?.title || "سياسة الخصوصية";

  const intro =
    page?.content ||
    "توضح سياسة الخصوصية هذه كيفية تعامل وكالة حمزة مع المعلومات التي يقدمها المستخدمون عند استخدام الموقع، إرسال طلبات الانضمام، أو التواصل مع فريق الوكالة. هذه الصفحة مخصصة لتوضيح طريقة جمع واستخدام وحماية البيانات بشكل واضح ومباشر.";

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
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
            {title}
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              حماية ووضوح البيانات
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            تنبيه مهم
          </h2>

          <p className="mt-5 leading-9 text-white/75">
            هذه السياسة هي صياغة تشغيلية أولية مناسبة لإطلاق الموقع. عند توسع
            المشروع أو إضافة الدفع الإلكتروني أو المحافظ أو التحليلات المتقدمة،
            يجب مراجعة السياسة وتحديثها بما يتناسب مع الخدمات الفعلية.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {privacySections.map((section) => (
            <div
              key={section.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <h2 className="text-3xl font-black">{section.title}</h2>

              <p className="mt-5 leading-9 text-white/70">{section.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">بيانات طلبات الانضمام</h2>

          <p className="mt-5 leading-9 text-white/75">
            عند تعبئة نموذج الانضمام، يتم حفظ البيانات داخل نظام الوكالة بهدف
            مراجعة الطلب وإدارته من لوحة التحكم. يمكن أن تشمل هذه البيانات:
            الاسم، الدولة، رقم واتساب، البرنامج، الخبرات السابقة، الملاحظات،
            وحالة الطلب.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">للاستفسار حول الخصوصية</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            يمكنك التواصل مع وكالة حمزة عبر واتساب للاستفسار عن البيانات أو طلب
            تحديث معلوماتك.
          </p>

          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
              "مرحباً، لدي استفسار بخصوص سياسة الخصوصية في وكالة حمزة."
            )}`}
            target="_blank"
            className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
          >
            تواصل واتساب
          </a>
        </div>
      </section>
    </main>
  );
}

function PrivacyBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.32)_0%,rgba(7,0,9,0.98)_68%)]" />

      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />

      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
