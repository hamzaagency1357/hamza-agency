import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { callOidcGateway } from "@/lib/server/pr100SignedGateway";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BODY_BYTES=1400;
const actions:Record<string,string>={APP:"application_lookup",SR:"service_lookup",JOB:"job_lookup",CNT:"contact_lookup"};
const patterns:Record<string,RegExp>={APP:/^APP-[0-9]{4}-[A-F0-9]{10}$/,SR:/^SR-[0-9]{4}-[A-F0-9]{10}$/,JOB:/^JOB-[0-9]{4}-[A-F0-9]{10}$/,CNT:/^CNT-[0-9]{4}-[A-F0-9]{10}$/,SUP:/^SUP-[A-Z0-9]{4}$/};
function fail(status:number,code="try_again_later"){return NextResponse.json({ok:false,code},{status,headers:{"Cache-Control":"no-store"}})}
function requestFingerprint(request:NextRequest){return createHash("sha256").update(`${request.headers.get("x-forwarded-for")||"unknown"}|${request.headers.get("user-agent")||"unknown"}`,"utf8").digest("hex")}

export async function POST(request:NextRequest){
 const declared=Number(request.headers.get("content-length")||0);if(declared>MAX_BODY_BYTES)return fail(413);
 const raw=await request.text();if(!raw||Buffer.byteLength(raw,"utf8")>MAX_BODY_BYTES)return fail(413);
 let parsed:unknown;try{parsed=JSON.parse(raw)}catch{return fail(400,"invalid_request")}
 const input=parsed as {code?:unknown;verification?:unknown};
 const code=typeof input.code==="string"?input.code.toUpperCase().replace(/\s+/g,"").slice(0,40):"";
 const prefix=code.split("-",1)[0];if(!patterns[prefix]?.test(code))return fail(400,"invalid_request");
 const fingerprint=requestFingerprint(request);
 if(prefix==="SUP"){
   const verification=typeof input.verification==="string"?input.verification.toUpperCase().replace(/\s+/g,"").slice(0,20):"";
   if(!/^[A-F0-9]{10}$/.test(verification))return fail(400,"verification_required");
   try{const guard=await callOidcGateway<Record<string,unknown>>(request,"ai_guard",{identity:fingerprint,payload:{question:`track:${code}`}});if(guard.allowed!==true)return guard.code==="rate_limited"?fail(429,"rate_limited"):fail(400,"invalid_request")}catch{return fail(503)}
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return fail(503);
   const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data,error}=await client.rpc("pr4_track_support_request",{p_code:code,p_verification:verification});if(error)return fail(503);
   const result=(data||{}) as Record<string,unknown>;return NextResponse.json({ok:true,found:result.found===true,record:result.record||null},{headers:{"Cache-Control":"no-store"}});
 }
 const action=actions[prefix];if(!action)return fail(400,"invalid_request");
 const body=prefix==="SR"?{requestCode:code,requestFingerprint:fingerprint}:{trackingCode:code,requestFingerprint:fingerprint};
 try{const result=await callOidcGateway<Record<string,unknown>>(request,action,body);if(result.allowed!==true)return result.code==="rate_limited"?fail(429,"rate_limited"):fail(400,"invalid_request");return NextResponse.json({ok:true,found:result.found===true,record:result.record||null},{headers:{"Cache-Control":"no-store"}})}catch{return fail(503)}
}
