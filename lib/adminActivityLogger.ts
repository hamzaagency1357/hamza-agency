import { supabase } from "@/lib/supabase";

type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

type AdminActivityInput = {
  action: string;
  module: string;
  adminEmail?: string;
  recordId?: string | number | null;
  details?: JsonLike;
  oldData?: JsonLike;
  newData?: JsonLike;
};

type ActivityPayload = Record<string, string | number | JsonLike | undefined>;

function cleanPayload(payload: ActivityPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== "")
  );
}

function asSupabasePayload(payload: ActivityPayload) {
  return cleanPayload(payload) as never;
}

export async function logAdminActivity(input: AdminActivityInput) {
  if (!supabase) return;

  const recordId = input.recordId === null || input.recordId === undefined ? undefined : String(input.recordId);

  const payloads: ActivityPayload[] = [
    {
      action: input.action,
      module: input.module,
      admin_email: input.adminEmail,
      record_id: recordId,
      details: input.details,
      old_data: input.oldData,
      new_data: input.newData,
    },
    {
      action: input.action,
      table_name: input.module,
      admin_email: input.adminEmail,
      record_id: recordId,
      details: input.details,
      old_values: input.oldData,
      new_values: input.newData,
    },
    {
      action: input.action,
      entity_type: input.module,
      actor_email: input.adminEmail,
      entity_id: recordId,
      metadata: {
        details: input.details ?? null,
        oldData: input.oldData ?? null,
        newData: input.newData ?? null,
      },
    },
    {
      event: input.action,
      resource: input.module,
      user_email: input.adminEmail,
      target_id: recordId,
      payload: {
        details: input.details ?? null,
        oldData: input.oldData ?? null,
        newData: input.newData ?? null,
      },
    },
  ];

  for (const payload of payloads) {
    const { error } = await supabase.from("activity_logs").insert(asSupabasePayload(payload));
    if (!error) return;
  }
}
