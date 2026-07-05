"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type TermsCard = { title: string; text: string };

type TermsCopy = {
  backHome: string;
  cards: TermsCard[];
  responsibilityTitle: string;
  responsibilityText: string;
  contactTitle: string;
  contactText: string;
  whatsappCta: string;
  whatsappMessage: string;
};

const copy: Record<"ar" | "en" | "tr", TermsCopy> = {
  ar: {
    backHome: "← العودة إلى الرئيسية",
    cards: [
      { title: "قبول الشروط", text: "باستخدام موقع وكالة حمزة أو إرسال طلب انضمام أو التواصل مع فريق الوكالة، فإنك توافق على الالتزام بهذه الشروط والأحكام وبأي تحديثات يتم نشرها على هذه الصفحة." },
      { title: "طبيعة خدمات الوكالة", text: "وكالة حمزة تقدم خدمات إدارة وتوظيف ودعم صناع المحتوى على برامج ومنصات مختلفة، وتشمل المتابعة، التوجيه، مراجعة الطلبات، الدعم، وتنظيم التواصل حسب البرامج المتاحة." },
      { title: "طلبات الانضمام", text: "إرسال طلب الانضمام عبر الموقع لا يعني القبول التلقائي. كل طلب يخضع للمراجعة حسب البيانات المقدمة، شروط البرنامج، وحالة توفر الفرص في وقت المراجعة." },
      { title: "صحة المعلومات", text: "يجب على المستخدم تقديم معلومات صحيحة عند تعبئة النماذج، مثل الاسم، الدولة، رقم واتساب، البرنامج المختار، والخبرات السابقة. المعلومات غير الصحيحة قد تؤثر على مراجعة الطلب." },
      { title: "التواصل عبر واتساب", text: "قد يتم التواصل مع المستخدم عبر رقم واتساب الذي يقدمه في الموقع لمتابعة الطلب أو طلب معلومات إضافية أو تقديم الدعم. عدم الرد قد يؤثر على سرعة المتابعة." },
      { title: "البرامج المتاحة", text: "قد تتغير البرامج المتاحة أو شروطها أو حالة التسجيل فيها في أي وقت، ويمكن أن تكون بعض البرامج متاحة أو محدودة أو متوقفة حسب ظروف البرنامج والوكالة." },
      { title: "الخدمات الرقمية", text: "الخدمات الرقمية مثل شحن المنصات أو سحب الأرباح أو الخدمات المساعدة يتم شرحها في صفحة منفصلة، ويتم تأكيد التفاصيل عبر قنوات الوكالة الرسمية عند الحاجة." },
      { title: "عدم ضمان النتائج", text: "لا تضمن وكالة حمزة قبول كل طلب أو تحقيق أرباح محددة أو نتائج ثابتة، لأن النتائج تعتمد على البرنامج، نشاط صانع المحتوى، الالتزام، شروط المنصة، وعوامل أخرى." },
      { title: "استخدام الموقع", text: "يُمنع استخدام الموقع لإرسال بيانات مزيفة، إساءة استخدام النماذج، محاولة الوصول غير المصرح إلى الأنظمة الإدارية، أو أي نشاط يضر بالموقع أو الوكالة أو المستخدمين الآخرين." },
      { title: "تحديث الشروط", text: "يحق لوكالة حمزة تعديل هذه الشروط والأحكام بما يتناسب مع تطور الخدمات والبرامج. استمرار استخدام الموقع بعد التحديث يعني الموافقة على النسخة الجديدة." },
    ],
    responsibilityTitle: "مسؤولية المستخدم",
    responsibilityText: "يتحمل المستخدم مسؤولية صحة البيانات التي يرسلها، وطريقة استخدامه للموقع، والتزامه بقوانين البرامج والمنصات التي يرغب بالانضمام إليها. وكالة حمزة تساعد في التنظيم والمتابعة، لكنها لا تتحكم بسياسات المنصات الخارجية.",
    contactTitle: "للاستفسار عن الشروط",
    contactText: "يمكنك التواصل مع وكالة حمزة عبر واتساب إذا كان لديك سؤال حول هذه الشروط أو طريقة استخدام الموقع.",
    whatsappCta: "تواصل واتساب",
    whatsappMessage: "مرحباً، لدي استفسار بخصوص الشروط والأحكام في وكالة حمزة.",
  },
  en: {
    backHome: "← Back to home",
    cards: [
      { title: "Acceptance of terms", text: "By using the HAMZA AGENCY website, submitting a joining request, or contacting the agency team, you agree to comply with these terms and conditions and any updates published on this page." },
      { title: "Nature of agency services", text: "HAMZA AGENCY provides management, recruitment, and support services for content creators across different programs and platforms, including follow-up, guidance, request review, support, and organized communication according to available programs." },
      { title: "Joining requests", text: "Submitting a joining request through the website does not mean automatic acceptance. Every request is reviewed according to the information provided, program conditions, and availability of opportunities at the time of review." },
      { title: "Accuracy of information", text: "You must provide accurate information when completing forms, including your name, country, WhatsApp number, selected program, and previous experience. Incorrect information may affect request review." },
      { title: "WhatsApp communication", text: "We may contact you through the WhatsApp number provided on the website to follow up on a request, request additional information, or provide support. Not responding may affect follow-up speed." },
      { title: "Available programs", text: "Available programs, their conditions, or registration status may change at any time. Some programs may be available, limited, or paused depending on program and agency conditions." },
      { title: "Digital services", text: "Digital services such as platform top-ups, earnings withdrawals, or support services are explained on a separate page. Details are confirmed through official agency channels when needed." },
      { title: "No guarantee of results", text: "HAMZA AGENCY does not guarantee acceptance of every request, specific earnings, or fixed results, because results depend on the program, creator activity, commitment, platform conditions, and other factors." },
      { title: "Website use", text: "You must not use the website to submit false information, misuse forms, attempt unauthorized access to administrative systems, or engage in activity that harms the website, the agency, or other users." },
      { title: "Terms updates", text: "HAMZA AGENCY may amend these terms and conditions as services and programs evolve. Continued use of the website after an update means acceptance of the new version." },
    ],
    responsibilityTitle: "User responsibility",
    responsibilityText: "You are responsible for the accuracy of the information you submit, how you use the website, and your compliance with the rules of programs and platforms you wish to join. HAMZA AGENCY helps with organization and follow-up but does not control external platform policies.",
    contactTitle: "Questions about these terms",
    contactText: "Contact HAMZA AGENCY on WhatsApp if you have a question about these terms or how to use the website.",
    whatsappCta: "Contact via WhatsApp",
    whatsappMessage: "Hello, I have a question about the HAMZA AGENCY terms and conditions.",
  },
  tr: {
    backHome: "← Ana sayfaya dön",
    cards: [
      { title: "Koşulların kabulü", text: "HAMZA AGENCY web sitesini kullanarak, katılım başvurusu göndererek veya ajans ekibiyle iletişime geçerek bu hüküm ve koşullara ve bu sayfada yayımlanan güncellemelere uymayı kabul edersiniz." },
      { title: "Ajans hizmetlerinin niteliği", text: "HAMZA AGENCY, farklı program ve platformlardaki içerik üreticilerine yönetim, katılım ve destek hizmetleri sunar. Bu hizmetler mevcut programlara göre takip, rehberlik, başvuru inceleme, destek ve iletişim düzenlemeyi kapsar." },
      { title: "Katılım başvuruları", text: "Web sitesi üzerinden katılım başvurusu göndermek otomatik kabul anlamına gelmez. Her başvuru, iletilen bilgiler, program koşulları ve inceleme anındaki fırsat uygunluğuna göre değerlendirilir." },
      { title: "Bilgilerin doğruluğu", text: "Formları doldururken adınız, ülkeniz, WhatsApp numaranız, seçilen program ve önceki deneyimleriniz gibi doğru bilgiler vermeniz gerekir. Yanlış bilgiler başvuru incelemesini etkileyebilir." },
      { title: "WhatsApp üzerinden iletişim", text: "Bir başvuruyu takip etmek, ek bilgi istemek veya destek sağlamak için web sitesinde verdiğiniz WhatsApp numarası üzerinden sizinle iletişime geçebiliriz. Yanıt vermemek takip hızını etkileyebilir." },
      { title: "Mevcut programlar", text: "Mevcut programlar, koşulları veya kayıt durumları herhangi bir zamanda değişebilir. Bazı programlar program ve ajans koşullarına bağlı olarak açık, sınırlı veya duraklatılmış olabilir." },
      { title: "Dijital hizmetler", text: "Platform yüklemeleri, kazanç çekimleri veya destek hizmetleri gibi dijital hizmetler ayrı bir sayfada açıklanır. Ayrıntılar gerektiğinde resmî ajans kanalları üzerinden teyit edilir." },
      { title: "Sonuç garantisi yoktur", text: "HAMZA AGENCY her başvurunun kabulünü, belirli kazançları veya sabit sonuçları garanti etmez; sonuçlar programa, içerik üreticisinin etkinliğine, bağlılığa, platform koşullarına ve diğer etkenlere bağlıdır." },
      { title: "Web sitesi kullanımı", text: "Web sitesini yanlış bilgi göndermek, formları kötüye kullanmak, yönetim sistemlerine yetkisiz erişim girişiminde bulunmak veya web sitesine, ajansa ya da diğer kullanıcılara zarar veren faaliyetlerde bulunmak için kullanmamalısınız." },
      { title: "Koşulların güncellenmesi", text: "HAMZA AGENCY, hizmetler ve programlar geliştikçe bu hüküm ve koşulları değiştirebilir. Güncellemeden sonra web sitesini kullanmaya devam etmek yeni sürümü kabul ettiğiniz anlamına gelir." },
    ],
    responsibilityTitle: "Kullanıcı sorumluluğu",
    responsibilityText: "Gönderdiğiniz bilgilerin doğruluğundan, web sitesini kullanım şeklinizden ve katılmak istediğiniz program ile platformların kurallarına uymaktan siz sorumlusunuz. HAMZA AGENCY organizasyon ve takip konusunda yardımcı olur ancak harici platform politikalarını kontrol etmez.",
    contactTitle: "Koşullar hakkında soru için",
    contactText: "Bu koşullar veya web sitesini kullanma şekli hakkında sorunuz varsa HAMZA AGENCY ile WhatsApp üzerinden iletişime geçebilirsiniz.",
    whatsappCta: "WhatsApp ile iletişime geç",
    whatsappMessage: "Merhaba, HAMZA AGENCY hüküm ve koşulları hakkında bir sorum var.",
  },
};

