import fs from "node:fs";

const read=(file)=>fs.readFileSync(file,"utf8");
const write=(file,value)=>fs.writeFileSync(file,value);
function replace(file,before,after,label){const source=read(file);if(!source.includes(before))throw new Error(`Missing ${label} in ${file}`);write(file,source.replace(before,after));}
function replaceAll(file,pairs){let source=read(file);for(const [before,after] of pairs){if(!source.includes(before))continue;source=source.replaceAll(before,after)}write(file,source)}

// Five Owner-approved homepage statistics: Admin -> public, with AR/EN/TR fallbacks.
replace("app/page.tsx",
'number:"24/7",label:"دعم ومتابعة",key:3},{number:"7",label:"سنوات خبرة",key:5',
'number:"24/7",label:"دعم ومتابعة",key:3},{number:"+50",label:"فرصة نجاح شهريًا",key:4},{number:"7",label:"سنوات خبرة",key:5',"AR stat 4");
replace("app/page.tsx",
'number:"24/7",label:"Support & follow-up",key:3},{number:"7",label:"Years of experience",key:5',
'number:"24/7",label:"Support & follow-up",key:3},{number:"+50",label:"Monthly success opportunities",key:4},{number:"7",label:"Years of experience",key:5',"EN stat 4");
replace("app/page.tsx",
'number:"24/7",label:"Destek ve takip",key:3},{number:"7",label:"Yıllık deneyim",key:5',
'number:"24/7",label:"Destek ve takip",key:3},{number:"+50",label:"Aylık başarı fırsatı",key:4},{number:"7",label:"Yıllık deneyim",key:5',"TR stat 4");
replace("app/page.tsx",
'const stats=t.stats.map((item)=>[item.number,item.label] as const);',
'const stats=t.stats.map((item)=>[setting(settings,[`home_stat_${item.key}_number`],item.number),setting(settings,[`home_stat_${item.key}_label_${language}`],item.label)] as const);',"Admin-to-public stats");
replaceAll("app/page.tsx",[["lg:grid-cols-4","lg:grid-cols-5"]]);

replace("app/admin/settings/homepage/page.tsx",
' {key:"home_stat_3_number",label:"قيمة الدعم والمتابعة",description:"القيمة الظاهرة في بطاقة الدعم والمتابعة، مثل 24/7.",defaultValue:"24/7",sortOrder:70},{key:"home_stat_3_label_ar",label:"تسمية الدعم — العربية",description:"النص العربي لبطاقة الدعم والمتابعة.",defaultValue:"دعم ومتابعة",sortOrder:71},{key:"home_stat_3_label_en",label:"تسمية الدعم — الإنجليزية",description:"النص الإنجليزي لبطاقة الدعم والمتابعة.",defaultValue:"Support & follow-up",sortOrder:72},{key:"home_stat_3_label_tr",label:"تسمية الدعم — التركية",description:"النص التركي لبطاقة الدعم والمتابعة.",defaultValue:"Destek ve takip",sortOrder:73},\n',
' {key:"home_stat_3_number",label:"قيمة الدعم والمتابعة",description:"القيمة الظاهرة في بطاقة الدعم والمتابعة، مثل 24/7.",defaultValue:"24/7",sortOrder:70},{key:"home_stat_3_label_ar",label:"تسمية الدعم — العربية",description:"النص العربي لبطاقة الدعم والمتابعة.",defaultValue:"دعم ومتابعة",sortOrder:71},{key:"home_stat_3_label_en",label:"تسمية الدعم — الإنجليزية",description:"النص الإنجليزي لبطاقة الدعم والمتابعة.",defaultValue:"Support & follow-up",sortOrder:72},{key:"home_stat_3_label_tr",label:"تسمية الدعم — التركية",description:"النص التركي لبطاقة الدعم والمتابعة.",defaultValue:"Destek ve takip",sortOrder:73},\n {key:"home_stat_4_number",label:"فرص النجاح الشهرية",description:"القيمة المعتمدة لفرص النجاح الشهرية.",defaultValue:"+50",sortOrder:75},{key:"home_stat_4_label_ar",label:"تسمية فرص النجاح — العربية",description:"النص العربي لبطاقة فرص النجاح الشهرية.",defaultValue:"فرصة نجاح شهريًا",sortOrder:76},{key:"home_stat_4_label_en",label:"تسمية فرص النجاح — الإنجليزية",description:"النص الإنجليزي لبطاقة فرص النجاح الشهرية.",defaultValue:"Monthly success opportunities",sortOrder:77},{key:"home_stat_4_label_tr",label:"تسمية فرص النجاح — التركية",description:"النص التركي لبطاقة فرص النجاح الشهرية.",defaultValue:"Aylık başarı fırsatı",sortOrder:78},\n',"homepage admin stat 4");
replaceAll("app/admin/settings/homepage/page.tsx",[["بطاقات صناع المحتوى والمنصات والدعم وسنوات الخبرة","بطاقات صناع المحتوى والمنصات والدعم وفرص النجاح الشهرية وسنوات الخبرة"]]);

