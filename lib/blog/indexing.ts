import type { BlogPost } from "./posts";

const blogLanguages = ["ar", "en", "tr"] as const;
type BlogLocale = (typeof blogLanguages)[number];
type AlternateUrls = Record<BlogLocale, string>;

export function getIndexableBlogAlternates(post: Pick<BlogPost, "contentByLanguage">, urls: AlternateUrls) {
  const availableLanguages = blogLanguages.filter((language) => {
    const copy = post.contentByLanguage[language];
    return copy?.allowIndex !== false && Boolean(copy?.title.trim() && copy?.content.trim());
  });
  const languages: Partial<Record<BlogLocale | "x-default", string>> = {};
  for (const language of availableLanguages) languages[language] = urls[language];
  const defaultLanguage = availableLanguages[0];
  if (defaultLanguage) languages["x-default"] = urls[defaultLanguage];
  return { availableLanguages, languages };
}
