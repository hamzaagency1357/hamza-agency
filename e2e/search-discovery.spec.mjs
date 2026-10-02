import { test, expect } from "@playwright/test";

const cases = [
  { path: "/", language: "ar", direction: "rtl", heading: "وكالة للبث المباشر ودعم صناع المحتوى" },
  { path: "/en", language: "en", direction: "ltr", heading: "A live-streaming agency supporting content creators" },
  { path: "/tr", language: "tr", direction: "ltr", heading: "Canlı yayın ve içerik üreticisi destek ajansı" },
];

for (const item of cases) {
  test(`search crawlers receive ${item.language} content without JavaScript`, async ({ request }) => {
    const response = await request.get(item.path, { headers: { "User-Agent": "OAI-SearchBot" } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(new RegExp(`<html\\b[^>]*lang="${item.language}"[^>]*dir="${item.direction}"`));
    expect(html).toContain('name="robots" content="index, follow"');

    // Read the visible section itself, excluding serialized hydration data.
    const section = html.match(/<section\b[^>]*data-testid="agency-discovery"[^>]*>[\s\S]*?<\/section>/)?.[0];
    expect(section).toBeTruthy();
    expect(section).toContain(item.heading);
    expect(section.match(/<h3\b/g)).toHaveLength(4);
    const prefix = item.language === "ar" ? "" : `/${item.language}`;
    for (const path of ["/services", "/programs", "/programs/tiktok", "/programs/bigo-live"]) {
      expect(section).toContain(`href="${prefix}${path}"`);
      const linked = await request.get(`${prefix}${path}`);
      expect(linked.status()).toBe(200);
    }
  });
}