// Keep marketing safety aligned with the exact current Owner set and remove obsolete 500+ residue.
replaceAll("lib/i18n/marketingSafety.ts",[
["homepage statistics 7000+ / 5+ / 24/7 / 7","homepage statistics 7000+ / 5+ / 24/7 / +50 / 7"],
['["50+ فرصة نجاح شهرية", "50+ فرصة نجاح شهرية"],','["+50 فرصة نجاح شهريًا", "+50 فرصة نجاح شهريًا"],'],
['    ["500+ فرصة نجاح شهرية", "500+ فرصة نجاح شهرية"],\n',""],
['["50+ monthly success opportunities", "50+ monthly success opportunities"],','["+50 Monthly success opportunities", "+50 Monthly success opportunities"],'],
['    ["500+ monthly success opportunities", "500+ monthly success opportunities"],\n',""],
['["50+ aylık başarı fırsatı", "50+ aylık başarı fırsatı"],','["+50 Aylık başarı fırsatı", "+50 Aylık başarı fırsatı"],'],
['    ["500+ aylık başarı fırsatı", "500+ aylık başarı fırsatı"],\n',""]]);

// Human employee-facing language: no raw infra/migration/SEO/CMS/OG/slug jargon in the touched Admin surfaces.
replaceAll("app/admin/login/page.tsx",[["Supabase غير متصل حالياً.","خدمة تسجيل الدخول غير متاحة حاليًا. حاول مرة أخرى بعد قليل."]]);
replaceAll("components/AdminBlogManager.tsx",[
["إدارة المدونة تحتاج Migration الخاصة بـ PR 3.","إعدادات قاعدة البيانات الخاصة بالمدونة غير مكتملة في هذه البيئة."],
["حقول PR #112 تحتاج Migration المرفقة قبل الحفظ في هذه البيئة.","بعض حقول المدونة تحتاج تهيئة قاعدة البيانات قبل الحفظ في هذه البيئة."],
["عنوان SEO","عنوان الظهور في محركات البحث"],["وصف SEO","وصف الظهور في محركات البحث"],["Alt للصورة","وصف الصورة"],["OG title","عنوان المشاركة"],["OG description","وصف المشاركة"],["OG image","صورة المشاركة"],["Canonical","الرابط الأساسي"]]);
replaceAll("components/AdminManagementPageBuilder.tsx",[
['label:"Hero"','label:"واجهة رئيسية"'],['label:"CTA"','label:"دعوة لاتخاذ إجراء"'],['label:"FAQ"','label:"أسئلة شائعة"'],["PR #99 Page Builder","إدارة الصفحات"],["حفظ ونشر Transactional، إصدارات، واسترجاع آمن دون فقدان النسخة السابقة.","حفظ ونشر منظم مع سجل للإصدارات وإمكانية الاسترجاع الآمن."],["Slug","الرابط المختصر"],["SEO title","عنوان الظهور في محركات البحث"],["Canonical URL","الرابط الأساسي"],["OG image URL","صورة المشاركة"],["SEO description","وصف الظهور في محركات البحث"],["تم حفظ المسودة Transactional بنجاح.","تم حفظ المسودة بنجاح."],["تم النشر وإنشاء Version وتسجيل العملية.","تم النشر وإنشاء إصدار جديد وتسجيل العملية."]]);
replaceAll("components/AdminMultilingualCmsWorkbench.tsx",[["CMS AR / EN / TR","إدارة المحتوى بالعربية والإنجليزية والتركية"]]);
replaceAll("components/AdminTrashOperations.tsx",[["Soft Delete / Restore","الحذف والاسترجاع الآمن"]]);
replaceAll("components/AdminReviewSubmissionsPanel.tsx",[
["تأكد من تطبيق Migration PR #116 في البيئة المقصودة.","تأكد من اكتمال تهيئة قاعدة البيانات في البيئة المقصودة."],["تحقق من الصلاحيات وتطبيق Migration.","تحقق من الصلاحيات وتهيئة قاعدة البيانات."],[">Pending<",">قيد المراجعة<"],[">Approved<",">معتمد<"],[">Rejected<",">مرفوض<"],[">Phone: ",">الهاتف: "],["<span>Contact: ","<span>التواصل: "],["<span>Reference: ","<span>المرجع: "],["<span>Service: ","<span>الخدمة: "],[">Approved</button>",">اعتماد</button>"],[">Rejected</button>",">رفض</button>"]]);
replaceAll("app/admin/settings/page.tsx",[["17B — Navigation Settings Foundation","إعداد روابط الموقع"],["أساس No-Code Navigation","إدارة روابط الموقع دون تعديل برمجي"],["Settings CMS","إعدادات الموقع"]]);
replaceAll("app/admin/sections/page.tsx",[["صفحات CMS","صفحات الموقع"],[">Stats<",">إحصائيات<"]]);
replaceAll("components/admin/ProductAnalyticsConsole.tsx",[["Product Expansion Analytics","تحليلات تشغيل الوكالة"]]);
replaceAll("components/admin/ProductExpansionConsole.tsx",[["PR101 Product Expansion","إدارة توسع الوكالة"],["Feature flags","خيارات الميزات"]]);
replaceAll("components/admin/TenantGovernanceConsole.tsx",[["Feature Flags","خيارات الميزات"]]);

