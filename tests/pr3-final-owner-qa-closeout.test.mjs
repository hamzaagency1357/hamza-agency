import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PR3 owner QA centralizes public WhatsApp and removes known hardcoded page links", async () => {
  const [config, contact, agent, programs, detail, dock] = await Promise.all([
    read("config/whatsapp.ts"), read("lib/publicContact.ts"), read("app/agent/arab-syria/page.tsx"),
    read("components/ProgramsPageContent.tsx"), read("app/programs/[slug]/page.tsx"), read("components/PublicMobileDock.tsx"),
  ]);
  assert.ok(config.includes('FALLBACK_PUBLIC_WHATSAPP = "905011730377"'));
  assert.ok(contact.includes('"primary_whatsapp"'));
  assert.ok(contact.includes('"support_whatsapp"'));
  for (const source of [agent, programs]) assert.ok(!source.includes("https://wa.me/905011730377"));
  assert.ok(agent.includes("getPublicContact"));
  assert.ok(programs.includes("whatsappHref"));
  assert.ok(detail.includes("FALLBACK_PUBLIC_WHATSAPP"));
  assert.ok(dock.includes("FALLBACK_PUBLIC_WHATSAPP"));
});

test("real apply flow explains program selection, privacy, response and APP tracking in three languages", async () => {
  const source = await read("app/apply/page.tsx");
  assert.ok(!source.includes("redirect("));
  for (const token of [
    "اختر البرنامج وابدأ طلب انضمام حقيقي", "رقمًا مرجعيًا يبدأ بـ APP", "سياسة الخصوصية",
    "Choose a program and start a real application", "APP reference number", "Privacy policy",
    "Programı seçin ve gerçek başvurunuzu başlatın", "APP ile başlayan bir referans numarası", "Gizlilik politikası",
    '#apply', 'localizePublicPath("/track",language)',
  ]) assert.ok(source.includes(token), token);
});

test("program media schema and admin cover logo hero mobile OG and trilingual alt", async () => {
  const [migration, admin, grid, detail, og] = await Promise.all([
    read("supabase/migrations/20260808090000_pr3_final_owner_qa_closeout.sql"),
    read("app/admin/programs/media/page.tsx"), read("components/ProgramsGridWithTranslations.tsx"),
    read("app/programs/[slug]/page.tsx"), read("app/programs/[slug]/opengraph-image.tsx"),
  ]);
  for (const field of ["logo_url","hero_image_url","mobile_image_url","og_image_url","alt_ar","alt_en","alt_tr"]) {
    assert.ok(migration.includes(field), field); assert.ok(admin.includes(field), field);
  }
  assert.ok(grid.includes("program.logo_url||getLegacyProgramLogoUrl"));
  assert.ok(detail.includes("program?.hero_image_url||program?.mobile_image_url||program?.logo_url"));
  assert.ok(og.includes("readProgramMediaBySlug"));
  assert.ok(!og.includes('select("name,og_image_url")'));
});

test("admin navigation is sanitized and consumed by public header footer quick nav and CTA config", async () => {
  const [nav, header, footer, quick] = await Promise.all([
    read("lib/publicNavigation.ts"), read("components/PublicGlobalHeader.tsx"),
    read("components/PublicFooterLinks.tsx"), read("components/PublicQuickNav.tsx"),
  ]);
  for (const key of ["public_header_links_json","public_footer_links_json","public_quick_nav_groups_json","public_cta_links_json"]) assert.ok(nav.includes(key), key);
  assert.ok(nav.includes('if(/^https:\\/\\//i.test(href)'));
  assert.ok(!nav.includes('href.startsWith("http://")'));
  assert.ok(header.includes("getPublicNavigationConfig"));
  assert.ok(footer.includes("getPublicNavigationConfig"));
  assert.ok(quick.includes("getPublicNavigationConfig"));
  assert.ok(nav.includes('key:"primary_join"'));
  assert.ok(nav.includes('key:"view_programs"'));
  assert.ok(nav.includes('key:"contact"'));
});

test("blog closeout supports five lifecycle states and full multilingual publishing metadata", async () => {
  const [migration, manager, reader, article] = await Promise.all([
    read("supabase/migrations/20260808090000_pr3_final_owner_qa_closeout.sql"), read("components/AdminBlogManager.tsx"),
    read("lib/blog/serverPosts.ts"), read("app/blog/[slug]/page.tsx"),
  ]);
  for (const state of ["draft","review","scheduled","published","archived"]) { assert.ok(migration.includes(`'${state}'`)); assert.ok(manager.includes(`\"${state}\"`) || manager.includes(`"${state}"`)); }
  for (const field of ["author_name","image_alt","og_title","og_description","og_image_url","canonical_url","allow_index"]) assert.ok(migration.includes(field), field);
  for (const token of ["authorName","imageAlt","ogTitle","ogDescription","ogImage","canonical","allowIndex"]) assert.ok(reader.includes(token) || article.includes(token), token);
});

test("marketplace status and member portal are reachable without indexing unready public surfaces", async () => {
  const [nav, locales, marketplace, status] = await Promise.all([
    read("lib/publicNavigation.ts"), read("lib/i18n/publicLocales.ts"), read("app/marketplace/page.tsx"), read("app/platform-status/page.tsx"),
  ]);
  for (const href of ['/marketplace','/platform-status','/portal/login']) assert.ok(nav.includes(href), href);
  assert.ok(locales.includes('"/marketplace"'));
  assert.ok(locales.includes('"/platform-status"'));
  assert.ok(locales.includes('"/marketplace","/platform-status"') || (locales.includes('"/marketplace"') && locales.includes('"/platform-status"')));
  assert.ok(marketplace.includes("index:false"));
  assert.ok(status.includes("index:false"));
});

test("footer and dock reserve safe area and avoid public content coverage", async () => {
  const [footer, dock] = await Promise.all([read("components/PublicFooterLinks.tsx"), read("components/PublicMobileDock.tsx")]);
  assert.ok(footer.includes("--public-mobile-dock-height"));
  assert.ok(footer.includes("env(safe-area-inset-bottom)"));
  assert.ok(dock.includes("--public-mobile-dock-height"));
  assert.ok(dock.includes("env(safe-area-inset-bottom)"));
  assert.ok(footer.includes('readable:"عراب سوريا"'));
  assert.ok(footer.includes("AGENT_PUBLIC_PATH"));
  assert.ok(footer.includes('data-testid="footer-agent-link"'));
  assert.ok(!footer.includes("⚔عܓོراب✴سܓོوريا⚔"));
  assert.ok(footer.includes("[unicode-bidi:isolate]"));
});

test("agent mobile closeout keeps one dock clearance and lists every open program", async () => {
  const [agent, css] = await Promise.all([read("app/agent/arab-syria/page.tsx"), read("app/owner-final-qa.css")]);
  assert.ok(agent.includes("TikTok, BIGO LIVE, Yaahlan, Xena, Catchii"));
  assert.ok(agent.includes('className="relative overflow-hidden bg-[#070009] pb-6 text-white sm:pb-8"'));
  assert.ok(!agent.includes("pb-[calc(6rem+env(safe-area-inset-bottom))]"));
  assert.ok(css.includes("--public-mobile-dock-clearance"));
  assert.ok(!css.includes("--public-mobile-dock-end-clearance"));
});
