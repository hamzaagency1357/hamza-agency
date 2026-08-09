import http from "node:http";
import https from "node:https";

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

function navigationResponse(url, { cookie, acceptLanguage } = {}) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const headers = {
      accept: "text/html,application/xhtml+xml",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
      "sec-fetch-user": "?1",
    };
    if (cookie) headers.cookie = cookie;
    if (acceptLanguage) headers["accept-language"] = acceptLanguage;

    const request = client.request(url, { method: "GET", headers }, (response) => {
      const chunks = [];
      response.setEncoding("utf8");
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          status: response.statusCode || 0,
          headers: {
            get(name) {
              const value = response.headers[name.toLowerCase()];
              if (Array.isArray(value)) return value[0] || null;
              return value ?? null;
            },
          },
          html: chunks.join(""),
        });
      });
    });
    request.on("error", reject);
    request.end();
  });
}

async function readPage(path, options = {}) {
  const result = await navigationResponse(new URL(path, baseUrl), options);
  return {
    response: { status: result.status, headers: result.headers },
    html: result.html,
  };
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

function assertRedirect({ path, response, expectedLocation }) {
  const location = response.headers.get("location");
  const redirectedPath = location ? new URL(location, baseUrl).pathname : null;
  assert(response.status === 307, `${path} returned ${response.status} instead of 307.`);
  assert(redirectedPath === expectedLocation, `${path} redirected to ${location} instead of ${expectedLocation}.`);
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

const tr = await readPage("/tr", {
  cookie: "hamza-agency-language=tr",
  acceptLanguage: "tr-TR,tr;q=0.9",
});
assertLocalePage({ path: "/tr", expectedLanguage: "tr", ...tr });
assertNoMixedLanguage("/tr", tr.html, "tr");
assertLocalizedProgramCards("/tr", tr.html, "tr");

const rootWithTr = await readPage("/", { cookie: "hamza-agency-language=tr" });
assertRedirect({ path: "/ with TR cookie", response: rootWithTr.response, expectedLocation: "/tr" });

const en = await readPage("/en", {
  cookie: "hamza-agency-language=en",
  acceptLanguage: "en-US,en;q=0.9",
});
assertLocalePage({ path: "/en", expectedLanguage: "en", ...en });
assertNoMixedLanguage("/en", en.html, "en");
assertLocalizedProgramCards("/en", en.html, "en");

const rootWithEn = await readPage("/", { cookie: "hamza-agency-language=en" });
assertRedirect({ path: "/ with EN cookie", response: rootWithEn.response, expectedLocation: "/en" });

const rootWithAr = await readPage("/", {
  cookie: "hamza-agency-language=ar",
  acceptLanguage: "ar-SY,ar;q=0.9",
});
assertLocalePage({ path: "/ with AR cookie", expectedLanguage: "ar", ...rootWithAr });
assertNoMixedLanguage("/ with AR cookie", rootWithAr.html, "ar");

for (const { label, acceptLanguage, expectedLocation, expectedLanguage } of [
  { label: "EN first visit", acceptLanguage: "en-US,en;q=0.9", expectedLocation: "/en", expectedLanguage: "en" },
  { label: "TR first visit", acceptLanguage: "tr-TR,tr;q=0.9", expectedLocation: "/tr", expectedLanguage: "tr" },
  { label: "AR first visit", acceptLanguage: "ar-SY,ar;q=0.9", expectedLocation: "/", expectedLanguage: "ar" },
]) {
  const firstVisit = await readPage("/", { acceptLanguage });
  if (expectedLocation === "/") {
    assertLocalePage({ path: label, expectedLanguage, ...firstVisit });
  } else {
    assertRedirect({ path: label, response: firstVisit.response, expectedLocation });
  }
}

const services = await readPage("/services", { cookie: "hamza-agency-language=tr" });
assert(services.response.status === 200 && !services.response.headers.get("location"), "Arabic services URL redirected because of a cookie.");
assert(services.html.includes('<html lang="ar"') && services.html.includes('data-site-language="ar"'), "Arabic services URL lost AR ownership.");
assert(services.html.includes('href="/programs"'), "Arabic services page does not retain Arabic program links.");

const programs = await readPage("/programs", { cookie: "hamza-agency-language=en" });
assert(programs.response.status === 200 && !programs.response.headers.get("location"), "Arabic programs URL redirected because of a cookie.");
assert(programs.html.includes('<html lang="ar"') && programs.html.includes('data-site-language="ar"'), "Arabic programs URL lost AR ownership.");
assert(programs.html.includes('href="/services"'), "Arabic programs page does not retain Arabic service links.");

for (const [path, page, language] of [["/ with AR cookie", rootWithAr, "ar"], ["/en", en, "en"], ["/tr", tr, "tr"]]) {
  assert(page.html.includes(`href="${language === "ar" ? "/" : `/${language}`}"`), `${path} is missing its locale-owned home link.`);
  if (!page.html.includes("data-announcement-locale")) continue;
  assert(page.html.includes('data-marquee-mechanics="ltr"'), `${path} ticker is not using mechanical LTR movement.`);
  assert(page.html.includes(`data-marquee-language="${language}"`), `${path} ticker language marker is missing.`);
  const groupCount = (page.html.match(/hamza-marquee-group/g) || []).length;
  assert(groupCount === 2, `${path} ticker rendered ${groupCount} marquee groups instead of 2.`);
}

console.log("Runtime locale verification passed: document-navigation headers, normalized redirects, explicit AR/EN/TR ownership, saved root preference, independent first-visit detection, localized program cards, clean language boundaries, locale links, no placeholders, and deterministic ticker mechanics.");
