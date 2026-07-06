import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getTranslationFieldNamesForSource,
  type TranslationFieldName,
  type TranslationSourceItem,
} from "@/lib/i18n/translationSources";

type TranslatedFields = Partial<Record<TranslationFieldName, string>>;
type GeminiContent = { type?: unknown; text?: unknown };
type GeminiStep = { type?: unknown; content?: GeminiContent[] };
type GeminiPayload = { output_text?: unknown; steps?: GeminiStep[]; error?: { message?: string } };

const MAX_SOURCE_FIELD_LENGTH = 12000;
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const MAX_GEMINI_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 6000;
const GEMINI_INTERACTIONS_URL = ["https://generativelanguage.googleapis.com", "v1beta", "interactions"].join("/");
const GEMINI_API_KEY_HEADER = ["x-goog-", "api-key"].join("");

export function isTranslationProviderConfigured() { return Boolean(process.env.GEMINI_API_KEY?.trim()); }
export function getTranslationProviderModel() { return process.env.TRANSLATION_GEMINI_MODEL?.trim() || DEFAULT_MODEL; }

function getTargetLanguageName(language: Exclude<SiteLanguage, "ar">) { return language === "en" ? "English" : "Turkish"; }
function extractOutputText(payload: GeminiPayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  return (payload.steps || []).filter((step) => step.type === "model_output").flatMap((step) => step.content || []).map((content) => typeof content.text === "string" ? content.text : "").filter(Boolean).join("\n").trim();
}
function parseObject(value: string): Record<string, unknown> {
  const normalized = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("لم تُرجع خدمة الترجمة نتيجة JSON صالحة.");
  const parsed: unknown = JSON.parse(normalized.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("صيغة نتيجة الترجمة غير صالحة.");
  return parsed as Record<string, unknown>;
}
function wait(milliseconds: number) { return new Promise<void>((resolve) => setTimeout(resolve, milliseconds)); }
function retryAfterMs(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.round(seconds * 1000), RETRY_MAX_DELAY_MS);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.min(Math.max(0, date - Date.now()), RETRY_MAX_DELAY_MS);
}
function retryDelay(attempt: number, retryAfter: number | null) {
  if (retryAfter !== null) return retryAfter;
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1) + Math.floor(Math.random() * 250), RETRY_MAX_DELAY_MS);
}
function isTemporaryFailure(status: number, message: string) {
  return status === 408 || status === 429 || status >= 500 || /high demand|rate limit|too many requests|temporar(?:y|ily)|unavailable|overloaded|resource exhausted/i.test(message);
}
function temporaryFailureMessage() { return `خدمة Gemini مشغولة مؤقتاً. تمت إعادة المحاولة تلقائياً حتى ${MAX_GEMINI_ATTEMPTS} مرات، لكن العنصر لم يكتمل. أعد تشغيل العناصر الفاشلة فقط بعد دقائق.`; }

export async function translateArabicSource(source: TranslationSourceItem, targetLanguage: Exclude<SiteLanguage, "ar">): Promise<TranslatedFields> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("الترجمة التلقائية غير مفعلة بعد. أضف GEMINI_API_KEY في Vercel أولاً.");

  const fieldNames = getTranslationFieldNamesForSource(source.sourceType);
  const sourcePayload = fieldNames.reduce((payload, field) => {
    payload[field] = (source[field] || "").trim().slice(0, MAX_SOURCE_FIELD_LENGTH);
    return payload;
  }, {} as Record<TranslationFieldName, string>);
  const schema = { type: "object", properties: Object.fromEntries(fieldNames.map((field) => [field, { type: "string" }])), required: fieldNames, additionalProperties: false };
  const prompt = [
    "You are the translation engine for HAMZA AGENCY, a professional content-creator agency.",
    `Translate the Arabic source fields into ${getTargetLanguageName(targetLanguage)}.`,
    "Keep brand names, program names, URLs, phone numbers, codes, hashtags, variables, and line breaks unchanged unless a standard localized form is clearly required.",
    "Do not add explanations, warnings, markdown fences, or extra fields.",
    "Return an empty string for every empty source field.",
    JSON.stringify(sourcePayload),
  ].join("\n\n");

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(GEMINI_INTERACTIONS_URL, {
        method: "POST",
        headers: { [GEMINI_API_KEY_HEADER]: apiKey, "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ model: getTranslationProviderModel(), store: false, input: prompt, response_format: { type: "text", mime_type: "application/json", schema } }),
      });
    } catch (error) {
      if (attempt < MAX_GEMINI_ATTEMPTS) { await wait(retryDelay(attempt, null)); continue; }
      throw new Error(`${temporaryFailureMessage()}${error instanceof Error && error.message ? ` (${error.message})` : ""}`);
    }

    const retryAfter = retryAfterMs(response.headers.get("retry-after"));
    const payload = (await response.json().catch(() => ({}))) as GeminiPayload;
    if (!response.ok) {
      const providerMessage = payload.error?.message || `HTTP ${response.status}`;
      if (isTemporaryFailure(response.status, providerMessage) && attempt < MAX_GEMINI_ATTEMPTS) { await wait(retryDelay(attempt, retryAfter)); continue; }
      if (isTemporaryFailure(response.status, providerMessage)) throw new Error(`${temporaryFailureMessage()} (${providerMessage})`);
      throw new Error(`تعذر تشغيل خدمة الترجمة: ${providerMessage}`);
    }

    const output = extractOutputText(payload);
    if (!output) throw new Error("لم تُرجع خدمة الترجمة أي نص.");
    const translated = parseObject(output);
    return fieldNames.reduce((result, field) => {
      const value = translated[field];
      result[field] = sourcePayload[field] && typeof value === "string" ? value.trim() : "";
      return result;
    }, {} as TranslatedFields);
  }

  throw new Error(temporaryFailureMessage());
}
