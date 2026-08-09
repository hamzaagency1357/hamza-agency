import type { SiteLanguage } from "@/lib/i18n/locale";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type LocalizedIdentityText = Record<SiteLanguage, string>;
export type PublicIdentity = {
  agencyName: LocalizedIdentityText;
  agentReadableName: LocalizedIdentityText;
  agentDecoratedAr: string;
  agentRoleLine: LocalizedIdentityText;
  agentLead: LocalizedIdentityText;
  agentManagementCopy: LocalizedIdentityText;
  agentAboutCopy: LocalizedIdentityText;
  agentSeoTitle: LocalizedIdentityText;
  agentSeoDescription: LocalizedIdentityText;
};

export const PUBLIC_IDENTITY_SETTING_KEYS = {
  agencyName: { ar: "agency_name_ar", en: "agency_name_en", tr: "agency_name_tr" },
  agentReadableName: { ar: "agent_name_ar_readable", en: "agent_name_en", tr: "agent_name_tr" },
  agentDecoratedAr: "agent_name_ar_decorated",
  agentRoleLine: { ar: "agent_role_ar", en: "agent_role_en", tr: "agent_role_tr" },
  agentLead: { ar: "agent_lead_ar", en: "agent_lead_en", tr: "agent_lead_tr" },
  agentManagementCopy: { ar: "agent_management_ar", en: "agent_management_en", tr: "agent_management_tr" },
  agentAboutCopy: { ar: "agent_about_ar", en: "agent_about_en", tr: "agent_about_tr" },
  agentSeoTitle: { ar: "agent_seo_title_ar", en: "agent_seo_title_en", tr: "agent_seo_title_tr" },
  agentSeoDescription: { ar: "agent_seo_description_ar", en: "agent_seo_description_en", tr: "agent_seo_description_tr" },
} as const;

export const DEFAULT_PUBLIC_IDENTITY: PublicIdentity = {
  agencyName: { ar: "وكالة حمزة", en: "HAMZA AGENCY", tr: "Hamza Ajansı" },
  agentReadableName: { ar: "عراب سوريا", en: "Godfather of Syria", tr: "Suriye'nin Vaftiz Babası" },
  agentDecoratedAr: "⚔عܓོراب✴سܓོوريا⚔",
  agentRoleLine: { ar: "الوكيل والمدير في", en: "Agent and Manager at", tr: "Temsilci ve Yönetici" },
  agentLead: {
    ar: "ويُعد الوكيل ⚔عܓོراب✴سܓོوريا⚔ من أبرز الوكلاء وأكثرهم أمانًا واحترافية على مستوى العالم، بفضل خبرته الواسعة ونهجه القائم على الثقة والخصوصية والمتابعة الدقيقة.",
    en: "The Godfather of Syria is considered one of the most prominent, safest, and most professional agents worldwide, thanks to his extensive experience and an approach built on trust, privacy, and precise follow-up.",
    tr: "Suriye'nin Vaftiz Babası, geniş deneyimi ve güven, gizlilik ve titiz takibe dayalı yaklaşımı sayesinde dünya çapında en önde gelen, en güvenli ve en profesyonel temsilcilerden biri olarak kabul edilir.",
  },
  agentManagementCopy: {
    ar: "HAMZA AGENCY بإدارة الوكيل عراب سوريا، مع متابعة منظمة لمسارات البرامج وصناع المحتوى والخدمات المرتبطة بالوكالة.",
    en: "HAMZA AGENCY is managed by the Godfather of Syria, with organized follow-up for programs, creators, and agency-related services.",
    tr: "HAMZA AGENCY, Suriye'nin Vaftiz Babası yönetiminde programlar, içerik üreticileri ve ajansla ilgili hizmetler için düzenli takip sağlar.",
  },
  agentAboutCopy: {
    ar: "يجمع عراب سوريا بين الخبرة الواسعة، الخصوصية، المتابعة الدقيقة، وفهم متطلبات برامج البث المباشر وصناع المحتوى.",
    en: "The Godfather of Syria combines extensive experience, privacy, precise follow-up, and a strong understanding of live-streaming programs and creator requirements.",
    tr: "Suriye'nin Vaftiz Babası; geniş deneyimi, gizliliği, titiz takibi ve canlı yayın programları ile içerik üreticisi gerekliliklerine ilişkin güçlü bilgiyi bir araya getirir.",
  },
  agentSeoTitle: {
    ar: "عراب سوريا | الوكيل والمدير في HAMZA AGENCY",
    en: "Godfather of Syria | Agent and Manager at HAMZA AGENCY",
    tr: "Suriye'nin Vaftiz Babası | HAMZA AGENCY Temsilcisi ve Yöneticisi",
  },
  agentSeoDescription: {
    ar: "HAMZA AGENCY بإدارة الوكيل عراب سوريا، أحد أبرز وأكثر الوكلاء أمانًا واحترافية على مستوى العالم في إدارة ودعم وتطوير صناع المحتوى وبرامج البث المباشر.",
    en: "HAMZA AGENCY, managed by the Godfather of Syria, one of the most prominent, safest, and most professional agents worldwide in managing, supporting, and developing content creators and live-streaming programs.",
    tr: "HAMZA AGENCY, içerik üreticileri ve canlı yayın programlarının yönetimi, desteği ve geliştirilmesinde dünya çapında en önde gelen, en güvenli ve en profesyonel temsilcilerden biri olan Suriye'nin Vaftiz Babası tarafından yönetilmektedir.",
  },
};

