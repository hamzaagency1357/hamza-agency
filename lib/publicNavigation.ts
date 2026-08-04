import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PublicNavigationLink = {
  label: string;
  href: string;
  type: string;
  isVisible: boolean;
  sortOrder: number;
  target?: "_self" | "_blank";
  rel?: string;
  key?: string;
};

export type PublicNavigationGroup = {
  title: string;
  isVisible: boolean;
  sortOrder: number;
  links: PublicNavigationLink[];
};

export type PublicNavigationConfig = {
  headerLinks: PublicNavigationLink[];
  footerLinks: PublicNavigationLink[];
  quickNavGroups: PublicNavigationGroup[];
  ctaLinks: PublicNavigationLink[];
};

type SettingRow = { setting_key: string | null; setting_value: string | null };
type UnknownRecord = Record<string, unknown>;

const navigationSettingKeys = [
  "public_header_links_json",
  "public_footer_links_json",
  "public_quick_nav_groups_json",
  "public_cta_links_json",
] as const;

const installLink: PublicNavigationLink = {
  key: "install_app",
  label: "تثبيت التطبيق",
  href: "/install-app",
  type: "utility",
  isVisible: true,
  sortOrder: 90,
};

const defaultHeaderLinks: PublicNavigationLink[] = [
  { label: "الرئيسية", href: "/", type: "internal", isVisible: true, sortOrder: 1 },
  { label: "البرامج", href: "/programs", type: "internal", isVisible: true, sortOrder: 2 },
  { label: "من نحن", href: "/about", type: "internal", isVisible: true, sortOrder: 3 },
  { label: "الخدمات", href: "/services", type: "internal", isVisible: true, sortOrder: 4 },
  { label: "الخدمات الرقمية", href: "/digital-services", type: "internal", isVisible: true, sortOrder: 5 },
  { label: "طلب خدمة", href: "/service-request", type: "internal", isVisible: true, sortOrder: 6 },
  { label: "تتبع طلب خدمة", href: "/service-status", type: "internal", isVisible: true, sortOrder: 7 },
  { label: "تتبع طلب الانضمام", href: "/application-status", type: "internal", isVisible: true, sortOrder: 8 },
  { label: "الوظائف", href: "/jobs", type: "internal", isVisible: true, sortOrder: 9 },
  { label: "اتصل بنا", href: "/contact", type: "internal", isVisible: true, sortOrder: 10 },
];

const defaultFooterLinks: PublicNavigationLink[] = [
  { label: "سياسة الخصوصية", href: "/privacy-policy", type: "legal", isVisible: true, sortOrder: 1 },
  { label: "الشروط والأحكام", href: "/terms-and-conditions", type: "legal", isVisible: true, sortOrder: 2 },
  { label: "سياسة الذكاء الاصطناعي", href: "/ai-policy", type: "legal", isVisible: true, sortOrder: 3 },
  installLink,
];

