"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type Copy = {
  backHome: string;
  contactNow: string;
  emailTitle: string;
  emailNote: string;
  sendEmail: string;
  hoursTitle: string;
  hoursFallback: string;
  hoursNote: string;
  viewPrograms: string;
  reasonsTitle: string;
  reasons: string[];
  beforeTitle: string;
  beforeText: string;
  quickLinks: Array<{ title: string; href: string; text: string }>;
  openWhatsApp: string;
  whatsappMessage: string;
};

const copy: Record<"ar" | "en" | "tr", Copy> = {
  ar: {
    backHome: "← العودة إلى الرئيسية", contactNow: "تواصل الآن", emailTitle: "البريد الإلكتروني", emailNote: "يمكن استخدام البريد للتواصل الرسمي عند توفره ضمن بيانات الوكالة.", sendEmail: "إرسال بريد", hoursTitle: "أوقات المتابعة", hoursFallback: "تتم المتابعة حسب توفر فريق الوكالة وضغط الطلبات", hoursNote: "قد تختلف سرعة الرد حسب ضغط الطلبات ونوع البرنامج أو الخدمة.", viewPrograms: "عرض البرامج", reasonsTitle: "متى تتواصل معنا؟", reasons: ["الاستفسار عن الانضمام لأحد البرامج", "متابعة طلب تم إرساله سابقاً", "السؤال عن خدمات الوكالة", "الاستفسار عن الخدمات الرقمية", "الإبلاغ عن مشكلة تقنية", "طلب تحويل المحادثة إلى أحد أفراد الفريق"], beforeTitle: "قبل إرسال الرسالة", beforeText: "لتسريع الرد، أرسل اسمك، الدولة، البرنامج أو الخدمة المطلوبة، ورقم واتساب صحيح. وإذا كنت تتابع طلباً سابقاً، استخدم نفس رقم الواتساب الذي أرسلته في الطلب.", quickLinks: [{ title: "البرامج", href: "/programs", text: "تصفح البرامج المتاحة حالياً وابدأ طلب الانضمام." }, { title: "خدمات الوكالة", href: "/services", text: "تعرف على خدمات الإدارة والدعم والمتابعة لصناع المحتوى." }, { title: "الخدمات الرقمية", href: "/digital-services", text: "تعرف على خدمات الشحن والسحب والمتابعة عبر واتساب." }, { title: "تتبع الطلب", href: "/application-status", text: "تابع حالة طلب الانضمام باستخدام بيانات الطلب المتاحة." }], openWhatsApp: "فتح واتساب", whatsappMessage: "مرحباً، أريد التواصل مع وكالة حمزة.",
  },
  en: {
    backHome: "← Back to home", contactNow: "Contact now", emailTitle: "Email", emailNote: "Email can be used for official communication when it is available in the agency contact details.", sendEmail: "Send email", hoursTitle: "Follow-up hours", hoursFallback: "Follow-up depends on team availability and current request volume.", hoursNote: "Response times may vary depending on request volume and the type of program or service.", viewPrograms: "View programs", reasonsTitle: "When should you contact us?", reasons: ["Ask about joining a program", "Follow up on a previously submitted request", "Ask about agency services", "Ask about digital services", "Report a technical issue", "Request to speak with a team member"], beforeTitle: "Before sending a message", beforeText: "To help us respond faster, send your name, country, requested program or service, and a valid WhatsApp number. When following up on a previous request, use the same WhatsApp number submitted with that request.", quickLinks: [{ title: "Programs", href: "/programs", text: "Browse currently available programs and start a joining request." }, { title: "Agency services", href: "/services", text: "Learn about management, support, and follow-up services for content creators." }, { title: "Digital services", href: "/digital-services", text: "Learn about top-up, withdrawal, and WhatsApp follow-up services." }, { title: "Track application", href: "/application-status", text: "Track your joining application using the available request details." }], openWhatsApp: "Open WhatsApp", whatsappMessage: "Hello, I would like to contact HAMZA AGENCY.",
  },
  tr: {
    backHome: "← Ana sayfaya dön", contactNow: "Şimdi iletişime geç", emailTitle: "E-posta", emailNote: "Ajans iletişim bilgilerinde mevcut olduğunda resmî iletişim için e-posta kullanılabilir.", sendEmail: "E-posta gönder", hoursTitle: "Takip saatleri", hoursFallback: "Takip, ekibin uygunluğuna ve mevcut talep yoğunluğuna göre yapılır.", hoursNote: "Yanıt süresi, talep yoğunluğuna ve program ya da hizmet türüne göre değişebilir.", viewPrograms: "Programları görüntüle", reasonsTitle: "Ne zaman bizimle iletişime geçmelisiniz?", reasons: ["Bir programa katılım hakkında bilgi almak", "Daha önce gönderilmiş bir başvuruyu takip etmek", "Ajans hizmetleri hakkında soru sormak", "Dijital hizmetler hakkında bilgi almak", "Teknik bir sorunu bildirmek", "Bir ekip üyesiyle görüşme talep etmek"], beforeTitle: "Mesaj göndermeden önce", beforeText: "Daha hızlı yanıt alabilmek için adınızı, ülkenizi, istediğiniz program veya hizmeti ve geçerli bir WhatsApp numarasını gönderin. Önceki bir başvuruyu takip ediyorsanız, başvuruda kullandığınız aynı WhatsApp numarasını kullanın.", quickLinks: [{ title: "Programlar", href: "/programs", text: "Mevcut programları inceleyin ve katılım başvurusu başlatın." }, { title: "Ajans hizmetleri", href: "/services", text: "İçerik üreticileri için yönetim, destek ve takip hizmetleri hakkında bilgi alın." }, { title: "Dijital hizmetler", href: "/digital-services", text: "Yükleme, para çekme ve WhatsApp üzerinden takip hizmetleri hakkında bilgi alın." }, { title: "Başvuruyu takip et", href: "/application-status", text: "Mevcut başvuru bilgilerini kullanarak katılım başvurunuzu takip edin." }], openWhatsApp: "WhatsApp'ı aç", whatsappMessage: "Merhaba, HAMZA AGENCY ile iletişime geçmek istiyorum.",
  },
};

