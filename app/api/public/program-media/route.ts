import { NextResponse } from "next/server";
import { readProgramMedia } from "@/lib/programMediaServer";

export const dynamic="force-dynamic";
function parseIds(value:string|null){return(value||"").split(",").map(Number).filter((id)=>Number.isSafeInteger(id)&&id>0).slice(0,100)}
function parseSlugs(value:string|null){return(value||"").split(",").map((slug)=>slug.trim()).filter((slug)=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)).slice(0,100)}
export async function GET(request:Request){const url=new URL(request.url);const rows=await readProgramMedia({ids:parseIds(url.searchParams.get("ids")),slugs:parseSlugs(url.searchParams.get("slugs"))});const media=rows.map(({id,logo_url,hero_image_url,mobile_image_url,og_image_url,alt_ar,alt_en,alt_tr})=>({id,logo_url,hero_image_url,mobile_image_url,og_image_url,alt_ar,alt_en,alt_tr}));return NextResponse.json({media},{status:200,headers:{"Cache-Control":"no-store"}})}
