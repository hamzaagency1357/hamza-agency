const safeAcceptanceCopy = {
  ar: "استيفاء شروط البرنامج يتيح تقديم الطلب ودراسته. يعتمد القرار النهائي على البرنامج أو المنصة والمراجعة، ولا يوجد ضمان للقبول.",
  en: "Meeting the program requirements allows an application to be submitted for review. The final decision depends on the program or platform review, and acceptance is not guaranteed.",
  tr: "Program koşullarını karşılamak başvurunun gönderilip incelenmesini sağlar. Nihai karar programın veya platformun incelemesine bağlıdır ve kabul garantisi yoktur.",
};

const positiveAcceptancePatterns = {
  ar: [
    /القبول\s+مضمون/iu,
    /نضمن(?:\s+لك)?\s+القبول/iu,
    /قبول\s+مضمون/iu,
  ],
  en: [
    /\bacceptance\s+is\s+guaranteed\b/iu,
    /\bapproval\s+is\s+guaranteed\b/iu,
    /\bguaranteed\s+(?:acceptance|approval)\b/iu,
  ],
  tr: [
    /\bkabul\s+garantili\b/iu,
    /\bgarantili\s+kabul\b/iu,
    /\bkabul\s+garanti(?:si)?(?:\s+(?:edilir|verilir))?\b/iu,
  ],
};

const safeOrQuestionPatterns = {
  ar: [
    /(?:القبول|قبول)\s+غير\s+مضمون/iu,
    /(?:القبول|قبول)\s+ليس\s+مضمون/iu,
    /لا\s+نضمن(?:\s+لك)?\s+القبول/iu,
    /لا\s+يوجد\s+ضمان\s+(?:ل)?لقبول/iu,
    /بدون\s+ضمان/iu,
  ],
  en: [
    /\b(?:acceptance|approval)\s+is\s+not\s+guaranteed\b/iu,
    /\bno\s+guarantee\b/iu,
    /\b(?:cannot|can't|do\s+not|don't)\s+guarantee\b/iu,
  ],
  tr: [
    /\bkabul\s+garanti(?:si)?\s+yok(?:tur)?\b/iu,
    /\bgaranti\s+(?:değil|yok|verilmez)\b/iu,
    /\bkabul\s+garanti\s+edilmez\b/iu,
    /\bkabul\s+garanti(?:li)?\s+m[ıiuü]\b/iu,
  ],
};

function isProtectedAcceptanceSentence(value, language) {
  const sentence = value.trim();
  if (!sentence) return true;
  if (/[?؟]$/u.test(sentence)) return true;
  return safeOrQuestionPatterns[language].some((pattern) => pattern.test(sentence));
}

export function containsPositiveAcceptanceGuarantee(value, language) {
  if (!value?.trim()) return false;
  return value
    .split(/[\r\n]+/u)
    .some((line) =>
      line
        .match(/[^.!?؟]+[.!?؟]?/gu)
        ?.some(
          (sentence) =>
            !isProtectedAcceptanceSentence(sentence, language) &&
            positiveAcceptancePatterns[language].some((pattern) => pattern.test(sentence))
        )
    );
}

export function normalizeAcceptanceGuaranteeClaims(value, language) {
  if (!value?.trim()) return value;
  return value.replace(/[^.!?؟\r\n]+[.!?؟]?/gu, (segment) => {
    if (isProtectedAcceptanceSentence(segment, language)) return segment;
    if (!positiveAcceptancePatterns[language].some((pattern) => pattern.test(segment))) return segment;
    const leading = segment.match(/^\s*/u)?.[0] ?? "";
    const trailing = segment.match(/\s*$/u)?.[0] ?? "";
    return `${leading}${safeAcceptanceCopy[language]}${trailing}`;
  });
}
