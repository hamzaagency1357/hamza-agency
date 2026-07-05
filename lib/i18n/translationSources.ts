export type TranslationSourceType =
  | "programs"
  | "pages"
  | "sections"
  | "faqs"
  | "knowledge_base"
  | "partners"
  | "jobs";

export type TranslationBaseFieldName = "title" | "summary" | "content";
export type ProgramDetailTranslationFieldName =
  | "requirements"
  | "benefits"
  | "updates"
  | "faq";
export type JobDetailTranslationFieldName =
  | "department"
  | "location"
  | "job_type";
export type TranslationFieldName =
  | TranslationBaseFieldName
  | ProgramDetailTranslationFieldName
  | JobDetailTranslationFieldName;

const BASE_TRANSLATION_FIELDS: readonly TranslationBaseFieldName[] = [
  "title",
  "summary",
  "content",
];
const PROGRAM_DETAIL_TRANSLATION_FIELDS: readonly ProgramDetailTranslationFieldName[] = [
  "requirements",
  "benefits",
  "updates",
  "faq",
];
const JOB_DETAIL_TRANSLATION_FIELDS: ReadonlyArray<
  "department" | "location" | "job_type" | "requirements"
> = ["department", "location", "job_type", "requirements"];

export type TranslationSourceItem = {
  sourceType: TranslationSourceType;
  sourceId: string;
  title: string;
  summary: string;
  content: string;
  requirements?: string;
  benefits?: string;
  updates?: string;
  faq?: string;
  department?: string;
  location?: string;
  job_type?: string;
};

export type TranslationSourceDefinition = {
  sourceType: TranslationSourceType;
  label: string;
  table:
    | "programs"
    | "pages"
    | "sections"
    | "faqs"
    | "knowledge_base"
    | "partners"
    | "jobs";
  titleKeys: readonly string[];
  summaryKeys: readonly string[];
  contentKeys: readonly string[];
  requirementsKeys?: readonly string[];
  benefitsKeys?: readonly string[];
  updatesKeys?: readonly string[];
  faqKeys?: readonly string[];
  departmentKeys?: readonly string[];
  locationKeys?: readonly string[];
  jobTypeKeys?: readonly string[];
};

export const TRANSLATION_SOURCE_DEFINITIONS: readonly TranslationSourceDefinition[] = [
  {
    sourceType: "programs",
    label: "البرامج",
    table: "programs",
    titleKeys: ["name", "title"],
    summaryKeys: ["short_description", "summary"],
    contentKeys: ["description", "content"],
    requirementsKeys: ["requirements"],
    benefitsKeys: ["benefits"],
    updatesKeys: ["updates"],
    faqKeys: ["faq"],
  },
  {
    sourceType: "pages",
    label: "صفحات CMS",
    table: "pages",
    titleKeys: ["title"],
    summaryKeys: ["seo_description", "summary"],
    contentKeys: ["content"],
  },
  {
    sourceType: "sections",
    label: "أقسام CMS",
    table: "sections",
    titleKeys: ["title"],
    summaryKeys: ["subtitle"],
    contentKeys: ["content"],
  },
  {
    sourceType: "faqs",
    label: "الأسئلة الشائعة",
    table: "faqs",
    titleKeys: ["question", "title"],
    summaryKeys: ["category"],
    contentKeys: ["answer", "content"],
  },
  {
    sourceType: "knowledge_base",
    label: "مركز المعرفة",
    table: "knowledge_base",
    titleKeys: ["title"],
    summaryKeys: ["summary", "category"],
    contentKeys: ["content", "answer", "body"],
  },
  {
    sourceType: "partners",
    label: "الشركاء",
    table: "partners",
    titleKeys: ["name", "title"],
    summaryKeys: ["category", "type"],
    contentKeys: ["description", "summary"],
  },
  {
    sourceType: "jobs",
    label: "الوظائف",
    table: "jobs",
    titleKeys: ["title"],
    summaryKeys: ["short_description"],
    contentKeys: ["description"],
    departmentKeys: ["department"],
    locationKeys: ["location"],
    jobTypeKeys: ["job_type"],
    requirementsKeys: ["requirements"],
  },
];

export const TRANSLATION_SOURCE_TYPES = TRANSLATION_SOURCE_DEFINITIONS.map(
  (source) => source.sourceType
) as TranslationSourceType[];

export function isTranslationSourceType(value: unknown): value is TranslationSourceType {
  return (
    typeof value === "string" &&
    TRANSLATION_SOURCE_TYPES.includes(value as TranslationSourceType)
  );
}

export function isTranslationFieldName(value: unknown): value is TranslationFieldName {
  return (
    typeof value === "string" &&
    [
      ...BASE_TRANSLATION_FIELDS,
      ...PROGRAM_DETAIL_TRANSLATION_FIELDS,
      ...JOB_DETAIL_TRANSLATION_FIELDS,
    ].includes(value as TranslationFieldName)
  );
}

export function getTranslationSourceDefinition(sourceType: TranslationSourceType) {
  return (
    TRANSLATION_SOURCE_DEFINITIONS.find(
      (source) => source.sourceType === sourceType
    ) || null
  );
}

export function getTranslationFieldNamesForSource(
  sourceType: TranslationSourceType
): TranslationFieldName[] {
  if (sourceType === "programs") {
    return [...BASE_TRANSLATION_FIELDS, ...PROGRAM_DETAIL_TRANSLATION_FIELDS];
  }

  if (sourceType === "jobs") {
    return [...BASE_TRANSLATION_FIELDS, ...JOB_DETAIL_TRANSLATION_FIELDS];
  }

  return [...BASE_TRANSLATION_FIELDS];
}

export function getTranslationFieldText(
  row: Record<string, unknown>,
  keys: readonly string[]
): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return "";
}

export function toTranslationSourceItem(
  sourceType: TranslationSourceType,
  sourceId: string,
  row: Record<string, unknown>
): TranslationSourceItem | null {
  const definition = getTranslationSourceDefinition(sourceType);
  if (!definition || !sourceId.trim()) return null;

  const item: TranslationSourceItem = {
    sourceType,
    sourceId: sourceId.trim(),
    title: getTranslationFieldText(row, definition.titleKeys),
    summary: getTranslationFieldText(row, definition.summaryKeys),
    content: getTranslationFieldText(row, definition.contentKeys),
  };

  if (sourceType === "programs") {
    item.requirements = getTranslationFieldText(row, definition.requirementsKeys || []);
    item.benefits = getTranslationFieldText(row, definition.benefitsKeys || []);
    item.updates = getTranslationFieldText(row, definition.updatesKeys || []);
    item.faq = getTranslationFieldText(row, definition.faqKeys || []);
  }

  if (sourceType === "jobs") {
    item.department = getTranslationFieldText(row, definition.departmentKeys || []);
    item.location = getTranslationFieldText(row, definition.locationKeys || []);
    item.job_type = getTranslationFieldText(row, definition.jobTypeKeys || []);
    item.requirements = getTranslationFieldText(row, definition.requirementsKeys || []);
  }

  const hasTranslatableText = getTranslationFieldNamesForSource(sourceType).some(
    (field) => Boolean(item[field]?.trim())
  );

  return hasTranslatableText ? item : null;
}
