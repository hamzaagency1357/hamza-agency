import "server-only";
import { normalizeProgramMediaRow, type ProgramMediaCompatRow } from "@/lib/programMediaCompat.mjs";

type Filters={ids?:number[];slugs?:string[]};
function config(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;return url&&key?{url,key}:null}
function cleanIds(ids:number[]|undefined){return [...new Set((ids||[]).filter((id)=>Number.isSafeInteger(id)&&id>0))].slice(0,100)}
function cleanSlugs(slugs:string[]|undefined){return [...new Set((slugs||[]).map((slug)=>slug.trim()).filter((slug)=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)))].slice(0,100)}
export async function readProgramMedia(filters:Filters={}):Promise<ProgramMediaCompatRow[]>{
 const cfg=config();if(!cfg)return[];const url=new URL("/rest/v1/programs",cfg.url);url.searchParams.set("select","*");
 const ids=cleanIds(filters.ids);const slugs=cleanSlugs(filters.slugs);if(ids.length)url.searchParams.set("id",`in.(${ids.join(",")})`);if(slugs.length)url.searchParams.set("slug",`in.(${slugs.join(",")})`);
 try{const response=await fetch(url,{headers:{apikey:cfg.key,Authorization:`Bearer ${cfg.key}`},cache:"no-store"});if(!response.ok)return[];const rows=await response.json();if(!Array.isArray(rows))return[];return rows.map((row)=>normalizeProgramMediaRow(row as Record<string,unknown>)).filter((row)=>Boolean(row.id||row.slug))}catch{return[]}
}
export async function readProgramMediaBySlug(slug:string){return(await readProgramMedia({slugs:[slug]}))[0]||null}
