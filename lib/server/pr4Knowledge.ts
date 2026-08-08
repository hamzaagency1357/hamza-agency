export type SupportLanguage = "ar" | "en" | "tr";

export type PublishedKnowledge = {
  question: string;
  answer: string;
  alternatives?: string[] | null;
  keywords?: string[] | null;
  language: SupportLanguage;
  category?: string | null;
  source_label?: string | null;
  source_url?: string | null;
  priority?: number | null;
  status?: string | null;
  start_at?: string | null;
  expires_at?: string | null;
};

const stopWords: Record<SupportLanguage, Set<string>> = {
  ar: new Set(["ما","ماذا","ماهي","ماهيه","هل","عن","في","من","الى","إلى","على","و","او","أو","هو","هي","هذا","هذه","شو","بدي","اريد","أريد","اعرف","أعرف"]),
  en: new Set(["what","is","are","the","a","an","about","for","of","to","in","on","do","does","can","i","you","tell","me"]),
  tr: new Set(["nedir","ne","bir","ve","veya","icin","için","hakkinda","hakkında","ile","bu","su","şu","mi","mı","mu","mü","ben","bana"]),
};

export function normalizeSupportText(input: string, language: SupportLanguage) {
  let value = input.normalize("NFKC").toLocaleLowerCase(language === "tr" ? "tr-TR" : language === "ar" ? "ar" : "en-US");
  if (language === "ar") value = value.replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي");
  return value.replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

function meaningfulTokens(input: string, language: SupportLanguage) {
  const normalized = normalizeSupportText(input, language);
  return [...new Set(normalized.split(" ").filter((token) => token.length >= 2 && !stopWords[language].has(token)))];
}

export function isActivePublishedKnowledge(row: PublishedKnowledge, language: SupportLanguage, now = new Date()) {
  if (row.language !== language || row.status !== "published" || !row.answer?.trim()) return false;
  const start = row.start_at ? Date.parse(row.start_at) : Number.NaN;
  const end = row.expires_at ? Date.parse(row.expires_at) : Number.NaN;
  if (Number.isFinite(start) && start > now.getTime()) return false;
  if (Number.isFinite(end) && end <= now.getTime()) return false;
  return true;
}

export function findPublishedKnowledgeAnswer(rows: PublishedKnowledge[], query: string, language: SupportLanguage, now = new Date()) {
  const normalizedQuery = normalizeSupportText(query, language);
  const queryTokens = meaningfulTokens(query, language);
  if (!normalizedQuery || queryTokens.length === 0) return null;

  const ranked = rows.filter((row) => isActivePublishedKnowledge(row, language, now)).map((row) => {
    const phrases = [row.question, ...(row.alternatives || [])].map((value) => normalizeSupportText(value || "", language)).filter(Boolean);
    const exact = phrases.some((phrase) => phrase === normalizedQuery);
    const phraseMatch = phrases.some((phrase) => phrase.length >= 5 && (phrase.includes(normalizedQuery) || normalizedQuery.includes(phrase)));
    const searchable = [row.question, ...(row.alternatives || []), ...(row.keywords || [])].join(" ");
    const searchTokens = new Set(meaningfulTokens(searchable, language));
    const overlap = queryTokens.filter((token) => searchTokens.has(token)).length;
    const coverage = overlap / queryTokens.length;
    const accepted = exact || phraseMatch || (queryTokens.length === 1 ? overlap === 1 && queryTokens[0].length >= 4 : overlap >= 2 && coverage >= 0.6);
    const rank = (exact ? 1000 : phraseMatch ? 800 : Math.round(coverage * 500) + overlap * 25) + Math.max(-100, Math.min(100, row.priority || 0));
    return { row, accepted, rank };
  }).filter((entry) => entry.accepted).sort((a, b) => b.rank - a.rank);

  return ranked[0]?.row || null;
}
