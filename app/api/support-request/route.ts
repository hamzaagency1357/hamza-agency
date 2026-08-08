import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { callOidcGateway } from "@/lib/server/pr100SignedGateway";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BODY_BYTES=8192;
type GuardResult={allowed?:boolean;code?:string};
function fail(status:number,code:string){return NextResponse.json({ok:false,code},{status,headers:{"Cache-Control":"no-store"}})}
function fingerprint(request:NextRequest){return createHash("sha256").update(`${request.headers.get("x-forwarded-for")||"unknown"}|${request.headers.get("user-agent")||"unknown"}`).digest("hex")}

export async function POST(request:NextRequest){
 const declared=Number(request.headers.get("content-length")||0);if(declared>MAX_BODY_BYTES)return fail(413,"too_large");
 const raw=await request.text();if(!raw||Buffer.byteLength(raw,"utf8")>MAX_BODY_BYTES)return fail(413,"too_large");
 let body:Record<string,unknown>;try{const parsed=JSON.parse(raw) as unknown;if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error();body=parsed as Record<string,unknown>}catch{return fail(400,"invalid_request")}
 const language=body.language==="en"||body.language==="tr"?body.language:"ar";
 const subject=typeof body.subject==="string"?body.subject.trim().slice(0,300):"طلب دعم";
 const context=typeof body.context==="string"?body.context.trim().slice(0,4000):"";
 const contactType=body.contactType==="email"||body.contactType==="phone"||body.contactType==="whatsapp"||body.contactType==="other"?body.contactType:null;
 const contactValue=typeof body.contactValue==="string"?body.contactValue.trim().slice(0,320):null;
 const consent=body.consent===true;
 if(!consent)return fail(400,"consent_required");
 if(contactType&&!contactValue)return fail(400,"contact_value_required");
 try{const guard=await callOidcGateway<GuardResult>(request,"ai_guard",{identity:fingerprint(request),payload:{question:`handoff:${subject}`}});if(!guard?.allowed)return fail(guard?.code==="rate_limited"?429:400,"rejected")}catch{return fail(503,"guard_unavailable")}
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return fail(503,"support_unavailable");
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data,error}=await client.rpc("pr4_create_support_request",{p_language:language,p_subject:subject,p_context:context,p_contact_type:contactType,p_contact_value:contactValue,p_consent:true});
 if(error)return fail(503,"support_unavailable");
 return NextResponse.json({ok:true,...(data as Record<string,unknown>)},{headers:{"Cache-Control":"no-store"}});
}
