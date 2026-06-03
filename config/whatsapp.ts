/**
 * ─────────────────────────────────────────────────────────────
 * HAMZA AGENCY — WhatsApp Global Configuration
 * ─────────────────────────────────────────────────────────────
 * Centralized WhatsApp config.
 * Import `openWhatsApp()` anywhere to open a pre-filled chat.
 *
 * Usage:
 *   import { openWhatsApp, WHATSAPP_CONFIG } from "@/config/whatsapp";
 *   openWhatsApp(); // Opens with default message
 *   openWhatsApp("I'd like a quote for social media management.");
 * ─────────────────────────────────────────────────────────────
 */

// ─── Configuration ───────────────────────────────────────────

export const WHATSAPP_CONFIG = {
  // WhatsApp Business number from env (international format, no + or spaces)
  number:
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "971501234567",

  // Default greeting message
  defaultMessage:
    process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_MESSAGE ||
    "Hello, I'm interested in your services.",

  // Base WhatsApp API URL
  baseUrl: "https://wa.me",
} as const;

// ─── Preset Messages ─────────────────────────────────────────
// Ready-to-use messages for different CTAs on the site.

export const WHATSAPP_MESSAGES = {
  general: "Hello, I'm interested in learning more about Hamza Agency.",
  services: "Hello, I'd like to know more about your services and pricing.",
  quote: "Hello, I'd like to request a custom quote.",
  collaboration: "Hello, I'm interested in collaborating with Hamza Agency.",
  support: "Hello, I need support with my account.",
  // Phase 2+ specific messages
  influencer: "Hello, I'm a content creator and I'd like to join your platform.",
  brand: "Hello, I'm a brand looking for influencer marketing services.",
  enterprise: "Hello, I'm interested in enterprise solutions for my company.",
} as const;

export type WhatsAppMessageKey = keyof typeof WHATSAPP_MESSAGES;

// ─── Utility Functions ───────────────────────────────────────

/**
 * Build a WhatsApp deep-link URL.
 * @param message - Custom message or key from WHATSAPP_MESSAGES
 * @param number  - Override the default WhatsApp number
 */
export function buildWhatsAppUrl(
  message?: string | WhatsAppMessageKey,
  number?: string
): string {
  const phone = number || WHATSAPP_CONFIG.number;

  // Resolve message: check if it's a preset key, otherwise use as-is
  const resolvedMessage =
    (message && message in WHATSAPP_MESSAGES
      ? WHATSAPP_MESSAGES[message as WhatsAppMessageKey]
      : message) || WHATSAPP_CONFIG.defaultMessage;

  const encodedMessage = encodeURIComponent(resolvedMessage);
  return `${WHATSAPP_CONFIG.baseUrl}/${phone}?text=${encodedMessage}`;
}

/**
 * Open WhatsApp in a new browser tab.
 * Safe to call from any client-side event handler.
 * @param message - Custom message or key from WHATSAPP_MESSAGES
 */
export function openWhatsApp(message?: string | WhatsAppMessageKey): void {
  if (typeof window === "undefined") return; // Guard for SSR
  const url = buildWhatsAppUrl(message);
  window.open(url, "_blank", "noopener,noreferrer");
}
