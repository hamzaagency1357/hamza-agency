import fs from "node:fs";

const read=(file)=>fs.readFileSync(file,"utf8");
const write=(file,value)=>fs.writeFileSync(file,value);
const replace=(file,before,after,label)=>{const source=read(file);if(!source.includes(before))throw new Error(`Missing ${label} in ${file}`);write(file,source.replace(before,after));};

// Apply the validated Owner delta runner first.
await import("./pr116-owner-final-delta-closeout-v3.mjs");

// Replace the stale four-stat test assertion with the new Admin -> Public contract.
{
 const file="tests/pr116-final-delta.test.mjs";let source=read(file);
 const old="assert.ok(compact(source).includes('conststats=t.stats.map((item)=>[item.number,item.label]asconst)'));";
 if(source.includes(old)) source=source.replace(old,"assert.ok(source.includes('home_stat_${item.key}_number')); assert.ok(source.includes('home_stat_${item.key}_label_${language}')); ");
 write(file,source);
}

// Navigation truthfulness: explicit Admin arrays are authoritative, including removal/hide.
{
 const file="lib/publicNavigation.ts";let source=read(file);
 source=source.replace(
  'const headerByHref=new Map(config.headerLinks.map((link)=>[normalizeHref(link.href),link]));\n  const headerLinks=defaultHeaderLinks.map((required,index)=>{ const configured=headerByHref.get(required.href); return sanitizeLink(configured||required,index)||required; });',
  'const headerLinks=[...config.headerLinks].sort(sortByOrderThenLabel);'
 );
 source=source.replace(
  'function sanitizeLinks(value:unknown,fallback:PublicNavigationLink[]){if(!Array.isArray(value))return fallback;const links=value.map((item,index)=>sanitizeLink(item,index)).filter((link):link is PublicNavigationLink=>Boolean(link)).filter((link)=>link.isVisible!==false).sort(sortByOrderThenLabel);return links.length?links:fallback}',
  'function sanitizeLinks(value:unknown,fallback:PublicNavigationLink[]){if(!Array.isArray(value))return fallback;return value.map((item,index)=>sanitizeLink(item,index)).filter((link):link is PublicNavigationLink=>Boolean(link)).filter((link)=>link.isVisible!==false).sort(sortByOrderThenLabel)}'
 );
 write(file,source);
}

{
 const file="components/PublicGlobalHeader.tsx";let source=read(file);
 const old='const items=useMemo(()=>navigation[language].map((fallback)=>{const managed=managedLinks.find((link)=>link.href===fallback.href);return managed?{...fallback,label:language==="ar"?managed.label:getSharedNavigationLabel(language,managed)}:fallback}),[language,managedLinks]);';
 const next='const items=useMemo(()=>managedLinks.filter((link)=>link.isVisible!==false).map((managed)=>{const fallback=navigation[language].find((item)=>item.href===managed.href);return{href:managed.href,label:language==="ar"?managed.label:(getSharedNavigationLabel(language,managed)||fallback?.label||managed.label)}}),[language,managedLinks]);';
 if(!source.includes(old)) throw new Error("Public header navigation truthfulness marker missing");
 source=source.replace(old,next);write(file,source);
}

{
 const file="components/PublicQuickNav.tsx";let source=read(file);
 const old='const visibleGroups = useMemo(() => { const sanitizedGroups = sanitizePublicQuickNavGroups(quickNavGroups); return sanitizedGroups.length ? sanitizedGroups : defaultPublicNavigationConfig.quickNavGroups; }, [quickNavGroups]);';
 const next='const visibleGroups = useMemo(() => sanitizePublicQuickNavGroups(quickNavGroups), [quickNavGroups]);';
 if(!source.includes(old)) throw new Error("Quick nav fallback marker missing");
 source=source.replace(old,next);write(file,source);
}

