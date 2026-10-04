import type { SiteLanguage } from "@/lib/i18n/locale";

type AgencyDiscoveryCopy = {
  seoTitle: string;
  seoDescription: string;
  heading: string;
  intro: string;
  questions: readonly { question: string; answer: string; href: string; linkLabel: string }[];
};

// Public service information shared by the visible homepage and its metadata.
// Platform affiliation, earnings, acceptance and rankings are not implied.
export const agencyDiscoveryCopy: Record<SiteLanguage, AgencyDiscoveryCopy> = {
  ar: {
    seoTitle: "وكالة حمزة للبث المباشر | HAMZA AGENCY بإدارة عراب سوريا",
    seoDescription: "وكالة حمزة لدعم صناع المحتوى في البث المباشر. تعرّف على برامج تيك توك TikTok وبيجو لايف BIGO LIVE، شروط الانضمام وطريقة تقديم الطلب ومتابعته.",
    heading: "وكالة للبث المباشر ودعم صناع المحتوى",
    intro: "تساعد HAMZA AGENCY صناع المحتوى على فهم برامج البث المباشر، اختيار البرنامج المناسب، وتقديم طلب الانضمام ومتابعته. تُدار وكالة حمزة بإشراف الوكيل عراب سوريا، ويمكن التواصل مع الفريق عبر القنوات الرسمية المنشورة في الموقع.",
    questions: [
      {
        question: "ماذا تقدم وكالة حمزة لصناع المحتوى؟",
        answer: "تقدم الوكالة إرشاداً حول البرامج ومتطلبات التقديم، ومتابعة للطلبات ودعماً فنياً وإدارياً لصناع المحتوى. راجع صفحة البرنامج لمعرفة تفاصيل الخدمات والشروط الخاصة به قبل إرسال طلبك.",
        href: "/services",
        linkLabel: "خدمات دعم صناع المحتوى",
      },
      {
        question: "كيف أنضم إلى وكالة حمزة للبث المباشر؟",
        answer: "افتح صفحة البرامج، اختر البرنامج الذي يناسب محتواك واقرأ شروطه، ثم أرسل طلب الانضمام ببياناتك. احتفظ برقم التتبع الذي يظهر بعد نجاح الإرسال لمتابعة حالة الطلب، وتواصل مع الفريق عبر صفحة التواصل عند الحاجة.",
        href: "/programs",
        linkLabel: "البرامج وطريقة الانضمام",
      },
      {
        question: "أين أجد شروط التسجيل في برنامج تيك توك؟",
        answer: "تعرض صفحة تيك توك TikTok شروط التقديم والدعم المتاح وطريقة إرسال الطلب عبر وكالة حمزة. اقرأ التفاصيل الخاصة بالبرنامج؛ شروط كل منصة وآلية مراجعة الطلب قد تختلف عن البرامج الأخرى.",
        href: "/programs/tiktok",
        linkLabel: "برنامج تيك توك TikTok",
      },
      {
        question: "هل يمكنني التقديم إلى برنامج بيجو لايف؟",
        answer: "يمكنك مراجعة صفحة بيجو لايف BIGO LIVE للتعرف على متطلبات البرنامج وخدمات المتابعة وإرسال طلب الانضمام. كل طلب يخضع للمراجعة، واستيفاء الشروط لا يعني القبول النهائي أو ضمان الأرباح.",
        href: "/programs/bigo-live",
        linkLabel: "برنامج بيجو لايف BIGO LIVE",
      },
    ],
  },
  en: {
    seoTitle: "HAMZA AGENCY | Live Streaming & Creator Support | عراب سوريا",
    seoDescription: "HAMZA AGENCY supports live-streaming creators. Explore TikTok and BIGO LIVE programs, application requirements, how to apply and how to track your application.",
    heading: "A live-streaming agency supporting content creators",
    intro: "HAMZA AGENCY helps creators understand live-streaming programs, choose a suitable program, submit an application and follow its progress. The agency is managed by عراب سوريا. Contact the team through the official channels published on this website.",
    questions: [
      {
        question: "What does HAMZA AGENCY offer content creators?",
        answer: "The agency provides guidance on programs and application requirements, application follow-up, and technical and administrative support for creators. Read the program page for its specific services and requirements before applying.",
        href: "/services",
        linkLabel: "Creator support services",
      },
      {
        question: "How do I apply to HAMZA AGENCY?",
        answer: "Open the programs page, choose a program that suits your content, read its requirements and submit your application. Keep the tracking code shown after a successful submission to check your application status. Contact the team through the contact page when needed.",
        href: "/programs",
        linkLabel: "Programs and how to apply",
      },
      {
        question: "Where can I find the TikTok program requirements?",
        answer: "The TikTok page explains application requirements, available support and how to apply through HAMZA AGENCY. Read the details for that program; requirements and application review processes can differ between platforms.",
        href: "/programs/tiktok",
        linkLabel: "TikTok creator program",
      },
      {
        question: "Can I apply to the BIGO LIVE program?",
        answer: "Visit the BIGO LIVE page to review program requirements, follow-up services and the application process. Every application is reviewed. Meeting the requirements does not guarantee final acceptance or earnings.",
        href: "/programs/bigo-live",
        linkLabel: "BIGO LIVE creator program",
      },
    ],
  },
  tr: {
    seoTitle: "HAMZA AGENCY | Canlı Yayın ve İçerik Üreticisi Desteği | عراب سوريا",
    seoDescription: "HAMZA AGENCY canlı yayın içerik üreticilerini destekler. TikTok ve BIGO LIVE programlarını, başvuru koşullarını, başvuru sürecini ve başvuru takibini inceleyin.",
    heading: "Canlı yayın ve içerik üreticisi destek ajansı",
    intro: "HAMZA AGENCY, içerik üreticilerinin canlı yayın programlarını anlamalarına, uygun programı seçmelerine, başvuru yapmalarına ve süreci takip etmelerine yardımcı olur. Ajans عراب سوريا yönetimindedir. Ekiple bu sitede yayımlanan resmî iletişim kanalları üzerinden iletişime geçebilirsiniz.",
    questions: [
      {
        question: "HAMZA AGENCY içerik üreticilerine hangi hizmetleri sunar?",
        answer: "Ajans, programlar ve başvuru koşulları hakkında rehberlik, başvuru takibi, teknik ve idari destek sunar. Başvurmadan önce ilgili programın sayfasından hizmetleri ve koşulları inceleyin.",
        href: "/services",
        linkLabel: "İçerik üreticisi destek hizmetleri",
      },
      {
        question: "HAMZA AGENCY'ye nasıl başvurabilirim?",
        answer: "Programlar sayfasını açın, içeriğinize uygun programı seçin, koşullarını okuyun ve başvurunuzu gönderin. Başarılı gönderimden sonra gösterilen takip kodunu saklayarak başvuru durumunu kontrol edin. Gerektiğinde iletişim sayfası üzerinden ekibe ulaşın.",
        href: "/programs",
        linkLabel: "Programlar ve başvuru süreci",
      },
      {
        question: "TikTok programının başvuru koşullarını nerede bulabilirim?",
        answer: "TikTok sayfasında başvuru koşulları, sunulan destek ve HAMZA AGENCY üzerinden başvuru süreci açıklanır. İlgili programın ayrıntılarını okuyun; koşullar ve başvuru değerlendirme süreçleri platformlara göre farklılık gösterebilir.",
        href: "/programs/tiktok",
        linkLabel: "TikTok içerik üreticisi programı",
      },
      {
        question: "BIGO LIVE programına başvurabilir miyim?",
        answer: "Program koşullarını, takip hizmetlerini ve başvuru sürecini incelemek için BIGO LIVE sayfasını ziyaret edin. Her başvuru değerlendirilir. Koşulları karşılamak kesin kabul veya kazanç garantisi vermez.",
        href: "/programs/bigo-live",
        linkLabel: "BIGO LIVE içerik üreticisi programı",
      },
    ],
  },
};
