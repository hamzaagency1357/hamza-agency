import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public reference-number copy preserves tracking contracts", async () => {
  const [contact, receipt, tracking] = await Promise.all([
    read("components/PublicContactForm.tsx"),
    read("components/TrackingReceipt.tsx"),
    read("app/track/page.tsx"),
  ]);
  for (const value of [
    "تُرسل رسالتك عبر مسار خادم محمي، وستحصل على رقم مرجعي لمتابعة طلبك.",
    "تم استلام رسالتك. احتفظ بالرقم المرجعي التالي.",
    "Your message is sent through a protected server route. You will receive a reference number to follow up on your request.",
    "Your message was received. Keep the reference number below.",
    "Mesajınız korumalı bir sunucu yolu üzerinden gönderilir. Talebinizi takip etmek için bir referans numarası alırsınız.",
    "Mesajınız alındı. Aşağıdaki referans numarasını saklayın.",
  ]) assert.ok(contact.includes(value), value);
  for (const oldValue of ["رقم CNT", "CNT tracking number", "CNT takip numarası"]) {
    assert.ok(!contact.includes(oldValue));
    assert.ok(!receipt.includes(oldValue));
    assert.ok(!tracking.includes(oldValue));
  }
  assert.ok(contact.includes('submitPublicForm(\n        "contact"'));
  assert.ok(contact.includes('setTrackingCode(result.trackingCode || "")'));
  assert.ok(tracking.includes("const pattern = /^(APP|SR|JOB|CNT)-[0-9]{4}-[A-F0-9]{10}$/;"));
  assert.ok(tracking.includes('fetch("/api/track"'));
});

test("blog Open Graph remains institutional", async () => {
  const [image, seo, rss] = await Promise.all([
    read("app/blog/opengraph-image.tsx"),
    read("lib/i18n/publicSeo.ts"),
    read("app/blog/rss/route.ts"),
  ]);
  assert.ok(!image.includes("Arab Syria Blog"));
  assert.ok(image.includes('export const alt = "HAMZA AGENCY Blog";'));
  assert.ok(image.includes(">HAMZA AGENCY</div>"));
  assert.ok(image.includes(">Blog</div>"));
  assert.ok(seo.includes('\"/blog\": { title: \"مدونة HAMZA AGENCY\"'));
  assert.ok(rss.includes("مدونة HAMZA AGENCY"));
  assert.ok(rss.includes("HAMZA AGENCY Blogu"));
  assert.ok(rss.includes("HAMZA AGENCY Blog"));
});

test("management and agent identity uses translated meaning", async () => {
  const [ui, agent, seo, header, structured] = await Promise.all([
    read("components/AboutStaticUi.tsx"),
    read("app/agent/arab-syria/page.tsx"),
    read("lib/i18n/publicSeo.ts"),
    read("components/PublicGlobalHeader.tsx"),
    read("components/StructuredData.tsx"),
  ]);
  assert.ok(ui.includes("تُدار وكالة حمزة بإشراف الوكيل عراب سوريا"));
  assert.ok(ui.includes("HAMZA AGENCY is managed under the supervision of the Godfather of Syria"));
  assert.ok(ui.includes("Suriye'nin Vaftiz Babası'nın gözetiminde"));
  for (const source of [agent, seo, header, structured]) {
    assert.ok(source.includes("Godfather of Syria"));
    assert.ok(source.includes("Suriye'nin Vaftiz Babası"));
    assert.ok(!source.includes("Arab Syria"));
  }
});

test("decorated agent hero matches approved visual structure", async () => {
  const agent = await read("app/agent/arab-syria/page.tsx");
  for (const value of [
    'data-testid="agent-primary-identity"',
    '<span className="sr-only">{t.readableName}</span>',
    "<bdi",
    'aria-hidden="true"',
    'dir="ltr"',
    '[unicode-bidi:isolate]',
    "⚔عܓོراب✴سܓོوريا⚔",
    "max-w-full",
    "whitespace-nowrap",
    "text-[clamp(1.5rem,7.2vw,4.5rem)]",
    "{t.roleLine}",
    "HAMZA AGENCY",
    "{t.menu}",
    "{t.about}",
    "{t.whatsapp}",
    "{t.managementTitle}",
    "{t.aboutTitle}",
    "{t.ribbon}",
    "BIGO LIVE, Yaahlan, Xena, Catchii",
    'localizePublicHref("/about", language)',
    "WHATSAPP_URL",
    "{AGENT_PUBLIC_PATH}",
  ]) assert.ok(agent.includes(value), value);
  assert.ok(!agent.includes("<PublicBreadcrumbs"));
});

test("language switching preserves router contracts and skips stale Arabic-home prefetch", async () => {
  const switcher = await read("components/LanguageSwitcher.tsx");
  for (const value of [
    "router.prefetch",
    "router.replace",
    "useTransition",
    "scroll: false",
    "rememberLanguagePreference(nextLanguage);",
    'const arabicPath = localizePublicPath(pathname || "/", "ar");',
    'activeLanguage !== "ar" && code === "ar" && arabicPath === "/"',
    "if (returningToArabicHomepage) continue;",
  ]) assert.ok(switcher.includes(value), value);
  assert.ok(!switcher.includes("window.location.assign"));
});

test("public primary navigation stays in one horizontal row", async () => {
  const header = await read("components/PublicGlobalHeader.tsx");
  for (const value of ["overflow-x-auto", "min-w-max", "whitespace-nowrap", "[scrollbar-width:none]", "public-primary-navigation"]) assert.ok(header.includes(value), value);
  const order = [
    '{ label: "الرئيسية", href: "/" }',
    '{ label: "البرامج", href: "/programs" }',
    '{ label: "الخدمات", href: "/services" }',
    '{ label: "قصص النجاح", href: "/success-stories" }',
    '{ label: "المدونة", href: "/blog" }',
    '{ label: "الوكيل", href: AGENT_PUBLIC_PATH }',
    '{ label: "تواصل معنا", href: "/contact" }',
  ];
  let cursor = -1;
  for (const item of order) {
    const next = header.indexOf(item);
    assert.ok(next > cursor, item);
    cursor = next;
  }
});

test("known public agent identity sources do not contain removed global-ranking claim", async () => {
  const sources = await Promise.all([
    read("app/agent/arab-syria/page.tsx"),
    read("lib/i18n/publicSeo.ts"),
    read("components/StructuredData.tsx"),
    read("lib/i18n/siteRuntimeTranslationsLegacy.ts"),
  ]);
  for (const source of sources) {
    assert.ok(!source.includes("من أبرز الوكلاء وأكثرهم أمانًا واحترافية على مستوى العالم"));
    assert.ok(!source.includes("أحد أبرز وأكثر الوكلاء أمانًا واحترافية على مستوى العالم"));
  }
});
