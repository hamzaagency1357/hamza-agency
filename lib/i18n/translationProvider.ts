import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getTranslationFieldNamesForSource,
  type TranslationFieldName,
  type TranslationSourceItem,
} from "@/lib/i18n/translationSources";

type TranslatedFields = Partial<Record<TranslationFieldName, string>>;
type GeminiPayload = {
  output_text?: unknown;
  error?: { message?: string };
};

const MAX_SOURCE_FIELD_LENGTH = 12000;
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const GEMINI_INTERACTIONS_URL = [
  "https://generativelanguage.googleapis.com",
  "v1beta",
  "interactions",
].join("/");
const GEMINI_API_KEY_HEADER = ["x-goog-", "api-key"].join("");

export function isTranslationProviderConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getTranslationProviderModel() {
  return process.env.TRANSLATION_GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function getTargetLanguageName(language: Exclude<SiteLanguage, "ar">) {
  return language === "en" ? "English" : "Turkish";
}

function parseObject(value: string): Record<string, unknown> {
  const normalized = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("لم تُرجع خدمة الترجمة نتيجة JSON صالحة.");
  }

  const parsed: unknown = JSON.parse(normalized.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("صيغة نتيجة الترجمة غير صالحة.");
  }
  return parsed as Record<string, unknown>;
}

export async function translateArabicSource(
  source: TranslationSourceItem,
  targetLanguage: Exclude<SiteLanguage, "ar">
): Promise<TranslatedFields> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("الترجمة التلقائية غير مفعلة بعد. أضف GEMINI_API_KEY في Vercel أولاً.");
  }

  const fieldNames = getTranslationFieldNamesForSource(source.sourceType);
  const sourcePayload = fieldNames.reduce((payload, field) => {
    payload[field] = (source[field] || "").trim().slice(0, MAX_SOURCE_FIELD_LENGTH);
    return payload;
  }, {} as Record<TranslationFieldName, string>);

  const schema = {
    type: "object",
    properties: Object.fromEntries(fieldNames.map((field) => [field, { type: "string" }])),
    required: fieldNames,
    additionalProperties: false,
  };

  const prompt = [
    "You are the translation engine for HAMZA AGENCY, a professional content-creator agency.",
    `Translate the Arabic source fields into ${getTargetLanguageName(targetLanguage)}.`,
    "Keep brand names, program names, URLs, phone numbers, codes, hashtags, variables, and line breaks unchanged unless a standard localized form is clearly required.",
    "Do not add explanations, warnings, markdown fences, or extra fields.",
    "Return an empty string for every empty source field.",
    JSON.stringify(sourcePayload),
  ].join("\n\n");

  const response = await fetch(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: {
      [GEMINI_API_KEY_HEADER]: apiKey,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: getTranslationProviderModel(),
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema,
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as GeminiPayload;
  if (!response.ok) {
    throw new Error(`تعذر تشغيل خدمة الترجمة: ${payload.error?.message || `HTTP ${response.status}`}`);
  }

  if (typeof payload.output_text !== "string" || !payload.output_text.trim()) {
    throw new Error("لم تُرجع خدمة الترجمة أي نص.");
  }

  const translated = parseObject(payload.output_text);
  return fieldNames.reduce((result, field) => {
    const value = translated[field];
    result[field] = sourcePayload[field] && typeof value === "string" ? value.trim() : "";
    return result;
  }, {} as TranslatedFields);
}