const defaultQuickNavGroups: PublicNavigationGroup[] = [
  {
    title: "أساسيات الوكالة",
    isVisible: true,
    sortOrder: 1,
    links: [
      { label: "الرئيسية", href: "/", type: "internal", isVisible: true, sortOrder: 1 },
      { label: "البرامج", href: "/programs", type: "internal", isVisible: true, sortOrder: 2 },
      { label: "من نحن", href: "/about", type: "internal", isVisible: true, sortOrder: 3 },
      { label: "الخدمات", href: "/services", type: "internal", isVisible: true, sortOrder: 4 },
      { label: "الخدمات الرقمية", href: "/digital-services", type: "internal", isVisible: true, sortOrder: 5 },
      { label: "تواصل معنا", href: "/contact", type: "internal", isVisible: true, sortOrder: 6 },
      { ...installLink, sortOrder: 7 },
    ],
  },
  {
    title: "تفاصيل البرامج",
    isVisible: true,
    sortOrder: 2,
    links: [
      { label: "TikTok", href: "/programs/tiktok", type: "program", isVisible: true, sortOrder: 1 },
      { label: "BIGO LIVE", href: "/programs/bigo-live", type: "program", isVisible: true, sortOrder: 2 },
      { label: "Yaahlan", href: "/programs/yaahlan", type: "program", isVisible: true, sortOrder: 3 },
      { label: "Xena", href: "/programs/xena", type: "program", isVisible: true, sortOrder: 4 },
      { label: "Catchii", href: "/programs/catchii", type: "program", isVisible: true, sortOrder: 5 },
    ],
  },
  {
    title: "الطلبات والمتابعة",
    isVisible: true,
    sortOrder: 3,
    links: [
      { label: "طلب خدمة", href: "/service-request", type: "internal", isVisible: true, sortOrder: 1 },
      { label: "تتبع طلب خدمة", href: "/service-status", type: "internal", isVisible: true, sortOrder: 2 },
      { label: "تتبع طلب الانضمام", href: "/application-status", type: "internal", isVisible: true, sortOrder: 3 },
      { label: "الوظائف", href: "/jobs", type: "internal", isVisible: true, sortOrder: 4 },
    ],
  },
  {
    title: "الثقة والمحتوى",
    isVisible: true,
    sortOrder: 4,
    links: [
      { label: "التقييمات", href: "/reviews", type: "internal", isVisible: true, sortOrder: 1 },
      { label: "قصص النجاح", href: "/success-stories", type: "internal", isVisible: true, sortOrder: 2 },
      { label: "الشركاء والبرامج", href: "/partners", type: "internal", isVisible: true, sortOrder: 3 },
      { label: "المعرض", href: "/gallery", type: "internal", isVisible: true, sortOrder: 4 },
      { label: "مركز المعرفة", href: "/knowledge-center", type: "internal", isVisible: true, sortOrder: 5 },
      { label: "الأسئلة الشائعة", href: "/faq", type: "internal", isVisible: true, sortOrder: 6 },
      { label: "الدعم الذكي", href: "/ai-support", type: "internal", isVisible: true, sortOrder: 7 },
    ],
  },
  {
    title: "معلومات قانونية",
    isVisible: true,
    sortOrder: 5,
    links: defaultFooterLinks.filter((link) => link.type === "legal"),
  },
];

const defaultCtaLinks: PublicNavigationLink[] = [
  { key: "primary_join", label: "انضم الآن", href: "/apply", type: "cta", isVisible: true, sortOrder: 1 },
  { key: "view_programs", label: "عرض البرامج", href: "/programs", type: "cta", isVisible: true, sortOrder: 2 },
  { key: "contact", label: "تواصل معنا", href: "/contact", type: "cta", isVisible: true, sortOrder: 3 },
];

export const defaultPublicNavigationConfig: PublicNavigationConfig = {
  headerLinks: defaultHeaderLinks,
  footerLinks: defaultFooterLinks,
  quickNavGroups: defaultQuickNavGroups,
  ctaLinks: defaultCtaLinks,
};

export async function getPublicNavigationConfig(): Promise<PublicNavigationConfig> {
  if (!isSupabaseConfigured || !supabase) return defaultPublicNavigationConfig;

  const { data, error } = await supabase
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", [...navigationSettingKeys])
    .eq("is_public", true);

  if (error || !data) return defaultPublicNavigationConfig;
  const settings = buildSettingsMap(data as SettingRow[]);
  return ensureRequiredNavigation({
    headerLinks: readLinksSetting(settings, "public_header_links_json", defaultHeaderLinks),
    footerLinks: readLinksSetting(settings, "public_footer_links_json", defaultFooterLinks),
    quickNavGroups: readGroupsSetting(settings, "public_quick_nav_groups_json", defaultQuickNavGroups),
    ctaLinks: readLinksSetting(settings, "public_cta_links_json", defaultCtaLinks),
  });
}

export function normalizePublicNavigationConfig(input: Partial<PublicNavigationConfig> | null | undefined): PublicNavigationConfig {
  return ensureRequiredNavigation({
    headerLinks: sanitizeLinks(input?.headerLinks, defaultHeaderLinks),
    footerLinks: sanitizeLinks(input?.footerLinks, defaultFooterLinks),
    quickNavGroups: sanitizeGroups(input?.quickNavGroups, defaultQuickNavGroups),
    ctaLinks: sanitizeLinks(input?.ctaLinks, defaultCtaLinks),
  });
}

export function getCtaLink(config: PublicNavigationConfig, key: string, fallback: PublicNavigationLink) {
  return config.ctaLinks.find((link) => link.key === key && link.isVisible !== false) || fallback;
}

