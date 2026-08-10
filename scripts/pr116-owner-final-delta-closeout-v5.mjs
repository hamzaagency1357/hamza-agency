import fs from "node:fs";
const read=(f)=>fs.readFileSync(f,"utf8"), write=(f,s)=>fs.writeFileSync(f,s);
function mustReplace(file,before,after,label){let s=read(file);if(!s.includes(before))throw new Error(`${label} missing in ${file}`);s=s.replace(before,after);write(file,s);}

// Navigation Admin -> Public truthfulness.
{
 const file="lib/publicNavigation.ts";let s=read(file);
 s=s.replace('  const headerByHref=new Map(config.headerLinks.map((link)=>[normalizeHref(link.href),link]));\n  const headerLinks=defaultHeaderLinks.map((required,index)=>{ const configured=headerByHref.get(required.href); return sanitizeLink(configured||required,index)||required; });','  const headerLinks=[...config.headerLinks].sort(sortByOrderThenLabel);');
 s=s.replace('function sanitizeLinks(value:unknown,fallback:PublicNavigationLink[]){if(!Array.isArray(value))return fallback;const links=value.map((item,index)=>sanitizeLink(item,index)).filter((link):link is PublicNavigationLink=>Boolean(link)).filter((link)=>link.isVisible!==false).sort(sortByOrderThenLabel);return links.length?links:fallback}','function sanitizeLinks(value:unknown,fallback:PublicNavigationLink[]){if(!Array.isArray(value))return fallback;return value.map((item,index)=>sanitizeLink(item,index)).filter((link):link is PublicNavigationLink=>Boolean(link)).filter((link)=>link.isVisible!==false).sort(sortByOrderThenLabel)}');
 s=s.replace('function sanitizeGroups(value:unknown,fallback:PublicNavigationGroup[]){if(!Array.isArray(value))return fallback;const groups=value.map((item,index)=>sanitizeGroup(item,index)).filter((group):group is PublicNavigationGroup=>Boolean(group)).filter((group)=>group.isVisible!==false&&group.links.length>0).sort(sortByOrderThenTitle);return groups.length?groups:fallback}','function sanitizeGroups(value:unknown,fallback:PublicNavigationGroup[]){if(!Array.isArray(value))return fallback;return value.map((item,index)=>sanitizeGroup(item,index)).filter((group):group is PublicNavigationGroup=>Boolean(group)).filter((group)=>group.isVisible!==false&&group.links.length>0).sort(sortByOrderThenTitle)}');
 write(file,s);
}
mustReplace("components/PublicGlobalHeader.tsx",'const items=useMemo(()=>navigation[language].map((fallback)=>{const managed=managedLinks.find((link)=>link.href===fallback.href);return managed?{...fallback,label:language==="ar"?managed.label:getSharedNavigationLabel(language,managed)}:fallback}),[language,managedLinks]);','const items=useMemo(()=>managedLinks.filter((link)=>link.isVisible!==false).map((managed)=>{const fallback=navigation[language].find((item)=>item.href===managed.href);return{href:managed.href,label:language==="ar"?managed.label:(getSharedNavigationLabel(language,managed)||fallback?.label||managed.label)}}),[language,managedLinks]);',"public header managed items");
mustReplace("components/PublicQuickNav.tsx",'const visibleGroups = useMemo(() => { const sanitizedGroups = sanitizePublicQuickNavGroups(quickNavGroups); return sanitizedGroups.length ? sanitizedGroups : defaultPublicNavigationConfig.quickNavGroups; }, [quickNavGroups]);','const visibleGroups = useMemo(() => sanitizePublicQuickNavGroups(quickNavGroups), [quickNavGroups]);',"quick nav authoritative groups");

