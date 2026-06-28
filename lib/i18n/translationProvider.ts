import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getTranslationFieldNamesForSource,
  type TranslationFieldName,
  type TranslationSourceItem,
} from "@/lib/i18n/translationSources";

type TranslatedFields = Partial<Record<TranslationFieldName, string>>;

type OpenAIResponsePayload = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
    }>;
  }>;
};

const MAX_SOURCE_FIELD_LENGTH = 12000;

export function isTranslationProviderConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function cleanSourceText(value: string) {
  return value.trim().slice(0, MAX_SOURCE_FIELD_LENGTH);
}

function getTargetLanguageName(language: Exclude<SiteLanguage, "ar">) {
  return language === "en" ? "English" : "Turkish";
}

function extractOutputText(payload: OpenAIResponsePayload): string {
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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("الترجمة التلقائية غير مفعلة بعد. أضف OPENAI_API_KEY في Vercel أولاً.");
  }

  const fieldNames = getTranslationFieldNamesForSource(source.sourceType);
  const sourcePayload = fieldNames.reduce((payload, field) => {
    payload[field] = cleanSourceText(source[field] || "");
    return payload;
  }, {} as Record<TranslationFieldName, string>);

  const model = process.env.TRANSLATION_OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const targetLanguageName = getTargetLanguageName(targetLanguage);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model,
      input: [
        "You are the translation engine for HAMZA AGENCY, a professional content-creator agency.",
        `Translate the Arabic source fields into ${targetLanguageName}.`,
        "Keep brand names, program names, URLs, phone numbers, codes, hashtags, variables, and line breaks unchanged unless a standard localized form is clearly required.",
        "Do not add explanations, warnings, markdown fences, or extra fields.",
        `Return exactly one JSON object with these string keys: ${fieldNames.join(", ")}. Return an empty string for every empty source field.`,
        JSON.stringify(sourcePayload),
      ].join("\n\n"),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponsePayload & {
    error?: { message?: string };
  };

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
