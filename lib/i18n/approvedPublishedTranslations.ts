import type { SiteLanguage } from "@/lib/i18n/locale";

export type ApprovedPublishedSourceType =
  | "pages"
  | "sections"
  | "announcements";
export type ApprovedPublishedField =
  | "title"
  | "summary"
  | "content";

type LocalizedFields = Partial<
  Record<ApprovedPublishedField, Record<SiteLanguage, string>>
>;

const approvedPublishedTranslations: Record<string, LocalizedFields> = {
  "pages:1": {
    title: {
      ar: "وكالة حمزة لإدارة وتطوير صناع المحتوى",
      en: "HAMZA AGENCY for Managing and Developing Content Creators",
      tr: "İçerik Üreticilerini Yöneten ve Geliştiren HAMZA AGENCY",
    },
    summary: {
      ar: "منصة وكالة احترافية للبرامج وصناع المحتوى",
      en: "A professional agency platform for content creator programs and organized support.",
      tr: "İçerik üreticisi programları ve düzenli destek için profesyonel ajans platformu.",
    },
    content: {
      ar: "منصة وكالة احترافية لإدارة وتوظيف ودعم صناع المحتوى على برامج البث المباشر والتواصل الاجتماعي، مع متابعة منظمة وفرص انضمام لبرامج متعددة.",
      en: "A professional agency platform for managing, recruiting, and supporting content creators across live-streaming and social media programs, with organized follow-up and opportunities to join multiple programs.",
      tr: "Canlı yayın ve sosyal medya programlarında içerik üreticilerini yönetmek, bünyesine katmak ve desteklemek için profesyonel bir ajans platformu; düzenli takip ve birden fazla programa katılım fırsatı sunar.",
    },
  },
  "sections:1": {
    title: {
      ar: "ابدأ طلب الانضمام",
      en: "Start Your Application",
      tr: "Başvurunuzu Başlatın",
    },
    summary: {
      ar: "فريق الوكالة يراجع الطلبات ويتواصل عبر واتساب عند الحاجة",
      en: "The agency team reviews applications and contacts applicants through WhatsApp when needed.",
      tr: "Ajans ekibi başvuruları inceler ve gerektiğinde WhatsApp üzerinden iletişime geçer.",
    },
    content: {
      ar: "يمكن لصانع المحتوى إرسال طلب الانضمام، ثم تتم مراجعة البيانات من لوحة الإدارة بشكل منظم.",
      en: "Content creators can submit an application, after which the details are reviewed through the admin dashboard in an organized process.",
      tr: "İçerik üreticileri katılım başvurusu gönderebilir; bilgiler daha sonra yönetim paneli üzerinden düzenli bir süreçle incelenir.",
    },
  },
  "sections:2": {
    title: {
      ar: "البرامج المتاحة",
      en: "Available Programs",
      tr: "Mevcut Programlar",
    },
    summary: {
      ar: "اختر البرنامج المناسب واطّلع على التفاصيل قبل التقديم",
      en: "Choose the right program and review the details before applying.",
      tr: "Uygun programı seçin ve başvurmadan önce ayrıntıları inceleyin.",
    },
    content: {
      ar: "تعرض هذه المنطقة البرامج المتاحة حالياً داخل وكالة حمزة، مع إمكانية إدارة بيانات كل برنامج من لوحة التحكم.",
      en: "This area presents the programs currently available through HAMZA AGENCY, while each program’s information remains manageable from the admin dashboard.",
      tr: "Bu alan HAMZA AGENCY bünyesinde şu anda mevcut programları gösterir; her programın bilgileri yönetim panelinden yönetilebilir.",
    },
  },
  "sections:3": {
    title: {
      ar: "وكالة حمزة لإدارة وتطوير صناع المحتوى",
      en: "HAMZA AGENCY for Managing and Developing Content Creators",
      tr: "İçerik Üreticilerini Yöneten ve Geliştiren HAMZA AGENCY",
    },
    summary: {
      ar: "منصة وكالة احترافية للبرامج وصناع المحتوى",
      en: "A professional agency platform for programs and content creators.",
      tr: "Programlar ve içerik üreticileri için profesyonel ajans platformu.",
    },
    content: {
      ar: "نساعد صناع المحتوى على التقديم والمتابعة والنمو ضمن برامج TikTok وBIGO LIVE وYaahlan وXena وCatchii من خلال إدارة منظمة ودعم واضح.",
      en: "We help content creators apply, follow up, and grow across TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii through organized management and clear support.",
      tr: "İçerik üreticilerinin TikTok, BIGO LIVE, Yaahlan, Xena ve Catchii programlarında başvuru, takip ve büyüme süreçlerini düzenli yönetim ve açık destekle ilerletmelerine yardımcı oluyoruz.",
    },
  },
  "announcements:2": {
    title: {
      ar: "التسجيل مفتوح الآن",
      en: "Applications Are Now Open",
      tr: "Başvurular Şimdi Açık",
    },
    content: {
      ar: "التقديم متاح حالياً لصناع المحتوى على برامج TikTok وBIGO LIVE وYaahlan وXena وCatchii عبر وكالة حمزة.",
      en: "Content creators can currently apply to TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii programs through HAMZA AGENCY.",
      tr: "İçerik üreticileri HAMZA AGENCY üzerinden TikTok, BIGO LIVE, Yaahlan, Xena ve Catchii programlarına şu anda başvurabilir.",
    },
  },
  "announcements:3": {
    title: {
      ar: "دعم وكالة حمزة",
      en: "HAMZA AGENCY Support",
      tr: "HAMZA AGENCY Desteği",
    },
    content: {
      ar: "فريق وكالة حمزة يساعدك في التقديم، المتابعة، تطوير الحساب، وحل المشاكل التقنية عبر واتساب.",
      en: "The HAMZA AGENCY team helps with applications, follow-up, account development, and technical issues through WhatsApp.",
      tr: "HAMZA AGENCY ekibi WhatsApp üzerinden başvuru, takip, hesap geliştirme ve teknik sorunlarda yardımcı olur.",
    },
  },
};

const approvedHomeDisplayTranslations: Record<
  string,
  Record<SiteLanguage, string>
> = {
  "home-page:title": {
    ar: "وكالة حمزة لإدارة وتطوير",
    en: "HAMZA AGENCY for Managing and Developing",
    tr: "HAMZA AGENCY ile Yönetim ve Gelişim",
  },
  "home-hero:title": {
    ar: "صناع المحتوى",
    en: "Content Creators",
    tr: "İçerik Üreticileri",
  },
};

export function getApprovedPublishedTranslation({
  sourceType,
  sourceId,
  field,
  language,
}: {
  sourceType: ApprovedPublishedSourceType;
  sourceId: string | number;
  field: ApprovedPublishedField;
  language: SiteLanguage;
}) {
  return (
    approvedPublishedTranslations[`${sourceType}:${String(sourceId)}`]?.[
      field
    ]?.[language] || ""
  );
}

export function getApprovedHomeDisplayTranslation({
  sourceKey,
  field,
  language,
}: {
  sourceKey: string;
  field: ApprovedPublishedField;
  language: SiteLanguage;
}) {
  return approvedHomeDisplayTranslations[`${sourceKey}:${field}`]?.[language] || "";
}
