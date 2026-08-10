import fs from "node:fs";

await import("./pr116-owner-final-delta-closeout-v3.mjs");

function patch(file, mutate) {
  const source = fs.readFileSync(file, "utf8");
  const next = mutate(source);
  if (next === source) throw new Error(`No PR116 v4 change applied to ${file}`);
  fs.writeFileSync(file, next);
}

// The five statistics now intentionally derive from Admin public settings with Owner-approved fallbacks.
patch("tests/pr116-final-delta.test.mjs", (source) => source.replace(
  "assert.ok(compact(source).includes('conststats=t.stats.map((item)=>[item.number,item.label]asconst)'));",
  "assert.ok(compact(source).includes('conststats=t.stats.map((item)=>[setting(settings,[`home_stat_${item.key}_number`],item.number),setting(settings,[`home_stat_${item.key}_label_${language}`],item.label)]asconst)'));",
));

// Apply the approved Black + Royal Purple + restrained Gold hierarchy to the public mobile Dock.
patch("components/PublicMobileDock.tsx", (source) => source
  .replace(
    'const itemClass="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold leading-none text-white/75 transition hover:bg-white/[.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";',
    'const itemClass="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-transparent px-1 py-1.5 text-[10px] font-bold leading-none text-purple-50/80 transition hover:border-yellow-300/20 hover:bg-purple-500/15 hover:text-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/70";',
  )
  .replace(
    'className="hamza-mobile-dock-grid grid grid-cols-3 gap-1 rounded-[1.15rem] border border-white/12 bg-black/88 p-1.5 shadow-[0_14px_40px_rgba(0,0,0,.36)] backdrop-blur-xl"',
    'className="hamza-mobile-dock-grid grid grid-cols-3 gap-1 rounded-[1.15rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_top,rgba(124,58,237,.22),transparent_58%),rgba(5,0,8,.94)] p-1.5 shadow-[0_14px_40px_rgba(0,0,0,.42)] backdrop-blur-xl"',
  )
  .replace(
    'className="col-span-3 min-h-11 rounded-xl border border-white/15 bg-white/[.06] px-4 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"',
    'className="col-span-3 min-h-11 rounded-xl border border-yellow-300/20 bg-purple-500/15 px-4 text-sm font-black text-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/70"',
  ));

console.log("PR116 Owner Final Delta v4 focused corrections applied.");
