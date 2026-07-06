import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getTranslationSourceDefinition,
  isTranslationSourceType,
  toTranslationSourceItem,
  type TranslationSourceItem,
  type TranslationSourceType,
} from "@/lib/i18n/translationSources";
import {
  getTranslationProviderModel,
  isTranslationProviderConfigured,
  translateArabicSource,
} from "@/lib/i18n/translationProvider";
import {
  createTranslationRevisionSourceFingerprint,
  createTranslationRevisionSourceSnapshot,
} from "@/lib/i18n/translationRevisionSource";

type TranslationLanguage = "en" | "tr";
type SyncItem = { sourceType: TranslationSourceType; sourceId: string };
type AdminRow = { email?: string | null; role?: string | null; is_active?: boolean | null };
type SourceRevisionRow = { id?: string | null };
type ExistingRevisionRow = { id?: string | null; workflow_status?: string | null };
type CandidateRpcRow = { translation_revision_id?: string | null; created?: boolean | null; workflow_status?: string | null };
type CandidateResult = { created: boolean; workflowStatus: string };

const MAX_ITEMS_PER_REQUEST = 10;

function getBearerToken(request: NextRequest) {
  const [scheme, token] = (request.headers.get("authorization") || "").split(" ");
  return scheme?.toLowerCase() === "bearer" && token?.trim() ? token.trim() : "";
}

function isTranslationLanguage(value: unknown): value is TranslationLanguage {
  return value === "en" || value === "tr";
}

function parseItems(value: unknown): SyncItem[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, SyncItem>();
  value.forEach((value) => {
    if (!value || typeof value !== "object") return;
    const item = value as { sourceType?: unknown; sourceId?: unknown };
    if (!isTranslationSourceType(item.sourceType)) return;
    if (typeof item.sourceId !== "string" && typeof item.sourceId !== "number") return;
    const sourceId = String(item.sourceId).trim();
    if (sourceId) unique.set(`${item.sourceType}:${sourceId}`, { sourceType: item.sourceType, sourceId });
  });
  return [...unique.values()].slice(0, MAX_ITEMS_PER_REQUEST);
}

function parseLanguages(value: unknown): TranslationLanguage[] | null {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isTranslationLanguage)) return null;
  return [...new Set(value)];
}

async function getAuthorizedClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = getBearerToken(request);
  if (!url || !anonKey) throw new Error("الاتصال بقاعدة البيانات غير مفعل.");
  if (!token) throw new Error("يلزم تسجيل دخول إداري لتشغيل الترجمة التلقائية.");

  const client = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: userError } = await client.auth.getUser(token);
  if (userError || !user?.email) throw new Error("جلسة الإدارة غير صالحة. سجّل الدخول من جديد.");

  const { data, error } = await client
    .from("admin_users")
    .select("email, role, is_active")
    .ilike("email", user.email)
    .maybeSingle();
  const admin = data as AdminRow | null;
  if (error || !admin || admin.is_active === false) throw new Error("لا تملك صلاحية تشغيل الترجمة التلقائية.");
  if (admin.role !== "super_admin" && admin.role !== "deputy_super_admin") {
    throw new Error("الترجمة التلقائية متاحة للإدارة العليا فقط.");
  }

  return client;
}

async function loadSource(client: SupabaseClient, item: SyncItem): Promise<TranslationSourceItem> {
  const definition = getTranslationSourceDefinition(item.sourceType);
  if (!definition) throw new Error("نوع المحتوى المطلوب غير مدعوم في الترجمة التلقائية.");

  const { data, error } = await client.from(definition.table).select("*").eq("id", item.sourceId).maybeSingle();
  if (error || !data) throw new Error("تعذر العثور على النص العربي الأصلي المطلوب.");

  const source = toTranslationSourceItem(item.sourceType, item.sourceId, data as Record<string, unknown>);
  if (!source) throw new Error("لا يحتوي هذا العنصر على نص قابل للترجمة.");
  return source;
}

