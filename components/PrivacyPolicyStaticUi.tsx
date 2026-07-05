"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type PolicyCard = { title: string; text: string };

type PrivacyCopy = {
  backHome: string;
  cards: PolicyCard[];
  applicationTitle: string;
  applicationText: string;
  contactTitle: string;
  contactText: string;
  whatsappCta: string;
  whatsappMessage: string;
};

const copy: Record<"ar" | "en" | "tr", PrivacyCopy> = {
  ar: {
    backHome: "← العودة إلى الرئيسية",
    cards: [
      { title: "المعلومات التي نجمعها", text: "عند إرسال طلب الانضمام أو التواصل مع وكالة حمزة، قد نقوم بجمع معلومات مثل الاسم الثلاثي، الدولة، رقم واتساب، البرنامج المختار، الخبرات السابقة، الملاحظات الإضافية، ومعلومات التواصل التي يرسلها المستخدم طوعاً." },
      { title: "كيف نستخدم المعلومات", text: "نستخدم المعلومات لمراجعة الطلبات، التواصل مع المتقدمين، متابعة حالة الطلب، تقديم الدعم، تحسين خدمات الوكالة، وتنظيم البرامج والخدمات المرتبطة بصناع المحتوى." },
      { title: "التواصل عبر واتساب", text: "قد يتم التواصل مع المستخدم عبر رقم واتساب الذي يقدمه في نموذج الانضمام أو صفحة التواصل، وذلك لمتابعة الطلبات أو طلب معلومات إضافية أو تقديم الدعم." },
      { title: "حماية البيانات", text: "نعمل على حماية البيانات قدر الإمكان من خلال استخدام أدوات موثوقة، وتقليل الوصول إلى المعلومات حسب حاجة العمل والمتابعة داخل الوكالة." },
      { title: "مشاركة البيانات", text: "لا نبيع بيانات المستخدمين. قد يتم استخدام البيانات داخلياً من قبل فريق الوكالة أو المسؤولين عن البرامج لمراجعة الطلبات وتقديم الدعم اللازم." },
      { title: "الاحتفاظ بالبيانات", text: "قد نحتفظ ببيانات الطلبات لفترة مناسبة لأغراض المتابعة والإدارة والسجلات التشغيلية، ما لم يطلب المستخدم حذف بياناته وكان ذلك ممكناً من الناحية التشغيلية." },
      { title: "ملفات تعريف الارتباط والتحليلات", text: "قد يستخدم الموقع أدوات قياس وتحليل لتحسين تجربة المستخدم وفهم أداء الصفحات، مع مراعاة حماية البيانات قدر الإمكان." },
      { title: "خدمات الطرف الثالث", text: "يعتمد الموقع على خدمات خارجية مثل الاستضافة وقاعدة البيانات وخدمات التواصل. قد تخضع هذه الخدمات لسياسات خصوصية خاصة بها." },
      { title: "حقوق المستخدم", text: "يمكن للمستخدم التواصل مع وكالة حمزة للاستفسار عن بياناته أو طلب تحديثها أو طلب حذفها عندما يكون ذلك ممكناً حسب طبيعة الطلب والنظام التشغيلي." },
      { title: "تحديث سياسة الخصوصية", text: "قد يتم تعديل سياسة الخصوصية من وقت لآخر بما يتناسب مع تطور خدمات الوكالة والموقع، وسيتم نشر النسخة الأحدث في هذه الصفحة." },
    ],
    applicationTitle: "بيانات طلبات الانضمام",
    applicationText: "عند تعبئة نموذج الانضمام، يتم حفظ البيانات بهدف مراجعة الطلب ومتابعته. يمكن أن تشمل هذه البيانات الاسم، الدولة، رقم واتساب، البرنامج، الخبرات السابقة، الملاحظات، وحالة الطلب.",
    contactTitle: "للاستفسار حول الخصوصية",
    contactText: "يمكنك التواصل مع وكالة حمزة عبر واتساب للاستفسار عن البيانات أو طلب تحديث معلوماتك.",
    whatsappCta: "تواصل واتساب",
    whatsappMessage: "مرحباً، لدي استفسار بخصوص سياسة الخصوصية في وكالة حمزة.",
  },
  en: {
    backHome: "← Back to home",
    cards: [
      { title: "Information we collect", text: "When you submit a joining request or contact HAMZA AGENCY, we may collect information such as your full name, country, WhatsApp number, selected program, previous experience, additional notes, and contact information you provide voluntarily." },
      { title: "How we use information", text: "We use information to review requests, communicate with applicants, follow up on request status, provide support, improve agency services, and organize programs and services related to content creators." },
      { title: "WhatsApp communication", text: "We may contact you through the WhatsApp number provided in the joining form or contact page to follow up on requests, request additional information, or provide support." },
      { title: "Data protection", text: "We work to protect data as much as possible by using trusted tools and limiting access to information according to operational and follow-up needs within the agency." },
      { title: "Data sharing", text: "We do not sell user data. Data may be used internally by the agency team or program managers to review requests and provide necessary support." },
      { title: "Data retention", text: "We may retain request data for an appropriate period for follow-up, management, and operational record purposes, unless a user requests deletion and it is operationally possible." },
      { title: "Cookies and analytics", text: "The website may use measurement and analytics tools to improve the user experience and understand page performance, while protecting data as much as possible." },
      { title: "Third-party services", text: "The website relies on external services such as hosting, databases, and communication services. These services may be subject to their own privacy policies." },
      { title: "User rights", text: "You may contact HAMZA AGENCY to ask about your data, request an update, or request deletion when possible according to the nature of the request and the operational system." },
      { title: "Privacy policy updates", text: "This privacy policy may be amended from time to time as the agency and website services evolve. The latest version will be published on this page." },
    ],
    applicationTitle: "Joining request data",
    applicationText: "When you complete the joining form, your data is saved to review and follow up on the request. This may include your name, country, WhatsApp number, program, previous experience, notes, and request status.",
    contactTitle: "Privacy enquiries",
    contactText: "You can contact HAMZA AGENCY on WhatsApp to ask about your data or request an update to your information.",
    whatsappCta: "Contact via WhatsApp",
    whatsappMessage: "Hello, I have a question about the HAMZA AGENCY privacy policy.",
  },
  tr: {
    backHome: "← Ana sayfaya dön",
    cards: [
      { title: "Topladığımız bilgiler", text: "Katılım başvurusu gönderdiğinizde veya HAMZA AGENCY ile iletişime geçtiğinizde tam adınız, ülkeniz, WhatsApp numaranız, seçilen program, önceki deneyimleriniz, ek notlarınız ve gönüllü olarak ilettiğiniz iletişim bilgileri gibi verileri toplayabiliriz." },
      { title: "Bilgileri nasıl kullanıyoruz", text: "Bilgileri başvuruları incelemek, başvuru sahipleriyle iletişim kurmak, başvuru durumunu takip etmek, destek sağlamak, ajans hizmetlerini geliştirmek ve içerik üreticileriyle ilgili program ve hizmetleri düzenlemek için kullanırız." },
      { title: "WhatsApp üzerinden iletişim", text: "Başvuruları takip etmek, ek bilgi istemek veya destek sağlamak amacıyla katılım formunda ya da iletişim sayfasında verdiğiniz WhatsApp numarası üzerinden sizinle iletişime geçebiliriz." },
      { title: "Veri koruma", text: "Güvenilir araçlar kullanarak ve bilgilere erişimi ajans içindeki operasyon ve takip ihtiyacına göre sınırlayarak verileri mümkün olduğunca korumaya çalışırız." },
      { title: "Veri paylaşımı", text: "Kullanıcı verilerini satmayız. Veriler, başvuruları incelemek ve gerekli desteği sağlamak için ajans ekibi veya program yöneticileri tarafından kurum içinde kullanılabilir." },
      { title: "Veri saklama", text: "Bir kullanıcı silme talebinde bulunmadığı ve operasyonel olarak mümkün olmadığı sürece, başvuru verilerini takip, yönetim ve operasyon kayıtları amacıyla uygun bir süre saklayabiliriz." },
      { title: "Çerezler ve analiz", text: "Web sitesi kullanıcı deneyimini iyileştirmek ve sayfa performansını anlamak için ölçüm ve analiz araçları kullanabilir; verilerin korunmasına mümkün olduğunca dikkat edilir." },
      { title: "Üçüncü taraf hizmetler", text: "Web sitesi barındırma, veritabanı ve iletişim hizmetleri gibi harici hizmetlere dayanır. Bu hizmetlerin kendilerine ait gizlilik politikaları olabilir." },
      { title: "Kullanıcı hakları", text: "Talebin niteliğine ve operasyonel sisteme göre mümkün olduğunda verileriniz hakkında bilgi almak, güncelleme istemek veya silme talep etmek için HAMZA AGENCY ile iletişime geçebilirsiniz." },
      { title: "Gizlilik politikası güncellemeleri", text: "Bu gizlilik politikası, ajans ve web sitesi hizmetleri geliştikçe zaman zaman değiştirilebilir. En güncel sürüm bu sayfada yayımlanacaktır." },
    ],
    applicationTitle: "Katılım başvurusu verileri",
    applicationText: "Katılım formunu doldurduğunuzda verileriniz başvurunun incelenmesi ve takibi amacıyla kaydedilir. Bu veriler adınız, ülkeniz, WhatsApp numaranız, program, önceki deneyimleriniz, notlarınız ve başvuru durumunuzu içerebilir.",
    contactTitle: "Gizlilik hakkında bilgi almak için",
    contactText: "Verileriniz hakkında bilgi almak veya bilgilerinizi güncellemek için HAMZA AGENCY ile WhatsApp üzerinden iletişime geçebilirsiniz.",
    whatsappCta: "WhatsApp ile iletişime geç",
    whatsappMessage: "Merhaba, HAMZA AGENCY gizlilik politikası hakkında bir sorum var.",
  },
};

function useCopy() {
  const language = useSiteLanguage();
  return { language, text: copy[language] };
}

export function PrivacyBackHomeLink() {
  const { language, text } = useCopy();
  return <Link href="/" dir={getLanguageDirection(language)} className="mb-8 inline-block text-purple-200">{text.backHome}</Link>;
}

export function PrivacyPolicyCards() {
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

export function PrivacyApplicationDataPanel() {
  const { language, text } = useCopy();
  return (
    <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
      <h2 className="text-3xl font-black">{text.applicationTitle}</h2>
      <p className="mt-5 leading-9 text-white/75">{text.applicationText}</p>
    </div>
  );
}

export function PrivacyContactPanel({ cleanWhatsapp }: { cleanWhatsapp: string }) {
  const { language, text } = useCopy();
  return (
    <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
      <h2 className="text-3xl font-black">{text.contactTitle}</h2>
      <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{text.contactText}</p>
      <a href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(text.whatsappMessage)}`} target="_blank" className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">{text.whatsappCta}</a>
    </div>
  );
}
