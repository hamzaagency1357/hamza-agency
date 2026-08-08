import { mergeProgramMediaRows, type ProgramMediaCompatRow } from "@/lib/programMediaCompat.mjs";

type Filters={ids?:number[];slugs?:string[]};
export async function fetchProgramMedia(filters:Filters={}):Promise<ProgramMediaCompatRow[]>{const params=new URLSearchParams();if(filters.ids?.length)params.set("ids",filters.ids.join(","));if(filters.slugs?.length)params.set("slugs",filters.slugs.join(","));try{const response=await fetch(`/api/public/program-media${params.size?`?${params.toString()}`:""}`,{cache:"no-store"});if(!response.ok)return[];const body=await response.json() as {media?:ProgramMediaCompatRow[]};return Array.isArray(body.media)?body.media:[]}catch{return[]}}
export async function attachProgramMedia<T extends object>(programs:T[],filters:Filters={}){const media=await fetchProgramMedia(filters);return mergeProgramMediaRows(programs,media)}
