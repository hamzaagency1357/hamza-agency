"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteLanguage } from "@/lib/i18n/locale";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type ProgramDetailTranslationField =
  | "title"
  | "summary"
  | "content"
  | "requirements"
  | "benefits"
  | "updates"
  | "faq";

export type ProgramDetailTranslations = Partial<Record<ProgramDetailTranslationField, string>>;

type TranslationRow = {
  field_name: ProgramDetailTranslationField | null;
  translated_value: string | null;
};

const requiredFields: ProgramDetailTranslationField[] = [
  "title",
  "summary",
  "content",
  "requirements",
  "benefits",
  "updates",
  "faq",
];

function getCurrentProgramSlug() {
  if (typeof window === "undefined") return "";
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

export function usePublishedProgramDetailsTranslation(
  sourceId: number | null | undefined,
  language: SiteLanguage
) {
  const [translations, setTranslations] = useState<ProgramDetailTranslations>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setTranslations({});
    setIsLoading(false);

    async function load() {
      if (language === "ar" || !isSupabaseConfigured || !supabase) return;

      const slug = getCurrentProgramSlug();
      if (!slug) return;

      setIsLoading(true);
      const { data: sourceProgram, error: sourceError } = await supabase
        .from("programs")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!active) return;

      const canonicalSourceId = sourceProgram?.id;
      if (sourceError || !canonicalSourceId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("content_translations")
        .select("field_name, translated_value")
        .eq("source_type", "programs")
        .eq("source_id", String(canonicalSourceId))
        .eq("language", language)
        .eq("is_published", true)
        .in("status", ["published", "reviewed"])
        .in("field_name", requiredFields);

      if (!active) return;

      if (!error && data) {
        const next = (data as TranslationRow[]).reduce((result, row) => {
          if (row.field_name && row.translated_value?.trim()) {
            result[row.field_name] = row.translated_value.trim();
          }
          return result;
        }, {} as ProgramDetailTranslations);
        setTranslations(next);
      }

      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [sourceId, language]);

  const isComplete = useMemo(
    () => language !== "ar" && requiredFields.every((field) => Boolean(translations[field]?.trim())),
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