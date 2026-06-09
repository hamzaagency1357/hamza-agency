import Link from "next/link";
import { supabase } from "@/lib/supabase";
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
  is_public: boolean | null;
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

async function getContactPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("contact"),
    supabase
      ? supabase
          .from("settings")
          .select("setting_key, setting_value, is_public")
          .eq("is_public", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    page: pageData.page,
    sections: pageData.sections,
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

export default async function ContactPage() {
  const { page, sections, settings } = await getContactPageData();

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

  const email = getSetting(settings, ["contact_email", "support_email", "email"], "");
  const workingHours = getSetting(
    settings,
    ["working_hours", "support_hours"],
    "تتم المتابعة حسب توفر فريق الوكالة وضغط الطلبات"
  );

  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");

  const contactOptions = getSectionContent(findCmsSection(sections, "contact-options"), {
    title: "تواصل معنا",
    subtitle: "فريق وكالة حمزة جاهز لمتابعة الاستفسارات",
    content:
      "يمكن التواصل مع الوكالة للاستفسار عن البرامج، طلبات الانضمام، الخدمات الرقمية، أو متابعة حالة الطلب.",
  });

  const whatsappSupport = getSectionContent(findCmsSection(sections, "whatsapp-support"), {
    title: "التواصل عبر واتساب",
    subtitle: "القناة الأساسية للتواصل السريع مع فريق الوكالة",
    content:
      "تتم المتابعة الأساسية عبر واتساب عند الحاجة، خصوصاً في الطلبات التي تحتاج تأكيداً أو توضيحاً إضافياً.",
  });

  const title = page?.title || contactOptions.title;
  const intro = page?.content || contactOptions.content;

  const contactCards = [
    {
      title: whatsappSupport.title,
      text: whatsapp,
      note: whatsappSupport.content,
      action: "تواصل الآن",
      href: `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
        "مرحباً، أريد التواصل مع وكالة حمزة."
      )}`,
      external: true,
      visible: true,
    },
    {
      title: "البريد الإلكتروني",
      text: email,
      note: "يمكن استخدام البريد للتواصل الرسمي عند توفره ضمن بيانات الوكالة.",
      action: "إرسال بريد",
      href: `mailto:${email}`,
      external: true,
      visible: Boolean(email),
    },
    {
      title: "أوقات المتابعة",
      text: workingHours,
      note: "قد تختلف سرعة الرد حسب ضغط الطلبات ونوع البرنامج أو الخدمة.",
      action: "عرض البرامج",
      href: "/programs",
      external: false,
      visible: true,
    },
  ].filter((card) => card.visible);

  const reasons = [
    "الاستفسار عن الانضمام لأحد البرامج",
    "متابعة طلب تم إرساله سابقاً",
    "السؤال عن خدمات الوكالة",
    "الاستفسار عن الخدمات الرقمية",
    "الإبلاغ عن مشكلة تقنية",
    "طلب تحويل المحادثة إلى أحد أفراد الفريق",
  ];

  const quickLinks = [
    {
      title: "البرامج",
      href: "/programs",
      text: "تصفح البرامج المتاحة حالياً وابدأ طلب الانضمام.",
    },
    {
      title: "خدمات الوكالة",
      href: "/services",
      text: "تعرف على خدمات الإدارة والدعم والمتابعة لصناع المحتوى.",
    },
    {
      title: "الخدمات الرقمية",
      href: "/digital-services",
      text: "تعرف على خدمات الشحن والسحب والمتابعة عبر واتساب.",
    },
    {
      title: "تتبع الطلب",
      href: "/application-status",
      text: "تابع حالة طلب الانضمام باستخدام بيانات الطلب المتاحة.",
    },
  ];

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
      <ContactBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Link href="/" className="mb-8 inline-block text-purple-200">
          ← العودة إلى الرئيسية
        </Link>

        <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
          <div className="mb-6 inline-flex rounded-full border border-green-400/30 bg-green-500/10 px-5 py-2 text-sm font-bold text-green-100">
            {agencyName}
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            {title}
            <span className="block bg-gradient-to-r from-green-300 via-white to-purple-300 bg-clip-text text-transparent">
              {contactOptions.subtitle}
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {contactCards.map((card) => (
            <div
              key={card.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <h2 className="text-3xl font-black">{card.title}</h2>

              <p className="mt-4 break-words text-xl font-bold text-green-200">
                {card.text}
              </p>

              <p className="mt-4 leading-8 text-white/65">{card.note}</p>

              {card.external ? (
                <a
                  href={card.href}
                  target="_blank"
                  className="mt-6 inline-flex rounded-full bg-green-500 px-6 py-3 font-black text-white"
                >
                  {card.action}
                </a>
              ) : (
                <Link
                  href={card.href}
                  className="mt-6 inline-flex rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-black text-white"
                >
                  {card.action}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">متى تتواصل معنا؟</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason) => (
              <div
                key={reason}
                className="rounded-2xl border border-white/10 bg-black/25 p-5 text-white/75"
              >
                {reason}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            قبل إرسال الرسالة
          </h2>

          <p className="mt-5 leading-9 text-white/75">
            لتسريع الرد، أرسل اسمك، الدولة، البرنامج أو الخدمة المطلوبة، ورقم
            واتساب صحيح. وإذا كنت تتابع طلباً سابقاً، استخدم نفس رقم الواتساب
            الذي أرسلته في الطلب.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[2rem] border border-white/10 bg-black/35 p-6 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10"
            >
              <h3 className="text-2xl font-black">{link.title}</h3>
              <p className="mt-4 leading-8 text-white/65">{link.text}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">{whatsappSupport.title}</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            {whatsappSupport.subtitle}
          </p>

          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
              "مرحباً، أريد التواصل مع وكالة حمزة."
            )}`}
            target="_blank"
            className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
          >
            فتح واتساب
          </a>
        </div>
      </section>
    </main>
  );
}

function ContactBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18)_0%,rgba(124,58,237,0.2)_35%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-green-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
