import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
test("PR116 owner final delta contracts are closed",()=>{
 const home=read("app/page.tsx"),adminHome=read("app/admin/settings/homepage/page.tsx"),nav=read("lib/publicNavigation.ts"),settings=read("app/admin/settings/page.tsx"),apply=read("app/apply/page.tsx"),digital=read("app/digital-services/page.tsx"),blog=read("app/admin/blog/page.tsx"),quick=read("components/AdminQuickNav.tsx"),login=read("app/admin/login/page.tsx"),program=read("app/programs/[slug]/page.tsx"),agent=read("app/agent/arab-syria/page.tsx"),dock=read("components/PublicMobileDock.tsx"),migration=read("supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql");
 for(const token of ["home_stat_4_number","home_stat_4_label_ar","home_stat_4_label_en","home_stat_4_label_tr"]) assert.ok(adminHome.includes(token),token);
 assert.ok(home.includes("+50")); assert.ok(home.includes("home_stat_${item.key}_number"));
 for(const path of ["/digital-services","/apply"]) { assert.ok(settings.includes(path),path); assert.ok(nav.includes(path)||settings.includes(path),path); }
 assert.ok(apply.includes("getPublicNavigationConfig")||apply.includes("localizePublicHref")); assert.ok(nav.includes("const headerLinks=[...config.headerLinks]"));
 assert.ok(digital.includes("digital")||digital.includes("الخدمات الرقمية"));
 assert.ok(blog.includes("AdminBlogManager")); assert.ok(quick.includes("/admin/blog"));
 for(const group of ["border-sky-400/25","border-violet-400/25","border-emerald-400/25","border-amber-400/25","border-rose-400/25","border-fuchsia-400/25","border-slate-400/25"]) assert.ok(quick.includes(group),group);
 assert.ok(login.includes("bg-[#070009]")); assert.ok(program.includes("font-black")||program.includes("font-bold")); assert.ok(agent.includes("font-black")||agent.includes("font-bold")); assert.ok(dock.includes("tenant-primary")||dock.includes("purple"));
 assert.match(migration,/alter table public\.agency_applications drop constraint if exists applications_status_check/);
 assert.match(migration,/alter table public\.agency_applications add constraint applications_status_check/);
 assert.match(migration,/alter table public\.agency_applications validate constraint applications_status_check/);
 assert.doesNotMatch(migration,/\bpublic\.applications\b/);
 for(const status of ["'new'","'under_review'","'contacted'","'accepted'","'rejected'","'archived'"]) assert.ok(migration.includes(status),status);
 assert.doesNotMatch(migration,/\b(?:update\s+public\.agency_applications|delete\s+from\s+public\.agency_applications|insert\s+into\s+public\.agency_applications|truncate\s+(?:table\s+)?public\.agency_applications)\b/i);
 for(const rpc of ["pr3_save_blog_post","pr4_notification_action","pr99_restore_trash","pr116_moderate_review_submission","save_page_builder_draft"]) assert.ok(migration.includes(rpc),rpc);
 assert.ok(!migration.includes("pr100_admin_requests_index")); assert.ok(!migration.includes("pr99_backup_schedule_status"));
});

test("mobile Dock release-candidate surfaces remain semantically distinct",()=>{
 const dock=read("components/PublicMobileDock.tsx");
 const css=read("app/owner-verified-delta.css");
 for(const id of ["mobile-quick-navigation","mobile-ai-support","mobile-whatsapp"]){
  assert.ok(dock.includes(`data-testid=\"${id}\"`),id);
  assert.ok(css.includes(`[data-testid=\"${id}\"]`),id);
 }
 const menu=css.slice(css.indexOf('[data-testid="mobile-quick-navigation"]'),css.indexOf('[data-testid="mobile-ai-support"]'));
 const support=css.slice(css.indexOf('[data-testid="mobile-ai-support"]'),css.indexOf('[data-testid="mobile-whatsapp"]'));
 const whatsapp=css.slice(css.indexOf('[data-testid="mobile-whatsapp"]'));
 assert.match(menu,/linear-gradient[\s\S]*rgba\(10,6,12/);
 assert.match(menu,/242,207,100/);
 assert.match(support,/109,40,217|124,58,237/);
 assert.match(whatsapp,/22,163,74|34,197,94/);
 for(const block of [menu,support,whatsapp]) assert.doesNotMatch(block,/background:\s*(?:white|#fff(?:fff)?|rgba\(255,255,255)/i);
 assert.notEqual(menu,support);
 assert.notEqual(support,whatsapp);
 assert.notEqual(menu,whatsapp);
});
