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
  assert.ok(contact.includes("setTrackingCode(result.trackingCode || \"\")"));
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
  assert.ok(!agent.includes("من أبرز الوكلاء وأكثرهم أمانًا واحترافية على مستوى العالم"));
  assert.ok(!seo.includes("أحد أبرز وأكثر الوكلاء أمانًا واحترافية على مستوى العالم"));
});

test("decorated agent identity remains secondary and mobile-safe", async () => {
  const agent = await read("app/agent/arab-syria/page.tsx");
  assert.ok(agent.includes('<h1 className="mt-5 text-4xl font-black leading-tight md:text-7xl">{t.title}</h1>'));
  assert.ok(agent.includes('<p aria-hidden="true"'));
  assert.ok(agent.includes("max-w-full"));
  assert.ok(agent.includes("whitespace-nowrap"));
  assert.ok(agent.includes("text-[clamp(0.68rem,3vw,0.95rem)]"));
  assert.ok(!agent.includes("text-3xl font-black text-transparent md:text-5xl"));
  assert.ok(agent.includes('localizePublicHref("/contact", language)'));
  assert.ok(agent.includes('localizePublicHref("/about", language)'));
  assert.ok(agent.includes("{AGENT_PUBLIC_PATH}"));
});