// Extend prepared-only lockdown to every newly migrated stateful Admin RPC; keep read-only RPCs absent.
{
 const file="supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql";let source=read(file);
 const old="array['pr4_promote_suggestion', 'pr4_save_knowledge', 'pr4_support_action', 'publish_translation_candidate', 'refresh_product_kpis', 'review_translation_candidate', 'save_translation_candidate_fields']";
 const next="array['pr3_publish_blog_post', 'pr3_save_blog_post', 'pr3_unpublish_blog_post', 'pr4_notification_action', 'pr4_promote_suggestion', 'pr4_save_knowledge', 'pr4_support_action', 'pr99_backup_dry_run', 'pr99_create_private_backup', 'pr99_mark_notifications_read', 'pr99_permanent_delete_trash', 'pr99_restore_backup', 'pr99_restore_trash', 'pr99_unpublish_page', 'pr116_moderate_review_submission', 'publish_page_builder_page', 'publish_translation_candidate', 'refresh_product_kpis', 'review_translation_candidate', 'save_page_builder_draft', 'save_translation_candidate_fields']";
 if(!source.includes(old))throw new Error("RPC lockdown marker missing");source=source.replace(old,next);write(file,source);
}

// Tests: exact five-stat contract + Admin-to-public + navigation/apply/digital/blog/color/style/application status closeout.
replaceAll("tests/pr116-final-delta.test.mjs",[
["for(const value of ['number:\"7000+\"','number:\"5+\"','number:\"24/7\"','number:\"7\"'])","for(const value of ['number:\"7000+\"','number:\"5+\"','number:\"24/7\"','number:\"+50\"','number:\"7\"'])"],
["assert.ok(source.includes('number:\"7\",label:\"سنوات خبرة\"'));","assert.ok(source.includes('number:\"+50\",label:\"فرصة نجاح شهريًا\"'));\n  assert.ok(source.includes('number:\"7\",label:\"سنوات خبرة\"'));"],
["assert.ok(compact(source).includes('conststats=t.stats.map((item)=>[item.number,item.label]asconst));","assert.ok(compact(source).includes('conststats=t.stats.map((item)=>[setting(settings,[`home_stat_${item.key}_number`],item.number),setting(settings,[`home_stat_${item.key}_label_${language}`],item.label)]asconst));"]]);
replaceAll("tests/pr116-owner-directives.test.mjs",[
["'number:\"24/7\",label:\"دعم ومتابعة\"','number:\"7\",label:\"سنوات خبرة\"","'number:\"24/7\",label:\"دعم ومتابعة\"','number:\"+50\",label:\"فرصة نجاح شهريًا\"','number:\"7\",label:\"سنوات خبرة\""],
["'number:\"24/7\",label:\"Support & follow-up\"','number:\"7\",label:\"Years of experience\"","'number:\"24/7\",label:\"Support & follow-up\"','number:\"+50\",label:\"Monthly success opportunities\"','number:\"7\",label:\"Years of experience\""],
["assert.match(home,/const stats=t\\.stats\\.map\\(\\(item\\)=>\\[item\\.number,item\\.label\\]/);","assert.match(home,/home_stat_\\$\\{item\\.key\\}_number/);assert.match(home,/home_stat_\\$\\{item\\.key\\}_label_\\$\\{language\\}/);"],
["assert.match(homeAdmin,/defaultValue:\"7\"/)","assert.match(homeAdmin,/defaultValue:\"\\+50\"/);assert.match(homeAdmin,/defaultValue:\"7\"/)"]]);

