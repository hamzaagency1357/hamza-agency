// Owner policy: acceptance is guaranteed once all program requirements are met
// and verified. Unconditional statements are qualified rather than denied.
const verifiedAcceptanceCopy = {
 ar:"القبول مضمون عند استيفاء جميع شروط ومتطلبات البرنامج والتحقق منها.",
 en:"Acceptance is guaranteed when all program requirements are met and verified.",
 tr:"Programın tüm şartları karşılandığında ve doğrulandığında kabul garantilidir."
};
const positiveAcceptancePatterns={
 ar:[/القبول\s+مضمون/iu,/نضمن(?:\s+لك)?\s+القبول/iu,/قبول\s+مضمون/iu],
 en:[/\bacceptance\s+is\s+guaranteed\b/iu,/\bapproval\s+is\s+guaranteed\b/iu,/\bguaranteed\s+(?:acceptance|approval)\b/iu],
 tr:[/\bkabul\s+garantili(?:dir)?\b/iu,/\bgarantili\s+kabul\b/iu,/\bkabul\s+garanti(?:si)?(?:\s+(?:edilir|verilir))?\b/iu]
};
const conditionPatterns={
 ar:[/استيفاء\s+(?:جميع\s+)?(?:ال)?شروط/iu,/تستوفي\s+(?:جميع\s+)?(?:ال)?شروط/iu,/عند\s+استيفاء\s+(?:جميع\s+)?(?:ال)?متطلبات/iu,/عند\s+تحقق\s+الشروط/iu,/بعد\s+التحقق\s+من\s+الشروط/iu],
 en:[/\b(?:when|if|once)\s+all\s+(?:program\s+)?requirements\s+are\s+met\b/iu,/\bapplications?\s+that\s+meet\s+(?:all\s+)?(?:the\s+)?(?:program(?:'s)?\s+)?(?:conditions|requirements)\b/iu,/\bwhen\s+all\s+(?:program\s+)?conditions\s+are\s+met\b/iu],
 tr:[/\b(?:program\s+)?şartlar(?:ı|ını)?\s+karşılandığında\b/iu,/\bprogram\s+şartlarını\s+karşılayan\b/iu,/\b(?:tüm\s+)?koşullar\s+sağlandığında\b/iu,/\b(?:tüm\s+)?şartlar\s+sağlandığında\b/iu,/\bdoğrulandığında\b/iu]
};
const negativePatterns={
 ar:[/القبول\s+غير\s+مضمون/iu,/القبول\s+ليس\s+مضمون/iu,/لا\s+نضمن\s+القبول/iu],
 en:[/\bacceptance\s+is\s+not\s+guaranteed\b/iu,/\bno\s+guarantee\b/iu],
 tr:[/\bkabul\s+garantisi\s+yok(?:tur)?\b/iu,/\bkabul\s+garanti\s+edilmez\b/iu]
};
function isProtected(segment,language){
 if(!positiveAcceptancePatterns[language])return true;
 const text=segment.trim();
 if(!text||/[?؟]$/u.test(text))return true;
 if(negativePatterns[language].some(pattern=>pattern.test(text)))return true;
 return conditionPatterns[language].some(pattern=>pattern.test(text));
}
// Legacy export name retained. True means unsupported unconditional claim.
export function containsPositiveAcceptanceGuarantee(value,language){
 if(!value?.trim()||!positiveAcceptancePatterns[language])return false;
 return value.split(/[\r\n]+/u).some(line=>(line.match(/[^.!?؟]+[.!?؟]?/gu)||[]).some(sentence=>!isProtected(sentence,language)&&positiveAcceptancePatterns[language].some(pattern=>pattern.test(sentence))));
}
export function normalizeAcceptanceGuaranteeClaims(value,language){
 if(!value?.trim()||!positiveAcceptancePatterns[language])return value;
 return value.replace(/[^.!?؟\r\n]+[.!?؟]?/gu,segment=>{
  if(isProtected(segment,language))return segment;
  if(!positiveAcceptancePatterns[language].some(pattern=>pattern.test(segment)))return segment;
  const leading=segment.match(/^\s*/u)?.[0]??"";
  const trailing=segment.match(/\s*$/u)?.[0]??"";
  return `${leading}${verifiedAcceptanceCopy[language]}${trailing}`;
 });
}
