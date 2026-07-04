"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type KnowledgeCenterStaticUiProps = {
  articleCount: number;
  categoryCount: number;
  cleanWhatsapp: string;
};

const copy = {
  ar: {
    articleLabel: "مقال وإرشاد",
    categoryLabel: "تصنيف",
    whatsappHeading: "واتساب",
    whatsappLabel: "متابعة عند الحاجة",
    helpTitle: "هل تحتاج مساعدة مباشرة؟",
    helpDescription: "يمكنك التواصل مع فريق وكالة حمزة عبر واتساب عند الحاجة إلى توضيح إضافي.",
    contactCta: "صفحة التواصل",
    whatsappCta: "واتساب",
    whatsappMessage: "مرحباً، أريد الاستفسار من مركز المعرفة في وكالة حمزة.",
  },
  en: {
    articleLabel: "Articles and guides",
    categoryLabel: "Categories",
    whatsappHeading: "WhatsApp",
    whatsappLabel: "Follow-up when needed",
    helpTitle: "Need direct help?",
    helpDescription: "Contact the HAMZA AGENCY team on WhatsApp when you need additional clarification.",
    contactCta: "Contact page",
    whatsappCta: "WhatsApp",
    whatsappMessage: "Hello, I would like to ask about the HAMZA AGENCY Knowledge Center.",
  },
  tr: {
    articleLabel: "Makale ve rehber",
    categoryLabel: "Kategori",
    whatsappHeading: "WhatsApp",
    whatsappLabel: "Gerektiğinde takip",
    helpTitle: "Doğrudan yardıma mı ihtiyacınız var?",
    helpDescription: "Ek açıklamaya ihtiyacınız olduğunda HAMZA AGENCY ekibiyle WhatsApp üzerinden iletişime geçebilirsiniz.",
    contactCta: "İletişim sayfası",
    whatsappCta: "WhatsApp",
    whatsappMessage: "Merhaba, HAMZA AGENCY Bilgi Merkezi hakkında bilgi almak istiyorum.",
  },
};

export default function KnowledgeCenterStaticUi({ articleCount, categoryCount, cleanWhatsapp }: KnowledgeCenterStaticUiProps) {
  const language = useSiteLanguage();
  const text = copy[language];

  return (
    <>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
          <div className="text-3xl font-black text-purple-200">{articleCount}</div>
          <div className="mt-2 text-sm text-white/60">{text.articleLabel}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
          <div className="text-3xl font-black text-yellow-200">{categoryCount}</div>
          <div className="mt-2 text-sm text-white/60">{text.categoryLabel}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
          <div className="text-3xl font-black text-green-200">{text.whatsappHeading}</div>
          <div className="mt-2 text-sm text-white/60">{text.whatsappLabel}</div>
        </div>
      </div>

      <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
        <h2 className="text-3xl font-black">{text.helpTitle}</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{text.helpDescription}</p>
        <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/contact" className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black">
            {text.contactCta}
          </Link>
          <a href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(text.whatsappMessage)}`} target="_blank" className="rounded-full bg-green-500 px-7 py-4 font-black text-white">
            {text.whatsappCta}
          </a>
        </div>
      </div>
    </>
  );
}
