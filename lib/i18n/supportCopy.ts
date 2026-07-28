import type { SiteLanguage } from "@/lib/i18n/locale";

export const APPROVED_SUPPORT_COPY: Record<SiteLanguage, string> = {
  ar: "نستقبل رسائلكم وطلباتكم على مدار الساعة، وسيتم الرد عليكم في أقرب وقت ممكن.",
  en: "We receive your messages and requests around the clock and will respond as soon as possible.",
  tr: "Mesajlarınızı ve taleplerinizi günün her saati alıyor ve en kısa sürede yanıtlıyoruz.",
};

const LEGACY_SUPPORT_COPY = new Set([
  "تتم المتابعة حسب توفر فريق الوكالة وضغط الطلبات",
  "فريقنا متواجد لمتابعة طلباتكم ورسائلكم، وسيتم الرد عليكم في أقرب فرصة ممكنة.",
  "Follow-up depends on team availability and current request volume.",
  "Follow-up depends on team availability and request volume",
  "Takip, ekibin uygunluğuna ve mevcut talep yoğunluğuna göre yapılır.",
  "Takip süresi ekip uygunluğuna ve talep yoğunluğuna göre değişir",
  ...Object.values(APPROVED_SUPPORT_COPY),
]);

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/[.!؟]$/, "");
}

const NORMALIZED_SUPPORT_COPY = new Set(
  Array.from(LEGACY_SUPPORT_COPY, normalize)
);

export function getApprovedSupportCopy(language: SiteLanguage) {
  return APPROVED_SUPPORT_COPY[language];
}

export function localizeSupportMechanismCopy(
  value: string,
  language: SiteLanguage
) {
  return NORMALIZED_SUPPORT_COPY.has(normalize(value))
    ? APPROVED_SUPPORT_COPY[language]
    : value;
}