// Admin Blog IA: make the manager discoverable from both the grouped nav and dashboard content.
{
 const file="components/AdminQuickNav.tsx";let source=read(file);
 const marker='{ label: "الصفحات", description: "إدارة بيانات الصفحات الأساسية وحالة نشرها.", href: "/admin/pages" },';
 if(!source.includes(marker)) throw new Error("AdminQuickNav content marker missing");
 source=source.replace(marker,`${marker}\n      { label: "المدونة", description: "إدارة المقالات ومسوداتها وحالة نشرها.", href: "/admin/blog" },`);
 write(file,source);
}
{
 const file="app/admin/page.tsx";let source=read(file);
 source=source.replace('  under_review: "قيد المراجعة",\n  accepted: "مقبول",','  under_review: "قيد المراجعة",\n  contacted: "تم التواصل",\n  accepted: "مقبول",');
 source=source.replace('  rejected: "مرفوض",\n};','  rejected: "مرفوض",\n  archived: "مؤرشف",\n};');
 source=source.replace('  under_review: "amber",\n  accepted: "green",','  under_review: "amber",\n  contacted: "cyan",\n  accepted: "green",');
 source=source.replace('  rejected: "red",\n};','  rejected: "red",\n  archived: "slate",\n};');
 const marker='  {\n    title: "الأقسام",\n    description: "إدارة أقسام الصفحات وترتيب المحتوى الظاهر للزوار.",\n    href: "/admin/sections",\n    tone: "gold",\n  },';
 if(!source.includes(marker)) throw new Error("Admin dashboard content marker missing");
 source=source.replace(marker,`${marker}\n  {\n    title: "المدونة",\n    description: "إدارة المقالات والمسودات والنشر من مكان واحد.",\n    href: "/admin/blog",\n    tone: "purple",\n  },`);
 write(file,source);
}

// Distinct mobile Dock accents while preserving dark base and semantic WhatsApp green.
{
 const file="components/PublicMobileDock.tsx";let source=read(file);
 source=source.replace('className={itemClass} aria-label={quickNavOpenLabel}', 'className={`${itemClass} border border-yellow-300/15 text-yellow-100/90 hover:bg-yellow-300/[.08]`} aria-label={quickNavOpenLabel}');
 source=source.replace('className={itemClass} aria-label={aiCopy.widgetOpenAria}', 'className={`${itemClass} border border-purple-300/20 text-purple-100 hover:bg-purple-500/[.12]`} aria-label={aiCopy.widgetOpenAria}');
 source=source.replace('className={itemClass} data-testid="mobile-whatsapp"', 'className={`${itemClass} border border-green-300/20 text-green-100 hover:bg-green-500/[.12]`} data-testid="mobile-whatsapp"');
 write(file,source);
}

// Program CTA and Admin Login receive the same restrained Purple/Gold visual hierarchy.
{
 const file="app/programs/[slug]/page.tsx";let source=read(file);
 const old='className="mt-7 w-full scroll-mt-40 rounded-full bg-white px-8 py-4 text-lg font-black text-black transition hover:bg-white/90"';
 const next='className="mt-7 w-full scroll-mt-40 rounded-full border border-yellow-300/25 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-700 px-8 py-4 text-lg font-black text-white shadow-[0_14px_36px_rgba(124,58,237,.24)] transition hover:brightness-110"';
 if(!source.includes(old)) throw new Error("Program CTA style marker missing");source=source.replace(old,next);write(file,source);
}
{
 const file="app/admin/login/page.tsx";let source=read(file);
 source=source.replace('className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-black/40 p-6 shadow-2xl"','className="w-full max-w-md rounded-3xl border border-purple-400/25 bg-[linear-gradient(160deg,rgba(16,4,28,.96),rgba(5,0,8,.98))] p-6 shadow-[0_24px_80px_rgba(124,58,237,.2)]"');
 source=source.replace('className="w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500 disabled:opacity-60"','className="w-full rounded-xl border border-yellow-300/20 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-700 py-3 font-bold text-white shadow-[0_12px_32px_rgba(124,58,237,.22)] hover:brightness-110 disabled:opacity-60"');
 write(file,source);
}

// Lock the exact Owner section color map and key cross-surface contracts.
{
 const file="tests/pr116-owner-final-delta-contract.test.mjs";let source=read(file);
 source=source.replace('assert.ok(dock.includes("tenant-primary")||dock.includes("purple"));','assert.ok(dock.includes("purple-300/20")); assert.ok(dock.includes("yellow-300/15")); assert.ok(dock.includes("green-300/20"));');
 source=source.replace('assert.ok(blog.includes("AdminBlogManager"));','assert.ok(blog.includes("AdminBlogManager")); assert.ok(quick.includes("/admin/blog"));');
 source=source.replace('assert.ok(apply.includes("getPublicNavigationConfig")||apply.includes("localizePublicHref"));','assert.ok(apply.includes("getPublicNavigationConfig")||apply.includes("localizePublicHref")); assert.ok(nav.includes("const headerLinks=[...config.headerLinks]"));');
 write(file,source);
}

console.log("PR116 Owner Final Delta v4 supplemental closeout applied.");
