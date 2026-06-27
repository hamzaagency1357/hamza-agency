export type TranslationSourceType = "programs" | "faqs" | "knowledge_base";
export type TranslationFieldName = "title" | "summary" | "content";

export type TranslationSourceItem = {
  sourceType: TranslationSourceType;
  sourceId: string;
  title: string;
  summary: string;
  content: string;
};

export type TranslationSourceDefinition = {
  sourceType: TranslationSourceType;
  label: string;
  table: "programs" | "faqs" | "knowledge_base";
  titleKeys: readonly string[];
  summaryKeys: readonly string[];
  contentKeys: readonly string[];
};

export const TRANSLATION_SOURCE_DEFINITIONS: readonly TranslationSourceDefinition[] = [
  {
    sourceType: "programs",
    label: "البرامج",
    table: "programs",
    titleKeys: ["name", "title"],
    summaryKeys: ["short_description", "summary"],
    contentKeys: ["description", "content"],
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
];

export const TRANSLATION_SOURCE_TYPES = TRANSLATION_SOURCE_DEFINITIONS.map(
  (source) => source.sourceType
) as TranslationSourceType[];

export function isTranslationSourceType(value: unknown): value is TranslationSourceType {
  return typeof value === "string" && TRANSLATION_SOURCE_TYPES.includes(value as TranslationSourceType);
}

export function getTranslationSourceDefinition(sourceType: TranslationSourceType) {
  return TRANSLATION_SOURCE_DEFINITIONS.find((source) => source.sourceType === sourceType) || null;
}

export function getTranslationFieldText(row: Record<string, unknown>, keys: readonly string[]): string {
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

  const title = getTranslationFieldText(row, definition.titleKeys);
  const summary = getTranslationFieldText(row, definition.summaryKeys);
  const content = getTranslationFieldText(row, definition.contentKeys);

  if (!title && !summary && !content) return null;

  return {
    sourceType,
    sourceId: sourceId.trim(),
    title,
    summary,
    content,
  };
}
