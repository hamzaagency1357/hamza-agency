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

test("management and agent copy is distinct and professional", async () => {
  const [ui, about, agent, seo] = await Promise.all([
    read("components/AboutStaticUi.tsx"),
    read("app/about/page.tsx"),
    read("app/agent/arab-syria/page.tsx"),
    read("lib/i18n/publicSeo.ts"),
  ]);
  assert.ok(ui.includes("تُدار وكالة حمزة بإشراف الوكيل عراب سوريا، وفق معايير مهنية تركز على الثقة والخصوصية والمتابعة الدقيقة."));
  assert.ok(ui.includes("HAMZA AGENCY is managed under the supervision of agent Arab Syria, following professional standards focused on trust, privacy, and careful follow-up."));
  assert.ok(ui.includes("HAMZA AGENCY, güven, gizlilik ve titiz takibe odaklanan profesyonel standartlar doğrultusunda Arab Syria temsilcisinin gözetiminde yönetilir."));
  for (const value of ["عن الوكيل", "About the agent", "Temsilci hakkında"]) assert.ok(about.includes(value));
  assert.ok(agent.includes("يشرف عراب سوريا على دعم وتطوير صناع المحتوى وبرامج البث المباشر، مستندًا إلى خبرة واسعة ونهج قائم على الأمان والخصوصية والمتابعة المهنية."));
  for (const banned of [
    "من أبرز الوكلاء وأكثرهم أمانًا واحترافية على مستوى العالم",
    "أحد أبرز وأكثر الوكلاء أمانًا واحترافية على مستوى العالم",
  ]) {
    assert.ok(!agent.includes(banned));
    assert.ok(!seo.includes(banned));
  }
});

test("decorated agent identity is primary, readable, isolated, and mobile-safe", async () => {
  const agent = await read("app/agent/arab-syria/page.tsx");
  assert.ok(agent.includes('data-testid="agent-primary-identity"'));
  assert.ok(agent.includes('<span className="sr-only">{t.readableName}</span>'));
  assert.ok(agent.includes("<bdi"));
  assert.ok(agent.includes('aria-hidden="true"'));
  assert.ok(agent.includes('dir="ltr"'));
  assert.ok(agent.includes('[unicode-bidi:isolate]'));
  assert.ok(agent.includes("⚔عܓོراب✴سܓོوريا⚔"));
  assert.ok(agent.includes("max-w-full"));
  assert.ok(agent.includes("whitespace-nowrap"));
  assert.ok(agent.includes("text-[clamp(1.5rem,7.2vw,4.25rem)]"));
  assert.ok(agent.includes("{t.roleLine}"));
  assert.ok(agent.includes(">\n            HAMZA AGENCY\n          </p>"));
  assert.ok(!agent.includes("<PublicBreadcrumbs"));
  assert.ok(!agent.includes("{t.title}</h1>"));
  assert.ok(agent.includes('localizePublicHref("/contact", language)'));
  assert.ok(agent.includes('localizePublicHref("/about", language)'));
  assert.ok(agent.includes("{AGENT_PUBLIC_PATH}"));
});

test("language switching avoids stale prefetch redirects when returning to Arabic", async () => {
  const switcher = await read("components/LanguageSwitcher.tsx");
  assert.ok(switcher.includes("rememberLanguagePreference(nextLanguage);"));
  assert.ok(switcher.includes("const target = `${localizedTargets[nextLanguage]}${window.location.search}${window.location.hash}`;"));
  assert.ok(switcher.includes("window.location.assign(target);"));
  assert.ok(!switcher.includes("router.prefetch"));
  assert.ok(!switcher.includes("router.replace"));
  assert.ok(!switcher.includes("useRouter"));
});

test("public primary navigation stays in one horizontal row", async () => {
  const header = await read("components/PublicGlobalHeader.tsx");
  for (const value of [
    "overflow-x-auto",
    "min-w-max",
    "whitespace-nowrap",
    "[scrollbar-width:none]",
    "public-primary-navigation",
  ]) assert.ok(header.includes(value), value);
  assert.ok(!header.includes("grid-cols-3"));
  assert.ok(!header.includes("sm:grid-cols-4"));
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

test("known public agent identity sources do not contain the removed global-ranking claim", async () => {
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
