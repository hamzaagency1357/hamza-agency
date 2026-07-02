"use client";

import { supabase } from "@/lib/supabase";
import type { TranslationSourceType } from "@/lib/i18n/translationSources";

type SyncItem = {
  sourceType: TranslationSourceType;
  sourceId: string;
};

type SyncResult = {
  sourceType: TranslationSourceType;
  sourceId: string;
  languages: string[];
};

type SyncResponse = {
  ok: boolean;
  message?: string;
  results?: SyncResult[];
  errors?: Array<{ sourceType: string; sourceId: string; message: string }>;
};

type TranslationTargetLanguage = "en" | "tr";

type SyncOptions = {
  languages: TranslationTargetLanguage[];
};

async function getAccessToken() {
  if (!supabase) {
    throw new Error("الاتصال بقاعدة البيانات غير مفعل.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("انتهت جلسة الإدارة. سجّل الدخول من جديد.");
  }

  return session.access_token;
}

export async function syncArabicContentTranslations(
  items: SyncItem[],
  options: SyncOptions
): Promise<SyncResponse> {
  if (items.length === 0) {
    return { ok: true, results: [] };
  }

  if (!Array.isArray(options.languages) || options.languages.length === 0) {
    throw new Error("اختر لغة هدف صريحة قبل تشغيل الترجمة.");
  }

  const accessToken = await getAccessToken();
  const response = await fetch("/api/admin/translations/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items,
      languages: options.languages,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as SyncResponse;
  if (!response.ok) {
    throw new Error(payload.message || "تعذرت مزامنة الترجمات التلقائية.");
  }

  return payload;
}

export async function getTranslationAutomationStatus() {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/admin/translations/sync", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    configured?: boolean;
    model?: string;
    message?: string;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || "تعذر قراءة حالة الترجمة التلقائية.");
  }

  return {
    configured: payload.configured === true,
    model: payload.model || "",
  };
}
