import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const header=read("components/PublicGlobalHeader.tsx");
const language=read("components/LanguageSwitcher.tsx");
const dock=read("components/PublicMobileDock.tsx");
const agent=read("app/agent/arab-syria/page.tsx");
const agentSeo=read("app/agent/arab-syria/layout.tsx");
const home=read("app/page.tsx");
const homeAdmin=read("app/admin/settings/homepage/page.tsx");
const programAdmin=read("app/admin/programs/media/page.tsx");
const programPage=read("app/programs/[slug]/page.tsx");
const programCompat=read("lib/programMediaCompat.mjs");
const reviews=read("components/ReviewsPageContent.tsx");
const reviewAdmin=read("components/AdminReviewSubmissionsPanel.tsx");
const publicSubmit=read("app/api/public-submit/route.ts");
const signedGateway=read("lib/server/pr100SignedGateway.ts");
const edgeGateway=read("supabase/functions/pr100-vercel-oidc-gateway/index.ts");
const migration=read("supabase/migrations/20260809095000_pr116_owner_approved_reviews_program_media.sql");
const install=read("components/InstallAppPage.tsx");
const cookies=read("components/CookieConsent.tsx");
const support=read("lib/i18n/supportCopy.ts");
const smartSupport=read("lib/i18n/aiSupport.ts");

test("mobile header is shrinkable, mobile-safe, and agent-free",()=>{
  assert.match(header,/data-shrunk/);
  assert.match(header,/window\.scrollY>24/);
  assert.match(header,/md:hidden/);
  assert.match(header,/hidden min-w-0 items-center gap-1 md:flex/);
  assert.match(header,/وكالة حمزة/);
  assert.match(header,/Hamza Ajansı/);
  assert.doesNotMatch(header,/عراب سوريا|Godfather of Syria|Vaftiz Babası/);
});

test("language selector is a compact accessible dropdown",()=>{
  assert.match(language,/🌐/);
  assert.match(language,/aria-haspopup="menu"/);
  assert.match(language,/menuitemradio/);
  assert.match(language,/العربية/);
  assert.match(language,/English/);
  assert.match(language,/Türkçe/);
});

test("mobile dock uses measured safe area and a drawn support icon",()=>{
  assert.match(dock,/--public-mobile-dock-height/);
  assert.match(dock,/safe-area-inset-bottom/);
  assert.match(dock,/ResizeObserver/);
  assert.match(dock,/function SupportIcon/);
  assert.match(dock,/<svg/);
});

test("agent identity and SEO preserve exact owner-approved Arabic copy",()=>{
  assert.ok(agent.includes("⚔عܓོراب✴سܓོوريا⚔"));
  assert.ok(agent.includes("Godfather of Syria"));
  assert.ok(agent.includes("Suriye'nin Vaftiz Babası"));
  assert.ok(agent.includes("ويُعد الوكيل ⚔عܓོراب✴سܓོوريا⚔ من أبرز الوكلاء وأكثرهم أمانًا واحترافية على مستوى العالم، بفضل خبرته الواسعة ونهجه القائم على الثقة والخصوصية والمتابعة الدقيقة."));
  assert.match(agent,/whitespace-nowrap/);
  assert.match(agent,/unicode-bidi:isolate/);
  assert.ok(agentSeo.includes("عراب سوريا | الوكيل والمدير في HAMZA AGENCY"));
  assert.ok(agentSeo.includes("HAMZA AGENCY بإدارة الوكيل عراب سوريا، أحد أبرز وأكثر الوكلاء أمانًا واحترافية على مستوى العالم في إدارة ودعم وتطوير صناع المحتوى وبرامج البث المباشر."));
});

test("years of experience is settings-managed and homepage labels stay localized",()=>{
  assert.match(homeAdmin,/home_stat_5_number/);
  assert.match(homeAdmin,/defaultValue:"7"/);
  assert.match(home,/home_stat_5_number/);
  assert.match(home,/Years of experience/);
  assert.match(home,/Yıllık deneyim/);
  assert.match(home,/home_stat_\$\{index\+1\}_label_\$\{language\}/);
});

