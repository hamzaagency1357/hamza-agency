/**
 * Owner-approved, exact-match correction suggestions for two historical Turkish
 * translation typos. Suggestions are written only into newly-created review
 * candidates, never into published revisions or Arabic source records.
 */
const targetedCorrections: ReadonlyArray<{
  sourceType: string;
  sourceId: string;
  language: string;
  fieldName: string;
  previous: string;
  suggested: string;
}> = [
  {
    sourceType: "programs",
    sourceId: "2",
    language: "tr",
    fieldName: "summary",
    previous: "BIGO LIVE programına Hamza Ajansı ara",
    suggested: "BIGO LIVE programına Hamza Ajansı aracılığıyla katılın.",
  },
  {
    sourceType: "programs",
    sourceId: "3",
    language: "tr",
    fieldName: "faq",
    previous: "Programın kamerayla görünürlük gerektiriyor mu?\nHayır, Yaahlan programı sadece sesli yayına dayanmaktadır.",
    suggested: "Program kamera karşısına geçmeyi gerektiriyor mu?\nHayır, Yaahlan programı yalnızca sesli yayına dayanır.",
  },
];

export function getTranslationCorrectionSuggestions(
  sourceType: string,
  sourceId: string,
  language: string,
  publishedFields: Record<string, string>
): { fields: Record<string, string>; correctedFields: string[] } {
  const fields = { ...publishedFields };
  const correctedFields: string[] = [];
  for (const rule of targetedCorrections) {
    if (rule.sourceType !== sourceType || rule.sourceId !== sourceId || rule.language !== language) continue;
    if (fields[rule.fieldName] !== rule.previous) continue;
    fields[rule.fieldName] = rule.suggested;
    correctedFields.push(rule.fieldName);
  }
  return { fields, correctedFields };
}
