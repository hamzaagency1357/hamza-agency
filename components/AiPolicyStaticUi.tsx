"use client";

import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type PolicyCard = { title: string; text: string };

type AiPolicyCopy = {
  noticeTitle: string;
  noticeText: string;
  policyCards: PolicyCard[];
  escalationReasons: string[];
  knowledgeTitle: string;
  knowledgeText: string;
  contactTitle: string;
  contactText: string;
  whatsappCta: string;
  whatsappMessage: string;
};

const copy: Record<"ar" | "en" | "tr", AiPolicyCopy> = {
  ar: {
    noticeTitle: "تنبيه مهم",
    noticeText: "الدعم الذكي أداة مساعدة للإرشاد والمعلومات العامة فقط. لا يعتبر بديلاً عن الإدارة، ولا يصدر قرارات قبول أو رفض، ولا يضمن نتائج أو أرباحاً أو موافقات على البرامج.",
    policyCards: [
      { title: "دور الدعم الذكي", text: "قد تساعد أنظمة الدعم الذكي الزائر على فهم معلومات الوكالة، البرامج المتاحة، طريقة الانضمام، الأسئلة الشائعة، والخدمات العامة بطريقة أسرع وأكثر تنظيماً." },
      { title: "الغرض من المساعدة", text: "الغرض من الدعم الذكي هو تقديم إرشاد عام ومعلومات منظمة، وليس استبدال فريق الوكالة أو اتخاذ قرارات نهائية نيابة عنه." },
      { title: "حدود الإجابات", text: "قد تكون الإجابات محدودة إذا كان السؤال يتعلق بحالة طلب محددة، قرار قبول، مشكلة خاصة بالحساب، أو معلومات تحتاج مراجعة من فريق الوكالة." },
      { title: "التحويل إلى واتساب", text: "عند الحاجة إلى متابعة بشرية أو توضيح خاص، يتم توجيه المستخدم إلى قناة واتساب الرسمية للتواصل مع فريق وكالة حمزة." },
      { title: "قرارات القبول", text: "أنظمة الدعم الذكي لا تقرر قبول أو رفض طلبات الانضمام. قرارات الطلبات تتم من قبل فريق الوكالة أو المسؤولين المخولين." },
      { title: "مصدر المعلومات", text: "تعتمد الإجابات على المعلومات المنشورة في الموقع، الأسئلة الشائعة، مركز المعرفة، بيانات البرامج، والسياسات العامة للوكالة." },
      { title: "دقة المعلومات", text: "نسعى لتقديم معلومات واضحة ومفيدة، لكن قد تتغير شروط البرامج أو الخدمات أو طرق العمل، لذلك يجب تأكيد الحالات الخاصة من فريق الوكالة." },
      { title: "حفظ الأسئلة وتحسين الدعم", text: "قد يتم استخدام بعض الأسئلة أو المحادثات لتحسين جودة الدعم وفهم احتياجات الزوار، مع مراعاة سياسة الخصوصية الخاصة بالموقع." },
      { title: "الخصوصية والبيانات", text: "ينبغي عدم إرسال معلومات حساسة أو غير ضرورية داخل أي محادثة دعم. التعامل مع البيانات يخضع لسياسة الخصوصية المنشورة في الموقع." },
      { title: "الإشراف البشري", text: "يبقى فريق الوكالة مسؤولاً عن المتابعة والقرارات الإدارية والحالات التي تحتاج مراجعة بشرية أو تواصلاً مباشراً." },
    ],
    escalationReasons: ["السؤال عن حالة طلب محددة", "وجود مشكلة تقنية خاصة بحسابك", "طلب التواصل مع موظف بشكل مباشر", "وجود سؤال يحتاج مراجعة خاصة", "الحاجة إلى قرار إداري أو متابعة خاصة", "وجود معلومات تحتاج تأكيداً من فريق الوكالة"],
    knowledgeTitle: "علاقة الدعم الذكي بمركز المعرفة",
    knowledgeText: "يساعد مركز المعرفة والأسئلة الشائعة وبيانات البرامج على تقديم معلومات أوضح للزائر، وتبقى الحالات الخاصة مرتبطة بالتواصل مع فريق الوكالة.",
    contactTitle: "تحتاج تواصلاً بشرياً؟",
    contactText: "يمكنك التواصل مع وكالة حمزة عبر واتساب عند الحاجة إلى متابعة من فريق الوكالة.",
    whatsappCta: "تواصل واتساب",
    whatsappMessage: "مرحباً، أريد التواصل مع فريق وكالة حمزة.",
  },
  en: {
    noticeTitle: "Important notice",
    noticeText: "Smart support is only a tool for guidance and general information. It does not replace management, make acceptance or rejection decisions, or guarantee results, earnings, or program approvals.",
    policyCards: [
      { title: "Role of smart support", text: "Smart support systems may help visitors understand agency information, available programs, joining steps, frequently asked questions, and general services in a faster and more organized way." },
      { title: "Purpose of assistance", text: "The purpose of smart support is to provide general guidance and organized information, not to replace the agency team or make final decisions on its behalf." },
      { title: "Limits of answers", text: "Answers may be limited when a question concerns a specific application status, an acceptance decision, an account-specific issue, or information that requires review by the agency team." },
      { title: "Escalation to WhatsApp", text: "When human follow-up or special clarification is needed, the user is directed to the official WhatsApp channel to contact the HAMZA AGENCY team." },
      { title: "Acceptance decisions", text: "Smart support systems do not decide whether joining applications are accepted or rejected. Application decisions are made by the agency team or authorized administrators." },
      { title: "Information sources", text: "Answers rely on information published on the website, FAQs, the Knowledge Center, program data, and the agency's general policies." },
      { title: "Information accuracy", text: "We aim to provide clear and useful information, but program terms, services, or ways of working may change. Special cases should therefore be confirmed with the agency team." },
      { title: "Saving questions and improving support", text: "Some questions or conversations may be used to improve support quality and understand visitor needs, in accordance with the website privacy policy." },
      { title: "Privacy and data", text: "Do not send sensitive or unnecessary information in any support conversation. Data handling is subject to the privacy policy published on the website." },
      { title: "Human oversight", text: "The agency team remains responsible for follow-up, administrative decisions, and cases that need human review or direct communication." },
    ],
    escalationReasons: ["A question about a specific application status", "A technical issue specific to your account", "A request to speak directly with a staff member", "A question that requires special review", "A need for an administrative decision or special follow-up", "Information that needs confirmation from the agency team"],
    knowledgeTitle: "How smart support relates to the Knowledge Center",
    knowledgeText: "The Knowledge Center, FAQs, and program data help provide clearer information to visitors, while special cases remain connected to communication with the agency team.",
    contactTitle: "Need human assistance?",
    contactText: "Contact HAMZA AGENCY on WhatsApp when you need follow-up from the agency team.",
    whatsappCta: "Contact via WhatsApp",
    whatsappMessage: "Hello, I would like to contact the HAMZA AGENCY team.",
  },
  tr: {
    noticeTitle: "Önemli uyarı",
    noticeText: "Akıllı destek yalnızca rehberlik ve genel bilgi için bir yardımcı araçtır. Yönetimin yerini almaz, kabul veya ret kararı vermez ve sonuç, kazanç ya da program onayı garanti etmez.",
    policyCards: [
      { title: "Akıllı desteğin rolü", text: "Akıllı destek sistemleri ziyaretçilerin ajans bilgilerini, mevcut programları, katılım adımlarını, sık sorulan soruları ve genel hizmetleri daha hızlı ve düzenli biçimde anlamalarına yardımcı olabilir." },
      { title: "Yardımın amacı", text: "Akıllı desteğin amacı genel rehberlik ve düzenli bilgi sunmaktır; ajans ekibinin yerini almak veya onun adına nihai kararlar vermek değildir." },
      { title: "Yanıtların sınırları", text: "Bir soru belirli bir başvuru durumu, kabul kararı, hesaba özel sorun veya ajans ekibinin incelemesini gerektiren bilgiyle ilgili olduğunda yanıtlar sınırlı olabilir." },
      { title: "WhatsApp'a yönlendirme", text: "İnsan desteği veya özel açıklama gerektiğinde kullanıcı, HAMZA AGENCY ekibiyle iletişim için resmî WhatsApp kanalına yönlendirilir." },
      { title: "Kabul kararları", text: "Akıllı destek sistemleri katılım başvurularını kabul veya reddetmez. Başvuru kararları ajans ekibi veya yetkili yöneticiler tarafından verilir." },
      { title: "Bilgi kaynakları", text: "Yanıtlar web sitesinde yayımlanan bilgiler, sık sorulan sorular, Bilgi Merkezi, program verileri ve ajansın genel politikalarına dayanır." },
      { title: "Bilgi doğruluğu", text: "Açık ve faydalı bilgi sunmayı amaçlarız; ancak program şartları, hizmetler veya çalışma biçimleri değişebilir. Bu nedenle özel durumlar ajans ekibiyle teyit edilmelidir." },
      { title: "Soruları kaydetme ve desteği geliştirme", text: "Bazı sorular veya görüşmeler, web sitesinin gizlilik politikasına uygun olarak destek kalitesini artırmak ve ziyaretçi ihtiyaçlarını anlamak için kullanılabilir." },
      { title: "Gizlilik ve veriler", text: "Herhangi bir destek görüşmesinde hassas veya gereksiz bilgi göndermeyin. Veri işleme, web sitesinde yayımlanan gizlilik politikasına tabidir." },
      { title: "İnsan gözetimi", text: "Ajans ekibi takip, idari kararlar ve insan incelemesi veya doğrudan iletişim gerektiren durumlardan sorumlu olmaya devam eder." },
    ],
    escalationReasons: ["Belirli bir başvuru durumu hakkında soru", "Hesabınıza özel teknik sorun", "Doğrudan bir çalışanla görüşme talebi", "Özel inceleme gerektiren bir soru", "İdari karar veya özel takip ihtiyacı", "Ajans ekibinden teyit gerektiren bilgi"],
    knowledgeTitle: "Akıllı desteğin Bilgi Merkeziyle ilişkisi",
    knowledgeText: "Bilgi Merkezi, sık sorulan sorular ve program verileri ziyaretçilere daha açık bilgi sunmaya yardımcı olur; özel durumlar ise ajans ekibiyle iletişim kapsamında kalır.",
    contactTitle: "İnsan desteğine mi ihtiyacınız var?",
    contactText: "Ajans ekibinden takip gerektiğinde HAMZA AGENCY ile WhatsApp üzerinden iletişime geçebilirsiniz.",
    whatsappCta: "WhatsApp ile iletişime geç",
    whatsappMessage: "Merhaba, HAMZA AGENCY ekibiyle iletişime geçmek istiyorum.",
  },
};

