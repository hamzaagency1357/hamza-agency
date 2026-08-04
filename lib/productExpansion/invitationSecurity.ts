import { createHash, randomBytes } from "node:crypto";

export const invitationRoles = ["creator", "client", "employee", "partner", "tenant_admin"] as const;
export type InvitationRole = (typeof invitationRoles)[number];

export function normalizeInvitationEmail(value: unknown): string | null {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 254 ? email : null;
}

export function normalizeInvitationRole(value: unknown): InvitationRole | null {
  return invitationRoles.includes(value as InvitationRole) ? value as InvitationRole : null;
}

export function normalizeInvitationExpiryDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 7;
  return Math.max(1, Math.min(Math.trunc(parsed), 30));
}

export function generateInvitationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashInvitationToken(raw) };
}

export function hashInvitationToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function isValidRawInvitationToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{40,100}$/.test(value.trim());
}

export function invitationExpiresAt(days: number, now = Date.now()): string {
  return new Date(now + normalizeInvitationExpiryDays(days) * 86_400_000).toISOString();
}
