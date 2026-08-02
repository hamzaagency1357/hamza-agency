import fs from "node:fs";
import { expect } from "@playwright/test";

export function fixture() {
  const path = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-portal-fixtures.json";
  if (!fs.existsSync(path)) throw new Error("portal_fixture_missing");
  return JSON.parse(fs.readFileSync(path, "utf8"));
}
export async function token(request, account) {
  const f = fixture();
  const anon = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  expect(anon).toBeTruthy();
  const response = await request.post(`${f.apiUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anon, "Content-Type": "application/json" },
    data: { email: account.email, password: account.password },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.access_token).toBeTruthy();
  return body.access_token;
}
export async function rpc(request, accessToken, name, body, expected = 200) {
  const f = fixture();
  const anon = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = await request.post(`${f.apiUrl}/rest/v1/rpc/${name}`, {
    headers: { apikey: anon, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    data: body,
  });
  const allowed = Array.isArray(expected) ? expected : [expected];
  expect(allowed, await response.text()).toContain(response.status());
  return response.ok() ? response.json() : null;
}
export async function rest(request, accessToken, path, expected = 200) {
  const f = fixture();
  const anon = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = await request.get(`${f.apiUrl}/rest/v1/${path}`, { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` } });
  const allowed = Array.isArray(expected) ? expected : [expected];
  expect(allowed, await response.text()).toContain(response.status());
  return response.ok() ? response.json() : null;
}
export function annotations(testInfo, count) {
  expect(count).toBeGreaterThan(0);
  testInfo.annotations.push({ type: "closeout-assertions", description: String(count) });
}
