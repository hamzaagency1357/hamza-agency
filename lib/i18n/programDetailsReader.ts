"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
} from "@/lib/i18n/publishedTranslations";

export const PROGRAM_DETAIL_TRANSLATION_FIELDS = [
  "title",
  "summary",
  "content",
  "requirements",
  "benefits",
  "updates",
  "faq",
] as const;

export type ProgramDetailTranslationField = (typeof PROGRAM_DETAIL_TRANSLATION_FIELDS)[number];
export type ProgramDetailTranslations = Partial<Record<ProgramDetailTranslationField, string>>;

export function usePublishedProgramDetailsTranslation(
  sourceId: number | null | undefined,
  language: SiteLanguage
) {
  const [translations, setTranslations] = useState<ProgramDetailTranslations>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;
    setTranslations({});
    setIsLoading(false);

    async function loadTranslations() {
      if (language === "ar" || !sourceId) return;

      setIsLoading(true);
      const translationMap = await readPublishedTranslations({
        sourceType: "programs",
        language,
        sourceIds: [sourceId],
        fields: PROGRAM_DETAIL_TRANSLATION_FIELDS,
      });

      if (!isActive) return;

      setTranslations(translationMap[String(sourceId)] || {});
      setIsLoading(false);
    }

    void loadTranslations();

    return () => {
      isActive = false;
    };
  }, [language, sourceId]);

  const isComplete = useMemo(
    () => language !== "ar" && hasCompletePublishedTranslation(translations, PROGRAM_DETAIL_TRANSLATION_FIELDS),
    [language, translations]
  );

  return { translations, isComplete, isLoading };
}

export type ProgramDetailsCopy = {
  back: string;
  refreshing: string;
  available: string;
  limited: string;
  paused: string;
  join: string;
  requirements: string;
  benefits: string;
  updates: string;
  faq: string;
  close: string;
  formTitle: string;
  fullName: string;
  country: string;
  whatsapp: string;
  experience: string;
  experienceDescription: string;
  experiencePlaceholder: string;
  notes: string;
  required: string;
  duplicate: string;
  databaseUnavailable: string;
  submitError: string;
  submitSuccess: string;
  submitting: string;
  submit: string;
  whatsappCta: string;
};

export const programDetailsCopy: Record<SiteLanguage, ProgramDetailsCopy> = {
  ar: { back: "← العودة إلى البرامج", refreshing: "تحديث بيانات البرنامج...", available: "متاح الآن", limited: "قبول محدود", paused: "متوقف مؤقتاً", join: "انضم الآن", requirements: "شروط القبول", benefits: "ماذا تقدم وكالة حمزة؟", updates: "آخر التحديثات", faq: "الأسئلة الشائعة", close: "إغلاق", formTitle: "طلب الانضمام إلى", fullName: "الاسم الثلاثي", country: "الدولة", whatsapp: "رقم واتساب", experience: "خبرات سابقة", experienceDescription: "هل عملت على برامج أو وكالات أخرى سابقاً؟", experiencePlaceholder: "اكتب خبراتك السابقة إن وجدت", notes: "ملاحظات إضافية", required: "يرجى تعبئة الحقول الأساسية.", duplicate: "تم إرسال طلب سابق بنفس رقم الواتساب وهذا البرنامج.", databaseUnavailable: "الاتصال بقاعدة البيانات غير مفعل حالياً.", submitError: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.", submitSuccess: "تم استلام طلبك بنجاح. سيقوم فريق الوكالة بمراجعة الطلب وقد يتم التواصل معك عبر واتساب.", submitting: "جارٍ الإرسال...", submit: "إرسال الطلب", whatsappCta: "واتساب" },
  en: { back: "← Back to programs", refreshing: "Refreshing program details...", available: "Available now", limited: "Limited spots", paused: "Temporarily paused", join: "Join now", requirements: "Requirements", benefits: "What HAMZA AGENCY offers", updates: "Latest updates", faq: "Frequently asked questions", close: "Close", formTitle: "Apply to join", fullName: "Full name", country: "Country", whatsapp: "WhatsApp number", experience: "Previous experience", experienceDescription: "Have you worked with other programs or agencies before?", experiencePlaceholder: "Write any previous experience you have", notes: "Additional notes", required: "Please complete the required fields.", duplicate: "A request was already sent for this WhatsApp number and program.", databaseUnavailable: "Database connection is not available right now.", submitError: "Something went wrong while sending your application. Please try again.", submitSuccess: "Your application was received successfully. Our team will review it and may contact you through WhatsApp.", submitting: "Submitting...", submit: "Submit application", whatsappCta: "WhatsApp" },
  tr: { back: "← Programlara dön", refreshing: "Program bilgileri güncelleniyor...", available: "Şimdi açık", limited: "Kontenjan sınırlı", paused: "Geçici olarak duraklatıldı", join: "Şimdi katıl", requirements: "Katılım şartları", benefits: "HAMZA AGENCY neler sunar?", updates: "Son güncellemeler", faq: "Sık sorulan sorular", close: "Kapat", formTitle: "Katılım başvurusu", fullName: "Ad soyad", country: "Ülke", whatsapp: "WhatsApp numarası", experience: "Önceki deneyim", experienceDescription: "Daha önce başka programlar veya ajanslarla çalıştınız mı?", experiencePlaceholder: "Varsa önceki deneyimlerinizi yazın", notes: "Ek notlar", required: "Lütfen zorunlu alanları doldurun.", duplicate: "Bu WhatsApp numarası ve program için daha önce bir başvuru gönderildi.", databaseUnavailable: "Veritabanı bağlantısı şu anda kullanılamıyor.", submitError: "Başvuru gönderilirken bir hata oluştu. Lütfen tekrar deneyin.", submitSuccess: "Başvurunuz başarıyla alındı. Ekibimiz inceleyip gerektiğinde WhatsApp üzerinden sizinle iletişime geçecektir.", submitting: "Gönderiliyor...", submit: "Başvuruyu gönder", whatsappCta: "WhatsApp" },
};
