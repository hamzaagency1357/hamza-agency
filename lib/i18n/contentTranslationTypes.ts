export type TranslationLanguage = "en" | "tr";

export type TranslationSource = "programs" | "faqs" | "knowledge_base";

export type TranslationField = "title" | "summary" | "content";

export type PublishedTranslationRow = {
  source_type: TranslationSource;
  source_id: string;
  field_name: TranslationField;
  language: TranslationLanguage;
  translated_value: string | null;
  status: "reviewed" | "published" | null;
  is_published: boolean | null;
};
