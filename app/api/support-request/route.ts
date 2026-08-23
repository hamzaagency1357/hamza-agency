import "server-only";

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { callOidcGateway } from "@/lib/server/pr100SignedGateway";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BODY_BYTES=8192;
type GuardResult={allowed?:boolean;code?:string};
type SupportCreateResult={supportCode?:string;verification?:string;status?:string;retentionDays?:number};
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
 const identity=fingerprint(request);
 try{const guard=await callOidcGateway<GuardResult>(request,"ai_guard",{identity,payload:{question:`handoff:${subject}`}});if(!guard?.allowed)return fail(guard?.code==="rate_limited"?429:400,"rejected")}catch{return fail(503,"guard_unavailable")}
 try{
  const data=await callOidcGateway<SupportCreateResult>(request,"support_request_create",{identity,payload:{language,subject,context,contactType,contactValue,consent:true}});
  if(!data?.supportCode||!data?.verification)return fail(503,"support_unavailable");
  return NextResponse.json({ok:true,...data},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail(503,"support_unavailable")}
}
