import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getTranslationFieldNamesForSource,
  type TranslationFieldName,
  type TranslationSourceItem,
} from "@/lib/i18n/translationSources";

type TranslatedFields = Partial<Record<TranslationFieldName, string>>;

type GeminiResponsePayload = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const MAX_SOURCE_FIELD_LENGTH = 12000;
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

export function isTranslationProviderConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getTranslationProviderModel() {
  return process.env.TRANSLATION_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function cleanSourceText(value: string) {
  return value.trim().slice(0, MAX_SOURCE_FIELD_LENGTH);
}

function getTargetLanguageName(language: Exclude<SiteLanguage, "ar">) {
  return language === "en" ? "English" : "Turkish";
}

function extractOutputText(payload: GeminiResponsePayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks = (payload.output || []).flatMap((item) =>
    (item.content || [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .filter(Boolean)
  );

  return chunks.join("\n").trim();
}

function parseJsonObject(value: string): Record<string, unknown> {
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

function readTranslatedField(payload: Record<string, unknown>, field: TranslationFieldName): string {
  const value = payload[field];
  return typeof value === "string" ? value.trim() : "";
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
    payload[field] = cleanSourceText(source[field] || "");
    return payload;
  }, {} as Record<TranslationFieldName, string>);

  const responseSchema = {
    type: "object",
    properties: Object.fromEntries(fieldNames.map((field) => [field, { type: "string" }])),
    required: fieldNames,
    additionalProperties: false,
  };
  const targetLanguageName = getTargetLanguageName(targetLanguage);
  const prompt = [
    "You are the translation engine for HAMZA AGENCY, a professional content-creator agency.",
    `Translate the Arabic source fields into ${targetLanguageName}.`,
    "Keep brand names, program names, URLs, phone numbers, codes, hashtags, variables, and line breaks unchanged unless a standard localized form is clearly required.",
    "Do not add explanations, warnings, markdown fences, or extra fields.",
    "Return an empty string for every empty source field.",
    JSON.stringify(sourcePayload),
  ].join("\n\n");

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: getTranslationProviderModel(),
      store: false,
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: responseSchema,
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as GeminiResponsePayload;
  if (!response.ok) {
    const detail = payload.error?.message || `HTTP ${response.status}`;
    throw new Error(`تعذر تشغيل خدمة الترجمة: ${detail}`);
  }

  const output = extractOutputText(payload);
  if (!output) {
    throw new Error("لم تُرجع خدمة الترجمة أي نص.");
  }

  const translated = parseJsonObject(output);
  return fieldNames.reduce((result, field) => {
    result[field] = sourcePayload[field] ? readTranslatedField(translated, field) : "";
    return result;
  }, {} as TranslatedFields);
}
