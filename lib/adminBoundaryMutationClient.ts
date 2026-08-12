"use client";

import { supabase } from "@/lib/supabase";

type BoundaryError = { message: string };
export type BoundaryResult<T = unknown> = { data: T | null; error: BoundaryError | null };

async function accessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function adminBoundaryMutation<T = Record<string, unknown>>(action: string, payload: Record<string, unknown>): Promise<BoundaryResult<T>> {
  const token = await accessToken();
  if (!token) return { data: null, error: { message: "انتهت جلسة الإدارة. سجّل الدخول مجددًا." } };
  try {
    const response = await fetch("/api/admin/mutations/entities", {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const value = await response.json().catch(() => null) as { data?: T; message?: string } | null;
    if (!response.ok) return { data: null, error: { message: value?.message || "تعذر حفظ التغيير الإداري." } };
    return { data: value?.data ?? null, error: null };
  } catch {
    return { data: null, error: { message: "تعذر الاتصال بخدمة الحفظ الإداري." } };
  }
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export async function adminStorageMutation<T = Record<string, unknown>>(action: string, args: unknown[]): Promise<BoundaryResult<T>> {
  const normalized: unknown[] = [];
  for (const arg of args) {
    if (arg instanceof Blob) {
      if (arg.size > 8 * 1024 * 1024) return { data: null, error: { message: "حجم الملف أكبر من الحد المسموح للحفظ الآمن." } };
      normalized.push({ __file: true, name: arg instanceof File ? arg.name : "upload.bin", type: arg.type || "application/octet-stream", size: arg.size, base64: encodeBase64(new Uint8Array(await arg.arrayBuffer())) });
    } else normalized.push(arg);
  }
  return adminBoundaryMutation<T>(action, { args: normalized });
}