function useCopy() {
  const language = useSiteLanguage();
  return { language, text: copy[language] };
}

export function TermsBackHomeLink() {
  const { language, text } = useCopy();
  return <Link href="/" dir={getLanguageDirection(language)} className="mb-8 inline-block text-purple-200">{text.backHome}</Link>;
}

export function TermsPolicyCards() {
  const { language, text } = useCopy();
  return (
    <div dir={getLanguageDirection(language)} className="mt-10 grid gap-6 md:grid-cols-2">
      {text.cards.map((section) => (
        <div key={section.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
          <h2 className="text-3xl font-black">{section.title}</h2>
          <p className="mt-5 leading-9 text-white/70">{section.text}</p>
        </div>
      ))}
    </div>
  );
}

export function TermsResponsibilityPanel() {
  const { language, text } = useCopy();
  return (
    <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
      <h2 className="text-3xl font-black">{text.responsibilityTitle}</h2>
      <p className="mt-5 leading-9 text-white/75">{text.responsibilityText}</p>
    </div>
  );
}

export function TermsContactPanel({ cleanWhatsapp }: { cleanWhatsapp: string }) {
  const { language, text } = useCopy();
  return (
    <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
      <h2 className="text-3xl font-black">{text.contactTitle}</h2>
      <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{text.contactText}</p>
      <a href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(text.whatsappMessage)}`} target="_blank" className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">{text.whatsappCta}</a>
    </div>
  );
}
