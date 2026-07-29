import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type JsonObject = Record<string, unknown>;

export const signedGatewayEnabled = () => Boolean(process.env.PR100_RPC_SIGNING_SECRET);

export async function callSignedGateway<T = JsonObject>(action: string, body: JsonObject): Promise<T> {
  const secret = process.env.PR100_RPC_SIGNING_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret || secret.length < 32 || !url || !key) {
    throw new Error("signed_gateway_unavailable");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(24).toString("base64url");
  const bodyText = JSON.stringify(body);
  const bodyDigest = createHash("sha256").update(bodyText, "utf8").digest("hex");
  const canonical = `${action}\n${timestamp}\n${nonce}\n${bodyDigest}`;
  const signature = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc("pr100_server_gateway", {
    p_action: action,
    p_timestamp: timestamp,
    p_nonce: nonce,
    p_body: bodyText,
    p_body_digest: bodyDigest,
    p_signature: signature,
  });

  if (error) throw new Error("signed_gateway_rejected");
  return data as T;
}
