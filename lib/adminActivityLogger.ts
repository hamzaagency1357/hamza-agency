import { supabase } from "@/lib/supabase";

type AdminActivityInput = {
  action: string;
  module: string;
  adminEmail?: string;
  recordId?: string | number | null;
  details?: unknown;
  oldData?: unknown;
  newData?: unknown;
};

export async function logAdminActivity(input: AdminActivityInput) {
  if (!supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch("/api/admin/activity", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation: "recordAdminActivity",
        action: input.action,
        module: input.module,
        recordId: input.recordId ?? null,
        details: input.details,
        oldData: input.oldData,
        newData: input.newData,
      }),
    });
  } catch {
    return;
  }
}
