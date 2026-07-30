import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

export const metadata = {
  title: "Cookie Policy | HAMZA AGENCY",
  description: "How HAMZA AGENCY uses necessary, analytics, preference and marketing storage.",
};

const policy = {
  ar: {
    title: "سياسة ملفات الارتباط",
    intro: "توضح هذه السياسة كيف تستخدم HAMZA AGENCY التخزين المحلي وملفات الارتباط، وكيف يمكنك تغيير موافقتك في أي وقت.",
    sections: [
      ["الملفات الضرورية", "تُستخدم للمصادقة والأمان وحفظ اختيارات الخصوصية وتشغيل الوظائف الأساسية. لا يمكن تعطيلها من داخل المنصة."],
      ["التحليلات", "لا تعمل قبل الموافقة. تساعدنا على فهم الأداء والاستخدام بصورة مجمعة دون استخدام المحتوى الخاص لأغراض تسويقية."],
      ["التفضيلات", "تحفظ اللغة وإعدادات العرض والخيارات التي تختارها لتقديم تجربة متناسقة."],
      ["التسويق", "معطّل افتراضياً ولا يُفعّل إلا بموافقة صريحة. لا نبيع بيانات المحادثات للمعلنين."],
      ["تغيير الموافقة", "يمكنك فتح إعدادات ملفات الارتباط من الزر الدائم أسفل الصفحة، وسحب الموافقة أو تعديلها. يسجل النظام نسخة الموافقة وتاريخها."],
      ["الاحتفاظ والجهات الخارجية", "نحتفظ بسجل الموافقة للمدة اللازمة لإثبات الاختيار والامتثال. لا تُحمّل نصوص غير ضرورية قبل الموافقة."],
    ],
    updated: "آخر تحديث: 30 يوليو 2026",
  },
  en: {
    title: "Cookie policy",
    intro: "This policy explains how HAMZA AGENCY uses cookies and local storage and how you can change consent at any time.",
    sections: [
      ["Necessary storage", "Used for authentication, security, consent choices and core platform functions. It cannot be disabled within the platform."],
      ["Analytics", "Disabled until consent. It helps us understand aggregated performance and usage without using private content for advertising."],
      ["Preferences", "Stores language, display and user-selected options for a consistent experience."],
      ["Marketing", "Disabled by default and enabled only with explicit consent. Conversation data is not sold to advertisers."],
      ["Changing consent", "Use the persistent cookie-settings button to update or withdraw consent. The platform records the consent version and timestamp."],
      ["Retention and third parties", "Consent evidence is retained only as needed for accountability. Non-essential scripts are not loaded before consent."],
    ],
    updated: "Last updated: 30 July 2026",
  },
  tr: {
    title: "Çerez politikası",
    intro: "Bu politika HAMZA AGENCY'nin çerezleri ve yerel depolamayı nasıl kullandığını ve onayınızı nasıl değiştirebileceğinizi açıklar.",
    sections: [
      ["Gerekli depolama", "Kimlik doğrulama, güvenlik, onay tercihleri ve temel işlevler için kullanılır. Platform içinden devre dışı bırakılamaz."],
      ["Analiz", "Onay verilene kadar kapalıdır. Özel içeriği reklam amacıyla kullanmadan toplu performans ve kullanım bilgisi sağlar."],
      ["Tercihler", "Tutarlı deneyim için dil, görünüm ve seçtiğiniz ayarları saklar."],
      ["Pazarlama", "Varsayılan olarak kapalıdır ve yalnızca açık onayla etkinleşir. Konuşma verileri reklamverenlere satılmaz."],
      ["Onayı değiştirme", "Kalıcı çerez ayarları düğmesiyle onayı değiştirebilir veya geri çekebilirsiniz. Onay sürümü ve zamanı kaydedilir."],
      ["Saklama ve üçüncü taraflar", "Onay kanıtı yalnızca hesap verebilirlik için gerekli süre tutulur. Gerekli olmayan betikler onaydan önce yüklenmez."],
    ],
    updated: "Son güncelleme: 30 Temmuz 2026",
  },
} as const;

export default async function CookiePolicyPage() {
  const context = await getRequestSiteContext();
  const locale = context.language === "en" || context.language === "tr" ? context.language : "ar";
  const content = policy[locale];
  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-28 text-white" dir={locale === "ar" ? "rtl" : "ltr"}>
      <article className="mx-auto max-w-4xl rounded-3xl border border-violet-300/20 bg-white/5 p-6 shadow-2xl sm:p-10">
        <p className="text-sm text-violet-200">HAMZA AGENCY</p>
        <h1 className="mt-2 text-4xl font-black">{content.title}</h1>
        <p className="mt-5 leading-8 text-white/75">{content.intro}</p>
        <div className="mt-8 space-y-6">
          {content.sections.map(([title, body]) => (
            <section key={title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-2 leading-7 text-white/70">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-white/50">{content.updated}</p>
      </article>
    </main>
  );
}
