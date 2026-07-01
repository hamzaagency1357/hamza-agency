export type CmsTranslationField = "title" | "summary" | "content";
export type CmsTranslationValues = Partial<Record<CmsTranslationField, string>>;

export type CmsTranslationRow = {
  source_id: string | null;
  field_name: CmsTranslationField | null;
  translated_value: string | null;
};

export function makeCmsTranslationMapKey(sourceId: string) {
  return `pages:${sourceId}`;
}

export function buildCmsTranslationMap(rows: CmsTranslationRow[]) {
  return rows.reduce<Record<string, CmsTranslationValues>>((result, row) => {
    if (!row.source_id || !row.field_name || !row.translated_value?.trim()) return result;
    const key = makeCmsTranslationMapKey(row.source_id);
    result[key] = result[key] || {};
    result[key][row.field_name] = row.translated_value.trim();
    return result;
  }, {});
}

export function hasCompleteCmsTranslation(
  values: CmsTranslationValues | undefined,
  requiredFields: readonly CmsTranslationField[]
) {
  return Boolean(values && requiredFields.every((field) => values[field]?.trim()));
}
