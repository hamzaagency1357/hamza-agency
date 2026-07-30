import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type ProviderMode = "disabled" | "mock" | "sandbox" | "live";
export type ProviderKind = "whatsapp" | "push" | "ai" | "payment";

export type ProviderResult<T = Record<string, unknown>> = {
  ok: boolean;
  provider: string;
  mode: ProviderMode;
  code: string;
  data?: T;
};

export type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  locale: "ar" | "en" | "tr";
  tenantId: string;
};

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const trackingPattern = /\b(?:APP|SR|JOB|CNT)-\d{4}-[A-F0-9]{10}\b/g;
const injectionPatterns = [
  /ignore\s+(?:all|any|the)?\s*(?:previous|prior|system)\s+instructions?/i,
  /reveal\s+(?:the\s+)?(?:system|developer)\s+prompt/i,
  /bypass\s+(?:security|policy|authorization)/i,
  /نفذ\s+التعليمات\s+المخفية/i,
  /تجاهل\s+التعليمات\s+السابقة/i,
];

export function stableEventKey(parts: Array<string | number | null | undefined>): string {
  return createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("|"), "utf8")
    .digest("hex");
}

export function redactPii(input: string): { text: string; piiDetected: boolean } {
  let detected = false;
  const replace = (pattern: RegExp, label: string, value: string) =>
    value.replace(pattern, () => {
      detected = true;
      return `[${label}]`;
    });
  let text = replace(emailPattern, "EMAIL_REDACTED", input);
  text = replace(phonePattern, "PHONE_REDACTED", text);
  text = replace(trackingPattern, "TRACKING_REDACTED", text);
  return { text, piiDetected: detected };
}

export function detectsPromptInjection(input: string): boolean {
  return injectionPatterns.some((pattern) => pattern.test(input));
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

export function retrieveKnowledge(
  query: string,
  documents: KnowledgeDocument[],
  tenantId: string,
  locale: "ar" | "en" | "tr",
  limit = 4
): KnowledgeDocument[] {
  const queryTokens = tokenize(query);
  return documents
    .filter((document) => document.tenantId === tenantId && document.locale === locale)
    .map((document) => {
      const documentTokens = tokenize(`${document.title} ${document.content}`);
      const overlap = [...queryTokens].filter((token) => documentTokens.has(token)).length;
      return { document, score: overlap / Math.max(queryTokens.size, 1) };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 8)))
    .map((candidate) => candidate.document);
}

export function buildRuleBasedAnswer(
  query: string,
  documents: KnowledgeDocument[],
  tenantId: string,
  locale: "ar" | "en" | "tr"
): ProviderResult<{ answer: string; sourceIds: string[]; escalated: boolean; piiDetected: boolean }> {
  const redacted = redactPii(query.slice(0, 4000));
  if (detectsPromptInjection(redacted.text)) {
    return {
      ok: false,
      provider: "rules",
      mode: "mock",
      code: "prompt_injection_rejected",
      data: { answer: "", sourceIds: [], escalated: true, piiDetected: redacted.piiDetected },
    };
  }
  const sources = retrieveKnowledge(redacted.text, documents, tenantId, locale);
  const fallback = {
    ar: "لم أجد إجابة مؤكدة ضمن المحتوى المسموح. تم تجهيز الطلب للتصعيد إلى فريق الدعم.",
    en: "I could not find a verified answer in the allowed knowledge base. The request is ready for human support escalation.",
    tr: "İzin verilen bilgi tabanında doğrulanmış bir yanıt bulamadım. Talep insan desteğine aktarılmaya hazır.",
  }[locale];
  if (!sources.length) {
    return {
      ok: true,
      provider: "rules",
      mode: "mock",
      code: "human_escalation_required",
      data: { answer: fallback, sourceIds: [], escalated: true, piiDetected: redacted.piiDetected },
    };
  }
  const answer = sources
    .map((source) => `${source.title}: ${source.content.slice(0, 700)}`)
    .join("\n\n")
    .slice(0, 2400);
  return {
    ok: true,
    provider: "rules",
    mode: "mock",
    code: "answered_from_tenant_knowledge",
    data: { answer, sourceIds: sources.map((source) => source.id), escalated: false, piiDetected: redacted.piiDetected },
  };
}

export function validateWhatsAppTemplate(
  body: string,
  allowedVariables: string[],
  provided: Record<string, string>
): { ok: boolean; rendered?: string; code: string } {
  const variables = [...body.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((match) => match[1]);
  if (variables.some((variable) => !allowedVariables.includes(variable))) return { ok: false, code: "template_variable_not_allowed" };
  if (variables.some((variable) => typeof provided[variable] !== "string" || !provided[variable].trim())) return { ok: false, code: "template_variable_missing" };
  const rendered = variables.reduce((current, variable) => current.replaceAll(`{{${variable}}}`, provided[variable].trim()), body);
  if (rendered.length > 4096) return { ok: false, code: "template_too_large" };
  return { ok: true, rendered, code: "template_valid" };
}

export function safePushPayload(input: { title: string; body: string; href?: string; sensitive?: boolean }) {
  const sensitive = input.sensitive === true;
  return {
    title: input.title.slice(0, 80),
    body: sensitive ? "لديك تحديث جديد داخل منصة HAMZA AGENCY." : input.body.slice(0, 160),
    href: input.href && input.href.startsWith("/") ? input.href.slice(0, 300) : "/portal",
    sensitive,
  };
}

export function verifySignedWebhook(rawBody: string, signature: string, secret: string): boolean {
  if (!rawBody || !secret || !/^(?:sha256=)?[a-f0-9]{64}$/i.test(signature)) return false;
  const supplied = signature.replace(/^sha256=/i, "").toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

export function providerDisabled(kind: ProviderKind, provider = "none"): ProviderResult {
  return { ok: false, provider, mode: "disabled", code: `${kind}_provider_disabled` };
}

export function retentionDeadline(days: number, now = new Date()): string {
  const bounded = Math.max(1, Math.min(Math.trunc(days), 365));
  return new Date(now.getTime() + bounded * 86_400_000).toISOString();
}
