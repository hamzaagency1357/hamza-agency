import { supabase } from "@/lib/supabase";

export type AdminActivityLogInput = {
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  oldData?: unknown;
  newData?: unknown;
  details?: unknown;
};

function stringifyValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function logAdminActivity(input: AdminActivityLogInput) {
  if (!supabase) return false;

  const basePayload = {
    admin_email: input.adminEmail || "غير محدد",
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId === null || input.entityId === undefined ? "" : String(input.entityId),
    old_data: stringifyValue(input.oldData),
    new_data: stringifyValue(input.newData ?? input.details),
    ip_address: "",
  };

  const attempts = [
    basePayload,
    {
      admin_email: basePayload.admin_email,
      action: basePayload.action,
      module: basePayload.entity_type,
      record_id: basePayload.entity_id,
      details: input.details ?? input.newData ?? "",
    },
    {
      action: basePayload.action,
      entity_type: basePayload.entity_type,
      entity_id: basePayload.entity_id,
      new_data: basePayload.new_data,
    },
  ];

  for (const payload of attempts) {
    const { error } = await supabase.from("activity_logs").insert(payload);
    if (!error) return true;
  }

  return false;
}