type SettingRow = { setting_key: string | null; setting_value: string | null };
const languages: SiteLanguage[] = ["ar", "en", "tr"];
const allKeys = [
  ...Object.values(PUBLIC_IDENTITY_SETTING_KEYS.agencyName),
  ...Object.values(PUBLIC_IDENTITY_SETTING_KEYS.agentReadableName),
  PUBLIC_IDENTITY_SETTING_KEYS.agentDecoratedAr,
  ...Object.values(PUBLIC_IDENTITY_SETTING_KEYS.agentRoleLine),
  ...Object.values(PUBLIC_IDENTITY_SETTING_KEYS.agentLead),
  ...Object.values(PUBLIC_IDENTITY_SETTING_KEYS.agentManagementCopy),
  ...Object.values(PUBLIC_IDENTITY_SETTING_KEYS.agentAboutCopy),
  ...Object.values(PUBLIC_IDENTITY_SETTING_KEYS.agentSeoTitle),
  ...Object.values(PUBLIC_IDENTITY_SETTING_KEYS.agentSeoDescription),
];

export const PUBLIC_IDENTITY_KEYS = allKeys;

function localizedValue(rows: Map<string, string>, keys: Record<SiteLanguage, string>, fallback: LocalizedIdentityText): LocalizedIdentityText {
  return Object.fromEntries(languages.map((language) => [language, rows.get(keys[language])?.trim() || fallback[language]])) as LocalizedIdentityText;
}

export async function getPublicIdentity(): Promise<PublicIdentity> {
  if (!isSupabaseConfigured || !supabase) return DEFAULT_PUBLIC_IDENTITY;
  try {
    const { data, error } = await supabase.from("settings").select("setting_key,setting_value").eq("is_public", true).in("setting_key", allKeys);
    if (error || !data) return DEFAULT_PUBLIC_IDENTITY;
    const rows = new Map((data as SettingRow[]).flatMap((row) => row.setting_key && row.setting_value ? [[row.setting_key, row.setting_value] as const] : []));
    return {
      agencyName: localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agencyName, DEFAULT_PUBLIC_IDENTITY.agencyName),
      agentReadableName: localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentReadableName, DEFAULT_PUBLIC_IDENTITY.agentReadableName),
      agentDecoratedAr: rows.get(PUBLIC_IDENTITY_SETTING_KEYS.agentDecoratedAr)?.trim() || DEFAULT_PUBLIC_IDENTITY.agentDecoratedAr,
      agentRoleLine: localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentRoleLine, DEFAULT_PUBLIC_IDENTITY.agentRoleLine),
      agentLead: localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentLead, DEFAULT_PUBLIC_IDENTITY.agentLead),
      agentManagementCopy: localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentManagementCopy, DEFAULT_PUBLIC_IDENTITY.agentManagementCopy),
      agentAboutCopy: localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentAboutCopy, DEFAULT_PUBLIC_IDENTITY.agentAboutCopy),
      agentSeoTitle: localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentSeoTitle, DEFAULT_PUBLIC_IDENTITY.agentSeoTitle),
      agentSeoDescription: localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentSeoDescription, DEFAULT_PUBLIC_IDENTITY.agentSeoDescription),
    };
  } catch {
    return DEFAULT_PUBLIC_IDENTITY;
  }
}

function replaceApprovedIdentityTokens(value: string, language: SiteLanguage, identity: PublicIdentity, decorated = false) {
  const defaultAgency = DEFAULT_PUBLIC_IDENTITY.agencyName[language];
  const defaultReadable = DEFAULT_PUBLIC_IDENTITY.agentReadableName[language];
  let output = value.replaceAll(defaultAgency, identity.agencyName[language]).replaceAll(defaultReadable, identity.agentReadableName[language]);
  if (language !== "en") output = output.replaceAll("HAMZA AGENCY", identity.agencyName[language]);
  if (decorated && language === "ar") output = output.replaceAll(DEFAULT_PUBLIC_IDENTITY.agentDecoratedAr, identity.agentDecoratedAr);
  return output;
}

export function getResolvedAgentCopy(identity: PublicIdentity, language: SiteLanguage) {
  return {
    lead: replaceApprovedIdentityTokens(identity.agentLead[language], language, identity, true),
    management: replaceApprovedIdentityTokens(identity.agentManagementCopy[language], language, identity),
    about: replaceApprovedIdentityTokens(identity.agentAboutCopy[language], language, identity),
    seoTitle: replaceApprovedIdentityTokens(identity.agentSeoTitle[language], language, identity),
    seoDescription: replaceApprovedIdentityTokens(identity.agentSeoDescription[language], language, identity),
  };
}

export function getFooterIdentity(identity: PublicIdentity, language: SiteLanguage) {
  if (language === "ar") return `${identity.agencyName.ar} — بإدارة الوكيل ${identity.agentDecoratedAr}`;
  if (language === "tr") return `${identity.agencyName.tr} — ${identity.agentReadableName.tr} yönetiminde`;
  const agency = identity.agencyName.en === DEFAULT_PUBLIC_IDENTITY.agencyName.en ? "Hamza Agency" : identity.agencyName.en;
  return `${agency} — Managed by ${identity.agentReadableName.en}`;
}
