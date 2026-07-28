const baseUrl = process.env.HAMZA_RUNTIME_BASE_URL || "http://127.0.0.1:3000";

const placeholders = [
  "Localized content is being updated.",
  "Yerelleştirilmiş içerik güncelleniyor.",
];

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
  assert(
    html.includes(`<html lang="${expectedLanguage}"`),
    `${path} did not render html lang=${expectedLanguage}.`
  );
  assert(
    html.includes(`data-site-language="${expectedLanguage}"`),
    `${path} did not render data-site-language=${expectedLanguage}.`
  );
  for (const placeholder of placeholders) {
    assert(!html.includes(placeholder), `${path} rendered forbidden placeholder: ${placeholder}`);
  }
}

const tr = await readPage("/tr");
assertLocalePage({ path: "/tr", expectedLanguage: "tr", ...tr });
assert(
  tr.html.includes("HAMZA AGENCY ile Yönetim ve Gelişim") &&
    tr.html.includes("İçerik Üreticileri"),
  "/tr is missing approved Turkish homepage copy."
);

const arAfterTr = await readPage("/", "hamza-agency-language=tr");
assertLocalePage({ path: "/ with TR cookie", expectedLanguage: "ar", ...arAfterTr });
assert(
  arAfterTr.html.includes("وكالة حمزة لإدارة وتطوير") &&
    arAfterTr.html.includes("صناع المحتوى"),
  "Arabic homepage copy did not remain Arabic after a Turkish preference cookie."
);

const en = await readPage("/en", "hamza-agency-language=tr");
assertLocalePage({ path: "/en with TR cookie", expectedLanguage: "en", ...en });
assert(
  en.html.includes("HAMZA AGENCY for Managing and Developing") &&
    en.html.includes("Content Creators"),
  "/en is missing approved English homepage copy."
);

const arAfterEn = await readPage("/", "hamza-agency-language=en");
assertLocalePage({ path: "/ with EN cookie", expectedLanguage: "ar", ...arAfterEn });

const services = await readPage("/services", "hamza-agency-language=tr");
assertLocalePage({ path: "/services with TR cookie", expectedLanguage: "ar", ...services });
assert(services.html.includes('href="/programs"'), "Arabic services page does not retain Arabic program links.");

const programs = await readPage("/programs", "hamza-agency-language=en");
assertLocalePage({ path: "/programs with EN cookie", expectedLanguage: "ar", ...programs });
assert(programs.html.includes('href="/services"'), "Arabic programs page does not retain Arabic service links.");

for (const [path, page] of [["/", arAfterTr], ["/en", en], ["/tr", tr]]) {
  if (!page.html.includes("data-announcement-locale")) continue;
  assert(
    page.html.includes('data-marquee-mechanics="ltr"'),
    `${path} ticker is not using mechanical LTR movement.`
  );
  const groupCount = (page.html.match(/hamza-marquee-group/g) || []).length;
  assert(groupCount === 2, `${path} ticker rendered ${groupCount} marquee groups instead of 2.`);
}

console.log(
  "Runtime locale verification passed: TR→AR, EN→AR, Arabic services/programs retention, approved EN/TR homepage copy, no placeholders, and deterministic ticker mechanics."
);
