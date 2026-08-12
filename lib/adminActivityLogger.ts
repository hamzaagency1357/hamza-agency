type AdminActivityInput = {
  action: string;
  module: string;
  adminEmail?: string;
  recordId?: string | number | null;
  details?: unknown;
  oldData?: unknown;
  newData?: unknown;
};

/**
 * Legacy compatibility shim.
 *
 * Admin mutations are now audited inside the trusted PR116 server/Edge
 * mutation boundary after a successful authorized write. The browser must
 * never be allowed to manufacture authoritative audit action/actor/old/new
 * records, so this former client-side audit transport intentionally performs
 * no write.
 */
export async function logAdminActivity(input: AdminActivityInput) {
  void input;
  return;
}
