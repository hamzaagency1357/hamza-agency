/**
 * Only a canonical URL for this same localized article is permitted.
 * Missing, cross-origin, wrong-locale, query and fragment overrides all
 * fall back to the generated self-canonical URL.
 */
export function resolveBlogCanonical(value, fallback, siteUrl) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  try {
    const candidate = new URL(raw, siteUrl);
    const expected = new URL(fallback);
    if (candidate.origin !== expected.origin || candidate.pathname !== expected.pathname ||
        candidate.search || candidate.hash) return fallback;
    return candidate.toString();
  } catch {
    return fallback;
  }
}