test("program media supports independent logo-cover modes and layouts 1 2 3",()=>{
  for(const value of ["logo","cover","logo_cover"])assert.ok(migration.includes(`'${value}'`));
  assert.match(migration,/detail_layout between 1 and 3/);
  assert.match(programAdmin,/Logo فقط/);
  assert.match(programAdmin,/Cover فقط/);
  assert.match(programAdmin,/Logo \+ Cover/);
  assert.match(programAdmin,/>1<\/option>/);
  assert.match(programAdmin,/>2<\/option>/);
  assert.match(programAdmin,/>3<\/option>/);
  assert.match(programPage,/layout===1/);
  assert.match(programPage,/layout===2/);
  assert.match(programCompat,/detail_layout/);
  assert.match(home,/programCardMedia/);
});

test("review intake is private, flexible, and never publishes private contact data",()=>{
  assert.match(migration,/create table if not exists public\.review_submissions/);
  assert.match(migration,/status in \('pending','approved','rejected'\)/);
  assert.match(migration,/alter table public\.reviews alter column reviewer_name drop not null/);
  assert.match(migration,/alter table public\.reviews alter column content drop not null/);
  assert.match(migration,/rating is null or rating between 1 and 5/);
  assert.match(migration,/rating is not null[\s\S]*nullif\(btrim\(content\),''\) is not null/);
  assert.match(migration,/revoke all on public\.review_submissions from anon, authenticated/);
  assert.match(migration,/pr116_moderate_review_submission/);
  const publishInsert=migration.match(/insert into public\.reviews\([\s\S]*?\) values \([\s\S]*?\) returning id into v_public_review_id;/)?.[0]||"";
  assert.doesNotMatch(publishInsert,/phone|contact_method|reference_number|extra_fields/);
  assert.match(reviewAdmin,/Enabled|مفعّل/);
  assert.match(reviewAdmin,/مطلوب/);
});

test("public review submission uses the protected signed gateway and visitor-safe copy",()=>{
  assert.match(publicSubmit,/"review"/);
  assert.match(publicSubmit,/review_submit/);
  assert.match(signedGateway,/review_submit/);
  assert.match(edgeGateway,/review_submit/);
  assert.match(migration,/pr99_guard_submission\('review'/);
  assert.ok(reviews.includes("شكرًا لك، تم استلام تقييمك."));
  assert.ok(reviews.includes("لا توجد تقييمات منشورة حاليًا."));
  assert.ok(reviews.includes("شارك تجربتك مع وكالة حمزة"));
  assert.doesNotMatch(reviews,/Pending|Moderation|Approval workflow|WhatsApp.*تقييم/);
});

test("install and cookie surfaces keep actual actions without implementation jargon",()=>{
  assert.match(install,/REQUEST_EVENT/);
  assert.match(install,/data-testid="install-app-action"/);
  assert.match(install,/Add to Home|strings\.fallbackDescription/);
  assert.doesNotMatch(install,/beforeinstallprompt/);
  assert.match(cookies,/cookie-accept-all/);
  assert.match(cookies,/cookie-necessary-only/);
  assert.match(cookies,/cookie-manage-preferences/);
  assert.match(cookies,/--public-mobile-dock-height/);
  assert.match(cookies,/safe-area-inset-bottom/);
});

test("public support names and availability copy match Owner decisions",()=>{
  assert.ok(support.includes("فريقنا متواجد لمتابعة طلباتكم ورسائلكم، وسيتم الرد عليكم في أقرب فرصة ممكنة."));
  assert.doesNotMatch(support,/قد تختلف سرعة الرد حسب ضغط الطلبات ونوع البرنامج أو الخدمة/);
  assert.match(smartSupport,/widgetTitle:"الدعم الذكي"/);
  assert.match(smartSupport,/widgetTitle:"Smart Support"/);
  assert.match(smartSupport,/widgetTitle:"Akıllı Destek"/);
  assert.doesNotMatch(smartSupport,/AI Support/);
});
