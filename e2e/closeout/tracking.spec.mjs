import { test, expect } from "@playwright/test";
import { annotations, fixture, rpc } from "./real-runtime-helper.mjs";

const fingerprint = "a".repeat(64);

test("real application and service tracking read current-state database rows without PII leakage", async ({ request }, testInfo) => {
  const f = fixture();
  const anon = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  expect(anon).toBeTruthy();
  const application = await rpc(request, anon, "pr100_lookup_public_agency_application_by_code", { p_tracking_code: f.core.applicationCode, p_request_fingerprint: fingerprint });
  expect(application.allowed).toBe(true);expect(application.found).toBe(true);expect(application.record.tracking_code).toBe(f.core.applicationCode);expect(application.record.status).toBeTruthy();expect(JSON.stringify(application)).not.toMatch(/whatsapp|email|full_name|\+900000/i);
  const service = await rpc(request, anon, "pr100_lookup_public_service_request", { p_request_code: f.core.serviceCode, p_request_fingerprint: "b".repeat(64) });
  expect(service.allowed).toBe(true);expect(service.found).toBe(true);expect(service.record.request_code).toBe(f.core.serviceCode);expect(JSON.stringify(service)).not.toMatch(/whatsapp|email|full_name|\+900000/i);
  annotations(testInfo, 12);
});

test("real tracking RPCs fail closed for malformed codes and never expose internals", async ({ request }, testInfo) => {
  const anon = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  for (const [name, body] of [["pr100_lookup_public_agency_application_by_code", { p_tracking_code: "invalid", p_request_fingerprint: "c".repeat(64) }],["pr100_lookup_public_service_request", { p_request_code: "invalid", p_request_fingerprint: "d".repeat(64) }]]) {
    const result = await rpc(request, anon, name, body);expect(result.allowed).toBe(false);expect(result.code).toBe("invalid_request");expect(JSON.stringify(result)).not.toMatch(/stack|service_role|authorization|whatsapp|email/i);
  }
  annotations(testInfo, 8);
});

test("PR4 local-isolated human handoff creates SUP and requires its separate verification secret", async ({ request }, testInfo) => {
  const anon = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  expect(anon).toBeTruthy();
  const created = await rpc(request, anon, "pr4_create_support_request", {p_language:"ar",p_subject:"اختبار متابعة مع موظف",p_context:"سياق عام خالٍ من البيانات الشخصية",p_contact_type:null,p_contact_value:null,p_consent:true});
  expect(created.supportCode).toMatch(/^SUP-[A-Z0-9]{4}$/);expect(created.verification).toMatch(/^[A-Z0-9]{10}$/);expect(created.retentionDays).toBeLessThanOrEqual(90);
  const wrong = await rpc(request, anon, "pr4_track_support_request", {p_code:created.supportCode,p_verification:"0000000000"});
  expect(wrong.found).toBe(false);
  const tracked = await rpc(request, anon, "pr4_track_support_request", {p_code:created.supportCode,p_verification:created.verification});
  expect(tracked.found).toBe(true);expect(tracked.record.tracking_code).toBe(created.supportCode);expect(tracked.record.request_type).toBe("SUP");expect(JSON.stringify(tracked)).not.toMatch(/internal|note|assigned_admin|actor|verification_hash|contact_value|request_id/i);
  annotations(testInfo, 16);
});