async function findCurrentRevision(
  client: SupabaseClient,
  source: TranslationSourceItem,
  language: TranslationLanguage,
  fingerprint: string
) {
  const { data: sourceRevision, error: sourceError } = await client
    .from("translation_source_revisions")
    .select("id")
    .eq("source_type", source.sourceType)
    .eq("source_id", source.sourceId)
    .eq("source_fingerprint", fingerprint)
    .maybeSingle();

  if (sourceError) throw new Error(`تعذر التحقق من Revision الحالي: ${sourceError.message}`);
  const sourceRevisionId = (sourceRevision as SourceRevisionRow | null)?.id;
  if (!sourceRevisionId) return null;

  const { data, error } = await client
    .from("content_translation_revisions")
    .select("id, workflow_status")
    .eq("source_revision_id", sourceRevisionId)
    .eq("language", language)
    .eq("is_stale", false)
    .in("workflow_status", ["draft", "needs_review", "reviewed", "published"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`تعذر التحقق من Draft الحالي: ${error.message}`);
  const revision = data as ExistingRevisionRow | null;
  return revision?.id ? revision : null;
}

async function createCandidateTranslation(
  client: SupabaseClient,
  source: TranslationSourceItem,
  language: TranslationLanguage
): Promise<CandidateResult> {
  const sourceSnapshot = createTranslationRevisionSourceSnapshot(source);
  const sourceFingerprint = createTranslationRevisionSourceFingerprint(source, sourceSnapshot);
  const existing = await findCurrentRevision(client, source, language, sourceFingerprint);

  // A current draft or published revision is never overwritten by a later batch.
  if (existing) {
    return { created: false, workflowStatus: existing.workflow_status || "needs_review" };
  }

  const translated = await translateArabicSource(source, language);
  const translatedRecord = translated as Record<string, string | undefined>;
  const translatedFields = Object.fromEntries(
    Object.keys(sourceSnapshot).map((field) => [field, translatedRecord[field]?.trim() || ""])
  );

  const { data, error } = await client.rpc("create_translation_candidate_draft", {
    p_source_type: source.sourceType,
    p_source_id: source.sourceId,
    p_language: language,
    p_source_fingerprint: sourceFingerprint,
    p_source_snapshot: sourceSnapshot,
    p_translated_fields: translatedFields,
  });

  if (error) throw new Error(`تعذر إنشاء Candidate Revision: ${error.message}`);
  const rpcRow = Array.isArray(data) ? (data[0] as CandidateRpcRow | undefined) : undefined;
  if (!rpcRow?.translation_revision_id) throw new Error("لم تُرجع قاعدة البيانات Candidate Revision صالحاً.");

  return {
    created: rpcRow.created === true,
    workflowStatus: rpcRow.workflow_status || "needs_review",
  };
}

export async function GET(request: NextRequest) {
  try {
    await getAuthorizedClient(request);
    return NextResponse.json({
      ok: true,
      configured: isTranslationProviderConfigured(),
      model: getTranslationProviderModel(),
      maxItemsPerRequest: MAX_ITEMS_PER_REQUEST,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر التحقق من حالة الترجمة التلقائية.";
    return NextResponse.json({ ok: false, message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await getAuthorizedClient(request);
    if (!isTranslationProviderConfigured()) {
      return NextResponse.json({
        ok: false,
        message: "الترجمة التلقائية غير مفعلة بعد. أضف GEMINI_API_KEY في Vercel أولاً.",
      }, { status: 503 });
    }

    const body = (await request.json().catch(() => ({}))) as { items?: unknown; languages?: unknown };
    const items = parseItems(body.items);
    const languages = parseLanguages(body.languages);
    if (!items.length) return NextResponse.json({ ok: false, message: "اختر عنصراً واحداً على الأقل للترجمة." }, { status: 400 });
    if (!languages) return NextResponse.json({ ok: false, message: "اختر لغة هدف صريحة: الإنجليزية أو التركية." }, { status: 400 });

    const results: Array<{
      sourceType: TranslationSourceType;
      sourceId: string;
      languages: TranslationLanguage[];
      createdLanguages: TranslationLanguage[];
      retainedLanguages: TranslationLanguage[];
    }> = [];
    const errors: Array<{ sourceType: TranslationSourceType; sourceId: string; message: string }> = [];

    for (const item of items) {
      try {
        const source = await loadSource(client, item);
        const createdLanguages: TranslationLanguage[] = [];
        const retainedLanguages: TranslationLanguage[] = [];

        for (const language of languages) {
          const candidate = await createCandidateTranslation(client, source, language);
          if (candidate.created) createdLanguages.push(language);
          else retainedLanguages.push(language);
        }

        results.push({ sourceType: item.sourceType, sourceId: item.sourceId, languages, createdLanguages, retainedLanguages });
      } catch (error) {
        errors.push({
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          message: error instanceof Error ? error.message : "تعذرت ترجمة هذا العنصر.",
        });
      }
    }

    const createdCount = results.reduce((count, result) => count + result.createdLanguages.length, 0);
    const retainedCount = results.reduce((count, result) => count + result.retainedLanguages.length, 0);
    const successMessage = retainedCount
      ? `تم إنشاء ${createdCount} Candidate Revision جديد، وتم الاحتفاظ بـ ${retainedCount} Draft أو نسخة منشورة مطابقة بدون الكتابة فوقها.`
      : `تم إنشاء ${createdCount} Candidate Revision بحالة تحتاج مراجعة. لا يظهر أي محتوى للعامة قبل النشر اليدوي.`;

    return NextResponse.json({
      ok: errors.length === 0,
      results,
      errors,
      message: errors.length === 0
        ? successMessage
        : `اكتملت ${results.length} عناصر، وتعذر ${errors.length} عنصر. لا يتم الكتابة فوق أي Draft أو نسخة منشورة موجودة.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تشغيل مزامنة الترجمة.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