// Blog IA and six-status dashboard language.
{
 const file="components/AdminQuickNav.tsx";let s=read(file);const marker='{ label: "الصفحات", description: "إدارة بيانات الصفحات الأساسية وحالة نشرها.", href: "/admin/pages" },';if(!s.includes('/admin/blog')){if(!s.includes(marker))throw new Error("admin blog IA marker missing");s=s.replace(marker,`${marker}\n      { label: "المدونة", description: "إدارة المقالات ومسوداتها وحالة نشرها.", href: "/admin/blog" },`);}write(file,s);
}
{
 const file="app/admin/page.tsx";let s=read(file);
 if(!s.includes('contacted: "تم التواصل"'))s=s.replace('  under_review: "قيد المراجعة",\n  accepted: "مقبول",','  under_review: "قيد المراجعة",\n  contacted: "تم التواصل",\n  accepted: "مقبول",');
 if(!s.includes('archived: "مؤرشف"'))s=s.replace('  rejected: "مرفوض",\n};','  rejected: "مرفوض",\n  archived: "مؤرشف",\n};');
 if(!s.includes('contacted: "cyan"'))s=s.replace('  under_review: "amber",\n  accepted: "green",','  under_review: "amber",\n  contacted: "cyan",\n  accepted: "green",');
 if(!s.includes('archived: "slate"'))s=s.replace('  rejected: "red",\n};','  rejected: "red",\n  archived: "slate",\n};');
 if(!s.includes('href: "/admin/blog",\n    tone: "purple"')){const marker='  {\n    title: "الأقسام",\n    description: "إدارة أقسام الصفحات وترتيب المحتوى الظاهر للزوار.",\n    href: "/admin/sections",\n    tone: "gold",\n  },';if(!s.includes(marker))throw new Error("dashboard blog marker missing");s=s.replace(marker,`${marker}\n  {\n    title: "المدونة",\n    description: "إدارة المقالات والمسودات والنشر من مكان واحد.",\n    href: "/admin/blog",\n    tone: "purple",\n  },`);}
 write(file,s);
}

// Dock semantic color mapping.
{
 const file="components/PublicMobileDock.tsx";let s=read(file);
 s=s.replace('className={itemClass} aria-label={quickNavOpenLabel}','className={`${itemClass} border border-yellow-300/15 text-yellow-100/90 hover:bg-yellow-300/[.08]`} aria-label={quickNavOpenLabel}');
 s=s.replace('className={itemClass} aria-label={aiCopy.widgetOpenAria}','className={`${itemClass} border border-purple-300/20 text-purple-100 hover:bg-purple-500/[.12]`} aria-label={aiCopy.widgetOpenAria}');
 s=s.replace('className={itemClass} data-testid="mobile-whatsapp"','className={`${itemClass} border border-green-300/20 text-green-100 hover:bg-green-500/[.12]`} data-testid="mobile-whatsapp"');
 write(file,s);
}

// Program and login style alignment.
{
 const file="app/programs/[slug]/page.tsx";let s=read(file);s=s.replace('className="mt-7 w-full scroll-mt-40 rounded-full bg-white px-8 py-4 text-lg font-black text-black transition hover:bg-white/90"','className="mt-7 w-full scroll-mt-40 rounded-full border border-yellow-300/25 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-700 px-8 py-4 text-lg font-black text-white shadow-[0_14px_36px_rgba(124,58,237,.24)] transition hover:brightness-110"');write(file,s);
}
{
 const file="app/admin/login/page.tsx";let s=read(file);s=s.replace('className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-black/40 p-6 shadow-2xl"','className="w-full max-w-md rounded-3xl border border-purple-400/25 bg-[linear-gradient(160deg,rgba(16,4,28,.96),rgba(5,0,8,.98))] p-6 shadow-[0_24px_80px_rgba(124,58,237,.2)]"');s=s.replace('className="w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500 disabled:opacity-60"','className="w-full rounded-xl border border-yellow-300/20 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-700 py-3 font-bold text-white shadow-[0_12px_32px_rgba(124,58,237,.22)] hover:brightness-110 disabled:opacity-60"');write(file,s);
}

// Strengthen final Owner contract without weakening existing assertions.
{
 const file="tests/pr116-owner-final-delta-contract.test.mjs";let s=read(file);
 s=s.replace('assert.ok(blog.includes("AdminBlogManager"));','assert.ok(blog.includes("AdminBlogManager")); assert.ok(quick.includes("/admin/blog"));');
 s=s.replace('assert.ok(dock.includes("tenant-primary")||dock.includes("purple"));','assert.ok(dock.includes("purple-300/20")); assert.ok(dock.includes("yellow-300/15")); assert.ok(dock.includes("green-300/20"));');
 s=s.replace('assert.ok(apply.includes("getPublicNavigationConfig")||apply.includes("localizePublicHref"));','assert.ok(apply.includes("getPublicNavigationConfig")||apply.includes("localizePublicHref")); assert.ok(nav.includes("const headerLinks=[...config.headerLinks]"));');
 write(file,s);
}

console.log("PR116 standalone Owner delta supplement applied.");
