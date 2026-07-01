export type CmsTranslationSourceKind = "page" | "section";

export function makeCmsPageTranslationSourceId(pageId: string | number) {
  return String(pageId).trim();
}

export function makeCmsSectionTranslationSourceId(sectionId: string | number) {
  return `section:${String(sectionId).trim()}`;
}

export function makeCmsTranslationKey(sourceId: string) {
  return `pages:${sourceId}`;
}

export function isCmsSectionTranslationSourceId(sourceId: string) {
  return sourceId.startsWith("section:") && sourceId.slice("section:".length).trim().length > 0;
}