function useCopy() {
  const language = useSiteLanguage();
  return { language, text: copy[language] };
}

export function ContactBackHomeLink() {
  const { language, text } = useCopy();
  return <Link href="/" dir={getLanguageDirection(language)} className="mb-8 inline-block text-purple-200">{text.backHome}</Link>;
}

export function ContactNowLink({ cleanWhatsapp }: { cleanWhatsapp: string }) {
  const { language, text } = useCopy();
  return <a dir={getLanguageDirection(language)} href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(text.whatsappMessage)}`} target="_blank" className="mt-6 inline-flex rounded-full bg-green-500 px-6 py-3 font-black text-white">{text.contactNow}</a>;
}

export function ContactEmailAndHoursCards({ email, workingHours }: { email: string; workingHours: string }) {
  const { language, text } = useCopy();
  const displayWorkingHours = workingHours || text.hoursFallback;

  return <>{email ? <div dir={getLanguageDirection(language)} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"><h2 className="text-3xl font-black">{text.emailTitle}</h2><p className="mt-4 break-words text-xl font-bold text-green-200">{email}</p><a href={`mailto:${email}`} className="mt-6 inline-flex rounded-full bg-green-500 px-6 py-3 font-black text-white">{text.sendEmail}</a></div> : null}<div dir={getLanguageDirection(language)} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"><h2 className="text-3xl font-black">{text.hoursTitle}</h2><p className="mt-4 break-words text-xl font-bold text-green-200">{displayWorkingHours}</p><p className="mt-4 leading-8 text-white/65">{text.hoursNote}</p><Link href="/programs" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-black text-white">{text.viewPrograms}</Link></div></>;
}

export function ContactReasons() {
  const { language, text } = useCopy();
  return <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur"><h2 className="text-3xl font-black">{text.reasonsTitle}</h2><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{text.reasons.map((reason) => <div key={reason} className="rounded-2xl border border-white/10 bg-black/25 p-5 text-white/75">{reason}</div>)}</div></div>;
}

export function ContactBeforeMessage() {
  const { language, text } = useCopy();
  return <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur"><h2 className="text-3xl font-black text-yellow-100">{text.beforeTitle}</h2><p className="mt-5 leading-9 text-white/75">{text.beforeText}</p></div>;
}

export function ContactQuickLinks() {
  const { language, text } = useCopy();
  return <div dir={getLanguageDirection(language)} className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">{text.quickLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-[2rem] border border-white/10 bg-black/35 p-6 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10"><h3 className="text-2xl font-black">{link.title}</h3><p className="mt-4 leading-8 text-white/65">{link.text}</p></Link>)}</div>;
}

export function ContactWhatsAppAction({ cleanWhatsapp }: { cleanWhatsapp: string }) {
  const { language, text } = useCopy();
  return <a dir={getLanguageDirection(language)} href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(text.whatsappMessage)}`} target="_blank" className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">{text.openWhatsApp}</a>;
}
