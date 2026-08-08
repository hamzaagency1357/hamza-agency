import "server-only";
import { FALLBACK_PUBLIC_WHATSAPP, getBaseWhatsAppHref, normalizeWhatsAppNumber } from "@/config/whatsapp";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SettingRow = { setting_key: string | null; setting_value: string | null };
const keys = ["primary_whatsapp", "support_whatsapp", "contact_email", "working_hours"] as const;

export type PublicContact = {
  whatsappNumber: string;
  whatsappHref: string;
  email: string;
  workingHours: string;
};

export async function getPublicContact(): Promise<PublicContact> {
  let rows: SettingRow[] = [];
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("settings").select("setting_key,setting_value").eq("is_public", true).in("setting_key", [...keys]);
    if (!error && data) rows = data as SettingRow[];
  }
  const value = (key: string) => rows.find((row) => row.setting_key === key)?.setting_value?.trim() || "";
  const whatsappNumber = normalizeWhatsAppNumber(value("primary_whatsapp") || value("support_whatsapp")) || FALLBACK_PUBLIC_WHATSAPP;
  return {
    whatsappNumber,
    whatsappHref: getBaseWhatsAppHref(whatsappNumber),
    email: value("contact_email"),
    workingHours: value("working_hours"),
  };
}
