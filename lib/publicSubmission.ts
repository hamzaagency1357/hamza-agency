export type PublicSubmissionType = "application" | "service_request" | "job_application" | "contact" | "ai_support" | "password_reset" | "review";

export type PublicSubmissionResult = { ok: boolean; code?: string; id?: number | string; trackingCode?: string };

export async function submitPublicForm(type: PublicSubmissionType, payload: Record<string, unknown>, startedAt: string, honeypot = "") {
  const response = await fetch("/api/public-submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, payload, startedAt, honeypot }),
  });
  const result = (await response.json().catch(() => ({}))) as PublicSubmissionResult;
  if (!response.ok || !result.ok) throw new Error(result.code || "try_again_later");
  return result;
}
