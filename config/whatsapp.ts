/** HAMZA AGENCY — single fallback for public WhatsApp links. */
export const FALLBACK_PUBLIC_WHATSAPP = "905011730377";

export const WHATSAPP_CONFIG = {
  number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || FALLBACK_PUBLIC_WHATSAPP,
  defaultMessage:
    process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_MESSAGE?.trim() ||
    "Hello, I'm contacting HAMZA AGENCY.",
  baseUrl: "https://wa.me",
} as const;

export const WHATSAPP_MESSAGES = {
  general: "Hello, I'm interested in learning more about HAMZA AGENCY.",
  services: "Hello, I'd like to know more about HAMZA AGENCY services.",
  quote: "Hello, I'd like to request a quote.",
  collaboration: "Hello, I'm interested in collaborating with HAMZA AGENCY.",
  support: "Hello, I need support with my request.",
  influencer: "Hello, I'm a content creator and I'd like to join HAMZA AGENCY.",
  brand: "Hello, I'm a brand looking for creator services.",
  enterprise: "Hello, I'm interested in business solutions.",
} as const;

export type WhatsAppMessageKey = keyof typeof WHATSAPP_MESSAGES;

export function normalizeWhatsAppNumber(value: string | null | undefined) {
  return (value || "").replace(/[^\d]/g, "");
}

export function buildWhatsAppUrl(
  message?: string | WhatsAppMessageKey,
  number?: string | null
): string {
  const phone = normalizeWhatsAppNumber(number) || normalizeWhatsAppNumber(WHATSAPP_CONFIG.number) || FALLBACK_PUBLIC_WHATSAPP;
  const resolvedMessage =
    (message && message in WHATSAPP_MESSAGES
      ? WHATSAPP_MESSAGES[message as WhatsAppMessageKey]
      : message) || WHATSAPP_CONFIG.defaultMessage;
  return `${WHATSAPP_CONFIG.baseUrl}/${phone}?text=${encodeURIComponent(resolvedMessage)}`;
}

export function getBaseWhatsAppHref(number?: string | null): string {
  const phone = normalizeWhatsAppNumber(number) || normalizeWhatsAppNumber(WHATSAPP_CONFIG.number) || FALLBACK_PUBLIC_WHATSAPP;
  return `${WHATSAPP_CONFIG.baseUrl}/${phone}`;
}

export function openWhatsApp(message?: string | WhatsAppMessageKey): void {
  if (typeof window === "undefined") return;
  window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
}
