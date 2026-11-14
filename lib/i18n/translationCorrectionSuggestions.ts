/**
 * Exact-match Turkish corrections proposed in newly created review candidates.
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
    fieldName: "summary",
    previous: "HAMZA AGENCY aracılığıyla YAAHLAN programına katılın",
    suggested: "Hamza Ajansı aracılığıyla Yaahlan programına katılın.",
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