function ensureRequiredNavigation(config: PublicNavigationConfig): PublicNavigationConfig {
  const footerLinks = ensureLink(config.footerLinks, installLink);
  const quickNavGroups = config.quickNavGroups.map((group) => ({ ...group, links: [...group.links] }));
  const alreadyInQuickNav = quickNavGroups.some((group) => group.links.some((link) => normalizeHref(link.href) === installLink.href));
  if (!alreadyInQuickNav) {
    if (quickNavGroups.length === 0) quickNavGroups.push({ title: "أساسيات الوكالة", isVisible: true, sortOrder: 1, links: [installLink] });
    else quickNavGroups[0] = { ...quickNavGroups[0], links: ensureLink(quickNavGroups[0].links, { ...installLink, sortOrder: 999 }) };
  }
  return { ...config, footerLinks, quickNavGroups };
}

function ensureLink(links: PublicNavigationLink[], required: PublicNavigationLink) {
  return links.some((link) => normalizeHref(link.href) === normalizeHref(required.href)) ? links : [...links, required].sort(sortByOrderThenLabel);
}

function buildSettingsMap(rows: SettingRow[]) {
  return rows.reduce<Record<string, string>>((map, row) => {
    const key = row.setting_key?.trim();
    if (key) map[key] = row.setting_value || "";
    return map;
  }, {});
}

function readLinksSetting(settings: Record<string, string>, key: string, fallback: PublicNavigationLink[]) {
  return sanitizeLinks(parseJson(settings[key]), fallback);
}

function readGroupsSetting(settings: Record<string, string>, key: string, fallback: PublicNavigationGroup[]) {
  return sanitizeGroups(parseJson(settings[key]), fallback);
}

function parseJson(value: string | undefined): unknown {
  if (!value?.trim()) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function sanitizeGroups(value: unknown, fallback: PublicNavigationGroup[]) {
  if (!Array.isArray(value)) return fallback;
  const groups = value
    .map((item, index) => sanitizeGroup(item, index))
    .filter((group): group is PublicNavigationGroup => Boolean(group))
    .filter((group) => group.isVisible !== false && group.links.length > 0)
    .sort(sortByOrderThenTitle);
  return groups.length ? groups : fallback;
}

function sanitizeGroup(value: unknown, index: number): PublicNavigationGroup | null {
  if (!isRecord(value)) return null;
  const title = toSafeText(value.title);
  const links = sanitizeLinks(value.links, []);
  if (!title || !links.length) return null;
  return { title, isVisible: value.isVisible !== false, sortOrder: toSafeNumber(value.sortOrder, index + 1), links };
}

function sanitizeLinks(value: unknown, fallback: PublicNavigationLink[]) {
  if (!Array.isArray(value)) return fallback;
  const links = value
    .map((item, index) => sanitizeLink(item, index))
    .filter((link): link is PublicNavigationLink => Boolean(link))
    .filter((link) => link.isVisible !== false)
    .sort(sortByOrderThenLabel);
  return links.length ? links : fallback;
}

function sanitizeLink(value: unknown, index: number): PublicNavigationLink | null {
  if (!isRecord(value)) return null;
  const label = toSafeText(value.label);
  const href = normalizeHref(toSafeText(value.href));
  if (!label || !href) return null;
  const target = normalizeTarget(value.target);
  return {
    label,
    href,
    type: toSafeText(value.type) || (href.startsWith("http") ? "external" : "internal"),
    isVisible: value.isVisible !== false,
    sortOrder: toSafeNumber(value.sortOrder, index + 1),
    target,
    rel: target === "_blank" ? "noreferrer" : undefined,
    key: toSafeText(value.key) || undefined,
  };
}

function normalizeHref(value: string) {
  const href = value.trim();
  if (!href) return "";
  if (href.startsWith("/") || href.startsWith("#")) return href;
  if (href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  return "";
}

function normalizeTarget(value: unknown): "_self" | "_blank" | undefined {
  if (value === "_blank" || value === "_self") return value;
  return undefined;
}

function sortByOrderThenLabel(first: PublicNavigationLink, second: PublicNavigationLink) {
  return first.sortOrder - second.sortOrder || first.label.localeCompare(second.label, "ar");
}

function sortByOrderThenTitle(first: PublicNavigationGroup, second: PublicNavigationGroup) {
  return first.sortOrder - second.sortOrder || first.title.localeCompare(second.title, "ar");
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toSafeText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function toSafeNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