const contractTest=`\nimport test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nconst read=(p)=>readFileSync(new URL(\`../\${p}\`,import.meta.url),"utf8");\ntest("PR116 owner final delta contracts are closed",()=>{\n const home=read("app/page.tsx"),adminHome=read("app/admin/settings/homepage/page.tsx"),nav=read("lib/publicNavigation.ts"),settings=read("app/admin/settings/page.tsx"),apply=read("app/apply/page.tsx"),digital=read("app/digital-services/page.tsx"),blog=read("app/admin/blog/page.tsx"),quick=read("components/AdminQuickNav.tsx"),login=read("app/admin/login/page.tsx"),program=read("app/programs/[slug]/page.tsx"),agent=read("app/agent/arab-syria/page.tsx"),dock=read("components/PublicMobileDock.tsx"),migration=read("supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql");\n for(const token of ["home_stat_4_number","home_stat_4_label_ar","home_stat_4_label_en","home_stat_4_label_tr"]) assert.ok(adminHome.includes(token),token);\n assert.ok(home.includes("+50")); assert.ok(home.includes("home_stat_${item.key}_number"));\n for(const path of ["/digital-services","/apply"]) { assert.ok(settings.includes(path),path); assert.ok(nav.includes(path)||settings.includes(path),path); }\n assert.ok(apply.includes("getPublicNavigationConfig")||apply.includes("localizePublicHref"));\n assert.ok(digital.includes("digital")||digital.includes("الخدمات الرقمية"));\n assert.ok(blog.includes("AdminBlogManager"));\n for(const group of ["border-sky-400/25","border-violet-400/25","border-emerald-400/25","border-amber-400/25","border-rose-400/25","border-fuchsia-400/25","border-slate-400/25"]) assert.ok(quick.includes(group),group);\n assert.ok(login.includes("bg-[#070009]")); assert.ok(program.includes("font-black")||program.includes("font-bold")); assert.ok(agent.includes("font-black")||agent.includes("font-bold")); assert.ok(dock.includes("tenant-primary")||dock.includes("purple"));\n for(const status of ["'new'","'under_review'","'contacted'","'accepted'","'rejected'","'archived'"]) assert.ok(migration.includes(status),status);\n for(const rpc of ["pr3_save_blog_post","pr4_notification_action","pr99_restore_trash","pr116_moderate_review_submission","save_page_builder_draft"]) assert.ok(migration.includes(rpc),rpc);\n assert.ok(!migration.includes("pr100_admin_requests_index")); assert.ok(!migration.includes("pr99_backup_schedule_status"));\n});\n`;
write("tests/pr116-owner-final-delta-contract.test.mjs",contractTest);

// Remove temporary discovery/residual helper files before the final freeze.
for(const file of ["scripts/pr116-owner-delta-discovery.mjs",".github/workflows/pr116-owner-delta-discovery.yml","scripts/pr116-final-admin-surface-closeout-fix.mjs"]){try{fs.rmSync(file,{force:true})}catch{}}

console.log("PR116 Owner Final Delta closeout applied.");
