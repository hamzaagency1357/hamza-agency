import { createHash } from "node:crypto";
import {
  getTranslationFieldNamesForSource,
  type TranslationSourceItem,
} from "@/lib/i18n/translationSources";

export type TranslationRevisionSourceSnapshot = Record<string, string>;

export function createTranslationRevisionSourceSnapshot(
  source: TranslationSourceItem
): TranslationRevisionSourceSnapshot {
  const snapshot: TranslationRevisionSourceSnapshot = {};

  for (const field of getTranslationFieldNamesForSource(source.sourceType)) {
    const value = source[field];
    if (typeof value === "string" && value.trim()) {
      snapshot[field] = value.trim();
    }
  }

  if (!Object.keys(snapshot).length) {
    throw new Error("لا يحتوي هذا العنصر على حقول عربية قابلة لإنشاء Revision.");
  }

  return snapshot;
}

export function createTranslationRevisionSourceFingerprint(
  source: TranslationSourceItem,
  snapshot = createTranslationRevisionSourceSnapshot(source)
) {
  const fields = Object.keys(snapshot)
    .sort()
    .map((field) => [field, snapshot[field]]);

  return createHash("sha256")
    .update(
      JSON.stringify({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        sourceLocale: "ar",
        fields,
      })
    )
    .digest("hex");
}
