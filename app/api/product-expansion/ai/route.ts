import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { buildRuleBasedAnswer, stableEventKey, type KnowledgeDocument } from "@/lib/productExpansion/providerAdapters";
import { getServerTenantRuntime } from "@/lib/productExpansion/serverTenantRuntime";
import { callPr101OidcGateway } from "@/lib/server/pr101OidcGateway";
import { supabaseRestAsUser, verifySupabaseBearer, type VerifiedSupabaseUser } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 8192;
const allowedSurfaces = new Set(["public", "creator", "client", "employee", "partner", "admin"]);

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function firstRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : null;
  return row && typeof row === "object" && !Array.isArray(row) ? row as Record<string, unknown> : null;
}

async function authorizeSurface(user: VerifiedSupabaseUser, tenantId: string, surface: string) {
  const membership = firstRow((await supabaseRestAsUser<unknown>(
    `/tenant_memberships?select=role,status&tenant_id=eq.${tenantId}&user_id=eq.${user.id}&status=eq.active&limit=20`,
    user,
  )).data);
  const role = typeof membership?.role === "string" ? membership.role : "";
  if (surface === "admin") return ["super_admin", "tenant_admin", "employee"].includes(role);
  return role === surface;
}

async function loadKnowledge(tenantId: string, locale: "ar" | "en" | "tr"): Promise<KnowledgeDocument[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const query = new URLSearchParams({
    select: "id,title,content,excerpt,status,is_public,is_published,is_visible,metadata",
    tenant_id: `eq.${tenantId}`,
    status: "eq.published",
    is_public: "eq.true",
    limit: "100",
  });
  try {
    const response = await fetch(`${url}/rest/v1/knowledge_base?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return [];
    const value = await response.json() as unknown;
    return Array.isArray(value) ? value.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const row = item as Record<string, unknown>;
      const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {};
      const documentLocale = metadata.locale === "en" || metadata.locale === "tr" ? metadata.locale : "ar";
      if (documentLocale !== locale) return [];
      const content = typeof row.content === "string" && row.content.trim() ? row.content : typeof row.excerpt === "string" ? row.excerpt : "";
      if (!content) return [];
      return [{ id: String(row.id), title: String(row.title ?? ""), content, locale: documentLocale, tenantId }];
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

  const tenant = await getServerTenantRuntime();
  if (!tenant.id) return json(503, { ok: false, code: "tenant_unavailable" });
  const verifiedUser = surface === "public" ? null : await verifySupabaseBearer(request);
  if (surface !== "public" && !verifiedUser) return json(401, { ok: false, code: "authentication_required" });
  if (verifiedUser && !(await authorizeSurface(verifiedUser, tenant.id, surface))) return json(403, { ok: false, code: "surface_role_denied" });

  const documents = await loadKnowledge(tenant.id, locale);
  const result = buildRuleBasedAnswer(question, documents, tenant.id, locale);
  const hostname = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "hamza-agency.com").split(",")[0].trim().toLowerCase();
  const eventKey = stableEventKey([tenant.id, verifiedUser?.id ?? "anonymous", surface, result.code, result.data?.sourceIds.join(","), question.slice(0, 120)]);
  void callPr101OidcGateway(request, "provider_event_enqueue", {
    tenantId: tenant.id,
    hostname,
    providerType: "ai",
    providerKey: "rules",
    eventKey,
    payload: { surface, userId: verifiedUser?.id ?? null, code: result.code, escalated: result.data?.escalated === true, piiDetected: result.data?.piiDetected === true, sourceIds: result.data?.sourceIds ?? [] },
  }).catch(() => undefined);
  return json(result.ok ? 200 : 400, { ok: result.ok, code: result.code, answer: result.data?.answer ?? "", sourceIds: result.data?.sourceIds ?? [], escalated: result.data?.escalated ?? true, provider: "rules", retention: "redacted_event_only" });
}
