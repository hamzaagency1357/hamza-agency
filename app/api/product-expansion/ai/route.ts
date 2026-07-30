import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { buildRuleBasedAnswer, stableEventKey, type KnowledgeDocument } from "@/lib/productExpansion/providerAdapters";
import { getServerTenantRuntime } from "@/lib/productExpansion/serverTenantRuntime";
import { callPr101OidcGateway } from "@/lib/server/pr101OidcGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 8192;
const allowedSurfaces = new Set(["public", "creator", "client", "employee", "partner", "admin"]);

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function authenticated(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!bearer || !url || !key) return false;
  try {
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${bearer}` }, cache: "no-store", signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch { return false; }
}

async function loadKnowledge(tenantId: string, locale: "ar" | "en" | "tr"): Promise<KnowledgeDocument[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const query = new URLSearchParams({ select: "id,title,answer,language,status,is_active", tenant_id: `eq.${tenantId}`, status: "eq.published", is_active: "eq.true", limit: "100" });
  try {
    const response = await fetch(`${url}/rest/v1/knowledge_base?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(3500) });
    if (!response.ok) return [];
    const value = await response.json() as unknown;
    return Array.isArray(value) ? value.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const row = item as Record<string, unknown>;
      const language = row.language === "en" || row.language === "tr" ? row.language : "ar";
      if (language !== locale) return [];
      return [{ id: String(row.id), title: String(row.title ?? ""), content: String(row.answer ?? ""), locale: language, tenantId }];
    }) : [];
  } catch { return []; }
}

export async function POST(request: NextRequest) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return json(413, { ok: false, code: "payload_too_large" });
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return json(400, { ok: false, code: "invalid_request" });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return json(400, { ok: false, code: "invalid_request" }); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json(400, { ok: false, code: "invalid_request" });
  const input = parsed as Record<string, unknown>;
  const question = typeof input.question === "string" ? input.question.trim().slice(0, 4000) : "";
  const locale = input.locale === "en" || input.locale === "tr" ? input.locale : "ar";
  const surface = typeof input.surface === "string" && allowedSurfaces.has(input.surface) ? input.surface : "public";
  if (!question || input.consent !== true) return json(400, { ok: false, code: input.consent === true ? "invalid_question" : "ai_consent_required" });
  if (surface === "admin" && !(await authenticated(request))) return json(401, { ok: false, code: "authentication_required" });

  const tenant = await getServerTenantRuntime();
  if (!tenant.id) return json(503, { ok: false, code: "tenant_unavailable" });
  const documents = await loadKnowledge(tenant.id, locale);
  const result = buildRuleBasedAnswer(question, documents, tenant.id, locale);
  const hostname = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "hamza-agency.com").split(",")[0].trim().toLowerCase();
  const eventKey = stableEventKey([tenant.id, surface, result.code, result.data?.sourceIds.join(","), question.slice(0, 120)]);
  void callPr101OidcGateway(request, "provider_event_enqueue", {
    tenantId: tenant.id,
    hostname,
    providerType: "ai",
    providerKey: "rules",
    eventKey,
    payload: { surface, code: result.code, escalated: result.data?.escalated === true, piiDetected: result.data?.piiDetected === true, sourceIds: result.data?.sourceIds ?? [] },
  }).catch(() => undefined);
  return json(result.ok ? 200 : 400, { ok: result.ok, code: result.code, answer: result.data?.answer ?? "", sourceIds: result.data?.sourceIds ?? [], escalated: result.data?.escalated ?? true, provider: "rules", retention: "redacted_event_only" });
}
