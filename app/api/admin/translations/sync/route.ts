import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getTranslationFieldNamesForSource,
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

type TranslationLanguage = "en" | "tr";
type SyncItem = { sourceType: TranslationSourceType; sourceId: string };
type AdminRow = { email?: string | null; role?: string | null; is_active?: boolean | null };

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

  return { client, adminEmail: admin.email?.trim() || user.email };
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

async function saveTranslation(
  client: SupabaseClient,
  source: TranslationSourceItem,
  language: TranslationLanguage,
  adminEmail: string
) {
  const translated = await translateArabicSource(source, language);
  const fields = getTranslationFieldNamesForSource(source.sourceType).filter((field) => {
    const value = source[field];
    return typeof value === "string" && value.trim().length > 0;
  });
  if (!fields.length) throw new Error("لا يحتوي هذا العنصر على حقول قابلة للحفظ.");

  const now = new Date().toISOString();
  const rows = fields.map((field) => ({
    source_type: source.sourceType,
    source_id: source.sourceId,
    field_name: field,
    language,
    translated_value: translated[field] || "",
    status: "needs_review",
    reviewed: false,
    is_published: false,
    created_by: adminEmail,
    updated_by: adminEmail,
    updated_at: now,
  }));

  const { error } = await client.from("content_translations").upsert(rows, {
    onConflict: "source_type,source_id,field_name,language",
  });
  if (error) throw new Error(`تعذر حفظ الترجمة: ${error.message}`);
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
    const { client, adminEmail } = await getAuthorizedClient(request);
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

    const results: Array<{ sourceType: TranslationSourceType; sourceId: string; languages: TranslationLanguage[] }> = [];
    const errors: Array<{ sourceType: TranslationSourceType; sourceId: string; message: string }> = [];

    for (const item of items) {
      try {
        const source = await loadSource(client, item);
        for (const language of languages) await saveTranslation(client, source, language, adminEmail);
        results.push({ sourceType: item.sourceType, sourceId: item.sourceId, languages });
      } catch (error) {
        errors.push({
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          message: error instanceof Error ? error.message : "تعذرت ترجمة هذا العنصر.",
        });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      results,
      errors,
      message: errors.length === 0
        ? "تمت ترجمة النصوص وحفظها للمراجعة. راجعها وانشرها يدوياً من لوحة الترجمات."
        : `تمت ترجمة ${results.length} عنصر وحفظها للمراجعة، وتعذر ${errors.length} عنصر.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تشغيل مزامنة الترجمة.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
