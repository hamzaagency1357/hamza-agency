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

const lockedAgentName: LocalizedIdentityText = { ar: "عراب سوريا", en: "عراب سوريا", tr: "عراب سوريا" };
const lockedAgencyName: LocalizedIdentityText = { ar: "وكالة حمزة", en: "HAMZA AGENCY", tr: "HAMZA AGENCY" };
const legacyEnglishAgent = ["Agent", "Hamza"].join(" ");
const legacyTurkishAgent = ["Temsilci", "Hamza"].join(" ");
const legacyTurkishAgency = ["Hamza", "Ajansı"].join(" ");

export const DEFAULT_PUBLIC_IDENTITY: PublicIdentity = {
  agencyName: lockedAgencyName,
  agentReadableName: lockedAgentName,
  agentDecoratedAr: "⚔عܓོراب✴سܓོوريا⚔",
  agentRoleLine: { ar: "الوكيل والمدير في HAMZA AGENCY", en: "Agent and Manager at HAMZA AGENCY", tr: "HAMZA AGENCY temsilcisi ve yöneticisi" },
  agentLead: {
    ar: "يتولى عراب سوريا إدارة ومتابعة مسارات صناع المحتوى وبرامج البث المباشر ضمن HAMZA AGENCY، مع التركيز على الخصوصية والمتابعة المهنية.",
    en: "عراب سوريا manages creator and live-streaming program follow-up at HAMZA AGENCY with a focus on privacy and professional support.",
    tr: "عراب سوريا, HAMZA AGENCY bünyesinde içerik üreticileri ve canlı yayın programlarının takibini gizlilik ve profesyonel destek odağıyla yürütür.",
  },
  agentManagementCopy: {
    ar: "HAMZA AGENCY بإدارة الوكيل عراب سوريا، مع متابعة منظمة لمسارات البرامج وصناع المحتوى والخدمات المرتبطة بالوكالة.",
    en: "HAMZA AGENCY is managed by عراب سوريا, with organized follow-up for programs, creators, and agency-related services.",
    tr: "HAMZA AGENCY, عراب سوريا yönetiminde programlar, içerik üreticileri ve ajansla ilgili hizmetler için düzenli takip sağlar.",
  },
  agentAboutCopy: {
    ar: "يجمع عراب سوريا بين الخبرة، الخصوصية، المتابعة الدقيقة، وفهم متطلبات برامج البث المباشر وصناع المحتوى.",
    en: "عراب سوريا combines experience, privacy, careful follow-up, and an understanding of live-streaming programs and creator requirements.",
    tr: "عراب سوريا; deneyimi, gizliliği, titiz takibi ve canlı yayın programları ile içerik üreticisi gerekliliklerine ilişkin bilgiyi bir araya getirir.",
  },
  agentSeoTitle: {
    ar: "عراب سوريا | الوكيل والمدير في HAMZA AGENCY",
    en: "عراب سوريا | Agent and Manager at HAMZA AGENCY",
    tr: "عراب سوريا | HAMZA AGENCY Temsilcisi ve Yöneticisi",
  },
  agentSeoDescription: {
    ar: "HAMZA AGENCY بإدارة الوكيل عراب سوريا، مع دعم وتطوير ومتابعة مهنية لصناع المحتوى وبرامج البث المباشر.",
    en: "HAMZA AGENCY is managed by عراب سوريا, with professional support, development, privacy, and follow-up for content creators and live-streaming programs.",
    tr: "HAMZA AGENCY, içerik üreticileri ve canlı yayın programları için profesyonel destek, gelişim, gizlilik ve takip sunan عراب سوريا tarafından yönetilmektedir.",
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

function cleanLegacyAgentAliases(value: string) {
  return value.replaceAll(legacyEnglishAgent, lockedAgentName.en).replaceAll(legacyTurkishAgent, lockedAgentName.tr);
}

function sanitizeLocalizedIdentity(copy: LocalizedIdentityText): LocalizedIdentityText {
  return Object.fromEntries(languages.map((language)=>[language,cleanLegacyAgentAliases(copy[language])])) as LocalizedIdentityText;
}

export async function getPublicIdentity(): Promise<PublicIdentity> {
  if (!isSupabaseConfigured || !supabase) return DEFAULT_PUBLIC_IDENTITY;
  try {
    const { data, error } = await supabase.from("settings").select("setting_key,setting_value").eq("is_public", true).in("setting_key", allKeys);
    if (error || !data) return DEFAULT_PUBLIC_IDENTITY;
    const rows = new Map((data as SettingRow[]).flatMap((row) => row.setting_key && row.setting_value ? [[row.setting_key, row.setting_value] as const] : []));
    return {
      agencyName: lockedAgencyName,
      agentReadableName: lockedAgentName,
      agentDecoratedAr: DEFAULT_PUBLIC_IDENTITY.agentDecoratedAr,
      agentRoleLine: sanitizeLocalizedIdentity(localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentRoleLine, DEFAULT_PUBLIC_IDENTITY.agentRoleLine)),
      agentLead: sanitizeLocalizedIdentity(localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentLead, DEFAULT_PUBLIC_IDENTITY.agentLead)),
      agentManagementCopy: sanitizeLocalizedIdentity(localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentManagementCopy, DEFAULT_PUBLIC_IDENTITY.agentManagementCopy)),
      agentAboutCopy: sanitizeLocalizedIdentity(localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentAboutCopy, DEFAULT_PUBLIC_IDENTITY.agentAboutCopy)),
      agentSeoTitle: sanitizeLocalizedIdentity(localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentSeoTitle, DEFAULT_PUBLIC_IDENTITY.agentSeoTitle)),
      agentSeoDescription: sanitizeLocalizedIdentity(localizedValue(rows, PUBLIC_IDENTITY_SETTING_KEYS.agentSeoDescription, DEFAULT_PUBLIC_IDENTITY.agentSeoDescription)),
    };
  } catch {
    return DEFAULT_PUBLIC_IDENTITY;
  }
}

function replaceApprovedIdentityTokens(value: string, language: SiteLanguage, identity: PublicIdentity, decorated = false) {
  let output = cleanLegacyAgentAliases(value);
  if (language !== "en") output = output.replaceAll(legacyTurkishAgency, identity.agencyName[language]);
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
  return `${identity.agencyName.en} — Managed by ${identity.agentReadableName.en}`;
}
