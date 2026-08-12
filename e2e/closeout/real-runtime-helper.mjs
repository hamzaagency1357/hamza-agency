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
async function decode(response, expected) {
  const text = await response.text();
  const allowed = Array.isArray(expected) ? expected : [expected];
  expect(allowed, text).toContain(response.status());
  if (!response.ok() || response.status() === 204 || text.length === 0) return null;
  return JSON.parse(text);
}
export async function rpc(request, accessToken, name, body, expected = 200) {
  const f = fixture();
  const anon = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = await request.post(`${f.apiUrl}/rest/v1/rpc/${name}`, {
    headers: { apikey: anon, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    data: body,
  });
  return decode(response, expected);
}
export async function adminAction(request, accessToken, action, payload, expected = 200) {
  const response = await request.post("/api/admin/mutations/entities", {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    data: { action, payload },
  });
  const body = await decode(response, expected);
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body.data ?? null;
}
export async function rest(request, accessToken, path, expected = 200) {
  const f = fixture();
  const anon = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = await request.get(`${f.apiUrl}/rest/v1/${path}`, { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` } });
  return decode(response, expected);
}
export function projectFixture(f, testInfo) {
  const key = testInfo.project.name === "mobile-chromium" ? "mobileChromium" : "desktopChromium";
  const value = f.core?.projects?.[key];
  expect(value, `missing fixture for ${key}`).toBeTruthy();
  return value;
}
export function annotations(testInfo, count) {
  expect(count).toBeGreaterThan(0);
  testInfo.annotations.push({ type: "closeout-assertions", description: String(count) });
}