function useCopy() {
  const language = useSiteLanguage();
  return { language, text: copy[language] };
}

export function AiPolicyOverviewStaticUi() {
  const { language, text } = useCopy();

  return (
    <>
      <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
        <h2 className="text-3xl font-black text-yellow-100">{text.noticeTitle}</h2>
        <p className="mt-5 leading-9 text-white/75">{text.noticeText}</p>
      </div>
      <div dir={getLanguageDirection(language)} className="mt-10 grid gap-6 md:grid-cols-2">
        {text.policyCards.map((section) => (
          <div key={section.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
            <h2 className="text-3xl font-black">{section.title}</h2>
            <p className="mt-5 leading-9 text-white/70">{section.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function AiPolicyEscalationReasons() {
  const { language, text } = useCopy();

  return (
    <div dir={getLanguageDirection(language)} className="mt-6 grid gap-4 md:grid-cols-2">
      {text.escalationReasons.map((item) => (
        <div key={item} className="rounded-2xl border border-white/10 bg-black/25 p-5 text-white/75">{item}</div>
      ))}
    </div>
  );
}

export function AiPolicySupportStaticUi({ cleanWhatsapp }: { cleanWhatsapp: string }) {
  const { language, text } = useCopy();

  return (
    <>
      <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-7 backdrop-blur">
        <h2 className="text-3xl font-black text-cyan-100">{text.knowledgeTitle}</h2>
        <p className="mt-5 leading-9 text-white/75">{text.knowledgeText}</p>
      </div>
      <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
        <h2 className="text-3xl font-black">{text.contactTitle}</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{text.contactText}</p>
        <a href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(text.whatsappMessage)}`} target="_blank" className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">
          {text.whatsappCta}
        </a>
      </div>
    </>
  );
}
