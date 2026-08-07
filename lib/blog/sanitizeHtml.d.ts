export type SanitizeArticleHtmlOptions = {
  siteOrigin?: string;
};

export const ARTICLE_HTML_ALLOWED_TAGS: readonly string[];
export function sanitizeArticleHtml(value: string, options?: SanitizeArticleHtmlOptions): string;
