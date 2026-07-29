import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;
const MAX_QUESTION_LENGTH = 1_200;
const KNOWLEDGE_CACHE_MS = 60_000;

type KnowledgeRow = { id?: string | number | null; title?: string | null; summary?: string | null; content?: string | null; category?: string | null };
type CachedKnowledge = { expiresAt: number; rows: KnowledgeRow[] };

const BUILT_IN_KNOWLEDGE: KnowledgeRow[] = [
  { id: "programs", title: "البرامج المتاحة", summary: "وكالة حمزة تدير برامج ومنصات متعددة لصناع المحتوى.", content: "يمكنك الاطلاع على البرامج من صفحة البرامج. المنصات الحالية تشمل TikTok وBIGO LIVE وYaahlan وXena وCatchii.", category: "برامج" },
  { id: "apply", title: "طريقة الانضمام", summary: "الانضمام يتم عبر نموذج طلب الانضمام الرسمي.", content: "افتح صفحة البرنامج المناسب، املأ البيانات بدقة، ثم احتفظ برقم التتبع الذي يظهر بعد الإرسال لمتابعة حالة الطلب.", category: "انضمام" },
  { id: "services", title: "طلب خدمة رقمية", summary: "يمكن إرسال طلب خدمة رقمية من صفحة طلب الخدمة.", content: "بعد إرسال طلب الخدمة تحصل على كود متابعة يمكنك استخدامه لمعرفة الحالة.", category: "خدمات" },
  { id: "tracking", title: "تتبع الطلبات", summary: "يمكن تتبع طلب الانضمام أو طلب الخدمة.", content: "استخدم رقم التتبع الذي ظهر بعد إرسال طلب الانضمام أو طلب الخدمة في صفحة التتبع المناسبة. لا يتم البحث العام برقم واتساب.", category: "تتبع" },
  { id: "whatsapp", title: "التواصل الرسمي", summary: "واتساب هو المسار الرسمي للحالات الخاصة.", content: "لا يطلب الدعم الذكي كلمات مرور أو رموز تحقق. الحالات الإدارية الخاصة تُحوّل إلى واتساب الرسمي.", category: "تواصل" },
];

let knowledgeCache: CachedKnowledge | null = null;

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function normalize(value: string) { return value.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^؀-ۿ\w\s]/g, " ").replace(/\s+/g, " ").trim(); }
function tokens(value: string) { return normalize(value).split(" ").filter((token) => token.length >= 3).slice(0, 40); }
function pick(question: string, rows: KnowledgeRow[]) {
  const questionTokens = tokens(question);
  const ranked = rows.map((row) => ({ row, score: questionTokens.reduce((score, token) => normalize([row.title, row.summary, row.content, row.category].filter(Boolean).join(" ")).includes(token) ? score + 1 : score, 0) })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0 ? ranked[0].row : null;
}
function failure(status: number, message = "تعذر معالجة الطلب حالياً. يرجى المحاولة لاحقاً.") { return NextResponse.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } }); }
function fingerprint(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 320) || "unknown";
  return createHash("sha256").update(`${forwarded}|${userAgent}`).digest("hex");
}
async function loadKnowledge(url: string | undefined, key: string | undefined) {
  if (knowledgeCache && knowledgeCache.expiresAt > Date.now()) return knowledgeCache.rows;
  if (!url || !key) return BUILT_IN_KNOWLEDGE;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await client.from("knowledge_base").select("id,title,summary,content,category").eq("is_published", true).limit(120);
  const rows = error || !data?.length ? BUILT_IN_KNOWLEDGE : [...(data as KnowledgeRow[]), ...BUILT_IN_KNOWLEDGE];
  knowledgeCache = { expiresAt: Date.now() + KNOWLEDGE_CACHE_MS, rows };
  return rows;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) return failure(413);
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return failure(413);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return failure(400);
    body = parsed as Record<string, unknown>;
  } catch { return failure(400); }

  const question = clean(body.question);
  if (question.length < 3 || question.length > MAX_QUESTION_LENGTH) return failure(400, "اكتب سؤالاً واضحاً ضمن الحد المسموح قبل الإرسال.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const guard = await client.rpc("pr100_guard_ai_answer", { p_identity: fingerprint(request), p_payload: { question } });
    if (guard.error) return failure(503);
    if (!guard.data || guard.data.allowed !== true) return failure(429);
  }

  const knowledge = pick(question, await loadKnowledge(url, key));
  if (!knowledge) return NextResponse.json({ ok: true, answer: "لم أجد إجابة مؤكدة داخل قاعدة المعرفة الحالية. للحالات المستعجلة تواصل عبر واتساب الرسمي.", status: "unanswered", source: "unanswered", escalated: true }, { headers: { "Cache-Control": "no-store" } });

  const content = clean(knowledge.content) || clean(knowledge.summary) || clean(knowledge.title);
  return NextResponse.json({ ok: true, answer: content.length > 900 ? `${content.slice(0, 900)}...` : content, status: "answered", source: clean(knowledge.category) || "knowledge_base", escalated: false }, { headers: { "Cache-Control": "no-store" } });
}
