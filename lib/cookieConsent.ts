export const COOKIE_CONSENT_VERSION = "1.0";
export const COOKIE_CONSENT_STORAGE_KEY = "hamza_agency_cookie_consent";
export const COOKIE_CONSENT_UPDATED_EVENT = "hamza:cookie-consent-updated";

export type CookieConsentChoices = {
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
};

export type CookieConsentRecord = CookieConsentChoices & {
  version: string;
  necessary: true;
  recordedAt: string;
};

export const NECESSARY_ONLY_COOKIE_CONSENT: CookieConsentChoices = {
  analytics: false,
  preferences: false,
  marketing: false,
};

export const ACCEPT_ALL_COOKIE_CONSENT: CookieConsentChoices = {
  analytics: true,
  preferences: true,
  marketing: true,
};

export function readStoredCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) || "null"
    ) as CookieConsentRecord | null;

    return stored?.version === COOKIE_CONSENT_VERSION ? stored : null;
  } catch {
    return null;
  }
}

export function applyCookieConsentToDocument(
  consent: CookieConsentChoices
) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.consentAnalytics = String(
    consent.analytics
  );
  document.documentElement.dataset.consentPreferences = String(
    consent.preferences
  );
  document.documentElement.dataset.consentMarketing = String(
    consent.marketing
  );
}

function getAnonymousId() {
  const key = "hamza_agency_anonymous_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const value = window.crypto.randomUUID();
  window.localStorage.setItem(key, value);
  return value;
}

export function saveCookieConsent(
  choices: CookieConsentChoices
): CookieConsentRecord {
  const record: CookieConsentRecord = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    ...choices,
    recordedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(record)
  );
  document.cookie = `ha_consent=${encodeURIComponent(
    JSON.stringify(record)
  )}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  applyCookieConsentToDocument(record);
  window.dispatchEvent(
    new CustomEvent<CookieConsentRecord>(COOKIE_CONSENT_UPDATED_EVENT, {
      detail: record,
    })
  );

  void fetch("/api/product-expansion/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anonymousId: getAnonymousId(),
      consentVersion: COOKIE_CONSENT_VERSION,
      ...choices,
      region:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    }),
    keepalive: true,
  }).catch(() => undefined);

  return record;
}
