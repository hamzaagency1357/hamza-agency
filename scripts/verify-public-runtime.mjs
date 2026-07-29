const baseUrl = process.env.HAMZA_RUNTIME_BASE_URL || "http://127.0.0.1:3000";

const placeholders = [
  "Localized content is being updated.",
  "Yerelleştirilmiş içerik güncelleniyor.",
  "Lorem ipsum",
];

const localeCopy = {
  ar: [
    "وكالة احترافية لإدارة صناع المحتوى",
    "نساعد صناع المحتوى على تطوير حضورهم وتحسين فرص النجاح",
  ],
  en: [
    "Professional creator management agency",
    "We help creators grow their presence and opportunities",
  ],
  tr: [
    "Profesyonel içerik üreticisi ajansı",
    "İçerik üreticilerinin canlı yayın ve sosyal platformlarda büyümesine destek oluyoruz.",
  ],
};

const arabicProgramSummaries = [
  "برنامج لصناع المحتوى الراغبين بالنمو على TikTok.",
  "فرص بث مباشر ودعم لصناع المحتوى.",
  "برنامج اجتماعي وبث مباشر.",
];

const localizedProgramSummaries = {
  en: [
    "Join the TikTok program",
    "Join the BIGO LIVE program",
    "Join the Yaahlan audio program",
  ],
  tr: [
    "TikTok programına katılın",
    "BIGO LIVE programına katılın",
    "Yaahlan sesli yayın programına katılın",
  ],
};

async function readPage(path, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  const html = await response.text();
  return { response, html };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertLocalePage({ path, expectedLanguage, response, html }) {
  assert(response.status === 200, `${path} returned ${response.status}.`);
  assert(!response.headers.get("location"), `${path} unexpectedly redirected.`);
  assert(html.includes(`<html lang="${expectedLanguage}"`), `${path} did not render html lang=${expectedLanguage}.`);
  assert(html.includes(`data-site-language="${expectedLanguage}"`), `${path} did not render data-site-language=${expectedLanguage}.`);
  for (const placeholder of placeholders) assert(!html.includes(placeholder), `${path} rendered forbidden placeholder: ${placeholder}`);
  for (const copy of localeCopy[expectedLanguage]) assert(html.includes(copy), `${path} is missing stable ${expectedLanguage} homepage copy: ${copy}`);
}

function assertNoMixedLanguage(path, html, language) {
  const foreign = Object.entries(localeCopy).filter(([key]) => key !== language).flatMap(([, copy]) => copy);
  for (const copy of foreign) assert(!html.includes(copy), `${path} mixed ${language} with foreign homepage copy: ${copy}`);
}

function assertLocalizedProgramCards(path, html, language) {
  if (language === "ar") return;
  for (const arabic of arabicProgramSummaries) {
    assert(!html.includes(arabic), `${path} rendered an Arabic program summary in ${language}: ${arabic}`);
  }
  for (const summary of localizedProgramSummaries[language]) {
    assert(html.includes(summary), `${path} is missing localized ${language} program summary: ${summary}`);
  }
}

const tr = await readPage("/tr");
assertLocalePage({ path: "/tr", expectedLanguage: "tr", ...tr });
assertNoMixedLanguage("/tr", tr.html, "tr");
assertLocalizedProgramCards("/tr", tr.html, "tr");

const arAfterTr = await readPage("/", "hamza-agency-language=tr");
assertLocalePage({ path: "/ with TR cookie", expectedLanguage: "ar", ...arAfterTr });
assertNoMixedLanguage("/ with TR cookie", arAfterTr.html, "ar");

const en = await readPage("/en", "hamza-agency-language=tr");
assertLocalePage({ path: "/en with TR cookie", expectedLanguage: "en", ...en });
assertNoMixedLanguage("/en with TR cookie", en.html, "en");
assertLocalizedProgramCards("/en with TR cookie", en.html, "en");

const arAfterEn = await readPage("/", "hamza-agency-language=en");
assertLocalePage({ path: "/ with EN cookie", expectedLanguage: "ar", ...arAfterEn });
assertNoMixedLanguage("/ with EN cookie", arAfterEn.html, "ar");

const services = await readPage("/services", "hamza-agency-language=tr");
assert(services.response.status === 200 && !services.response.headers.get("location"), "Arabic services URL redirected because of a cookie.");
assert(services.html.includes('<html lang="ar"') && services.html.includes('data-site-language="ar"'), "Arabic services URL lost AR ownership.");
assert(services.html.includes('href="/programs"'), "Arabic services page does not retain Arabic program links.");

const programs = await readPage("/programs", "hamza-agency-language=en");
assert(programs.response.status === 200 && !programs.response.headers.get("location"), "Arabic programs URL redirected because of a cookie.");
assert(programs.html.includes('<html lang="ar"') && programs.html.includes('data-site-language="ar"'), "Arabic programs URL lost AR ownership.");
assert(programs.html.includes('href="/services"'), "Arabic programs page does not retain Arabic service links.");

for (const [path, page, language] of [["/", arAfterTr, "ar"], ["/en", en, "en"], ["/tr", tr, "tr"]]) {
  assert(page.html.includes(`href="${language === "ar" ? "/" : `/${language}`}"`), `${path} is missing its locale-owned home link.`);
  if (!page.html.includes("data-announcement-locale")) continue;
  assert(page.html.includes('data-marquee-mechanics="ltr"'), `${path} ticker is not using mechanical LTR movement.`);
  assert(page.html.includes(`data-marquee-language="${language}"`), `${path} ticker language marker is missing.`);
  const groupCount = (page.html.match(/hamza-marquee-group/g) || []).length;
  assert(groupCount === 2, `${path} ticker rendered ${groupCount} marquee groups instead of 2.`);
}

console.log("Runtime locale verification passed: URL-owned AR/EN/TR, localized program cards, cookie isolation, clean language boundaries, locale links, no placeholders, and deterministic ticker mechanics.");
