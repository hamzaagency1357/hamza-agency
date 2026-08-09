import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "npm:jose@6.1.0";

const ISSUER = "https://oidc.vercel.com/hamzaagencysy-3009s-projects";
const AUDIENCE = "https://vercel.com/hamzaagencysy-3009s-projects";
const TEAM_ID = "team_gu9SOMWlOqS2uvLEZUYEbTPs";
const PROJECT_ID = "prj_YQw97FRAAwcnpQkudzGr01kXASvN";
const PROJECT_NAME = "hamza-agency";
const ALLOWED_ENVIRONMENTS = new Set(["preview", "production"]);
const ALLOWED_ACTIONS = new Set([
  "application_lookup",
  "service_lookup",
  "job_lookup",
  "contact_lookup",
  "ai_guard",
  "password_reset_guard",
  "application_submit",
  "service_request_submit",
  "job_application_submit",
  "contact_submit",
  "ai_support_submit",
  "review_submit",
]);
const PRODUCTION_ONLY_ACTIONS = new Set([
  "application_submit",
  "service_request_submit",
  "job_application_submit",
  "contact_submit",
  "ai_support_submit",
  "review_submit",
]);
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
const encoder = new TextEncoder();

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function claim(payload: JWTPayload, name: string) { const value = payload[name]; return typeof value === "string" ? value : ""; }
function hex(bytes: ArrayBuffer) { return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function sha256(value: string) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { allowed: false, code: "method_not_allowed" });
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return json(401, { allowed: false, code: "missing_oidc_token" });

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUDIENCE, algorithms: ["RS256"], clockTolerance: 5, maxTokenAge: "2h" }));
  } catch { return json(401, { allowed: false, code: "invalid_oidc_token" }); }

  const environment = claim(payload, "environment");
  const expectedSubject = `owner:hamzaagencysy-3009s-projects:project:${PROJECT_NAME}:environment:${environment}`;
  if (claim(payload,"owner_id")!==TEAM_ID || claim(payload,"project_id")!==PROJECT_ID || claim(payload,"project")!==PROJECT_NAME || !ALLOWED_ENVIRONMENTS.has(environment) || payload.sub!==expectedSubject || typeof payload.iat!=="number" || typeof payload.exp!=="number") {
    return json(403, { allowed: false, code: "invalid_oidc_claims" });
  }

  let input: Record<string, unknown>;
  try { const parsed=await request.json(); if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("invalid"); input=parsed as Record<string,unknown>; }
  catch { return json(400,{allowed:false,code:"invalid_request"}); }

  const action=typeof input.action==="string"?input.action:"";
  const timestamp=typeof input.timestamp==="number"?Math.trunc(input.timestamp):0;
  const nonce=typeof input.nonce==="string"?input.nonce:"";
  const body=typeof input.body==="string"?input.body:"";
  const bodyDigest=typeof input.bodyDigest==="string"?input.bodyDigest.toLowerCase():"";
  const now=Math.floor(Date.now()/1000);
  if(!ALLOWED_ACTIONS.has(action))return json(400,{allowed:false,code:"invalid_action"});
  if(environment==="preview"&&PRODUCTION_ONLY_ACTIONS.has(action))return json(403,{allowed:false,code:"preview_write_denied"});
  if(timestamp<now-120||timestamp>now+30)return json(400,{allowed:false,code:"stale_request"});
  if(!/^[A-Za-z0-9_-]{24,80}$/.test(nonce))return json(400,{allowed:false,code:"invalid_nonce"});
  if(!body||encoder.encode(body).byteLength>40_000)return json(400,{allowed:false,code:"invalid_payload"});
  if(!/^[a-f0-9]{64}$/.test(bodyDigest)||(await sha256(body))!==bodyDigest)return json(400,{allowed:false,code:"digest_mismatch"});

  const supabaseUrl=Deno.env.get("SUPABASE_URL")?.replace(/\/+$/,"");
  const serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!supabaseUrl||!serviceRoleKey)return json(503,{allowed:false,code:"gateway_unavailable"});

  const rpcResponse=await fetch(`${supabaseUrl}/rest/v1/rpc/pr100_oidc_gateway`,{method:"POST",headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,"Content-Type":"application/json"},body:JSON.stringify({p_action:action,p_timestamp:timestamp,p_nonce:nonce,p_body:body,p_body_digest:bodyDigest,p_oidc_issuer:payload.iss,p_oidc_subject:payload.sub,p_oidc_audience:AUDIENCE,p_oidc_team_id:claim(payload,"owner_id"),p_oidc_project_id:claim(payload,"project_id"),p_oidc_project:claim(payload,"project"),p_oidc_environment:environment,p_oidc_issued_at:payload.iat,p_oidc_expires_at:payload.exp})});
  const text=await rpcResponse.text();
  if(!rpcResponse.ok)return json(502,{allowed:false,code:"database_gateway_rejected"});
  try{return json(200,JSON.parse(text) as Record<string,unknown>)}catch{return json(502,{allowed:false,code:"invalid_database_response"})}
});
