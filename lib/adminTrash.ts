type JsonRecord = Record<string, unknown>;

type SupabaseLikeClient = {
  from: (table: string) => {
    insert: (payload: JsonRecord | JsonRecord[]) => Promise<{ error: { message?: string } | null }>;
  };
};

export type MoveRecordToTrashInput = {
  supabase: SupabaseLikeClient | null | undefined;
  tableName: string;
  recordId: string | number;
  title?: string | null;
  record: JsonRecord;
  adminEmail?: string | null;
  reason?: string | null;
};

export type MoveRecordToTrashResult = {
  success: boolean;
  trashPayload?: JsonRecord;
  error?: string;
};

const blockedTables = new Set([
  "admin_users",
  "role_permissions",
  "roles",
  "permissions",
  "admin_permissions",
  "activity_logs",
  "backups",
  "trash_items",
]);

function cleanTableName(tableName: string) {
  return tableName.trim().replace(/[^a-zA-Z0-9_]/g, "");
}

function stringifyRecordId(recordId: string | number) {
  return String(recordId).trim();
}

function inferTitle(record: JsonRecord, fallback: string) {
  const candidates = [
    record.title,
    record.name,
    record.full_name,
    record.display_name,
    record.email,
    record.phone,
    record.whatsapp,
    record.request_code,
    record.tracking_code,
    record.slug,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return fallback;
}

function cloneRecord(record: JsonRecord) {
  try {
    return JSON.parse(JSON.stringify(record)) as JsonRecord;
  } catch {
    return { ...record };
  }
}

export function buildTrashPayload(input: Omit<MoveRecordToTrashInput, "supabase">) {
  const tableName = cleanTableName(input.tableName);
  const recordId = stringifyRecordId(input.recordId);
  const deletedAt = new Date().toISOString();
  const originalData = cloneRecord(input.record);
  const title = input.title?.trim() || inferTitle(originalData, `${tableName} #${recordId}`);

  return {
    item_type: tableName,
    item_id: recordId,
    item_title: title,
    item_data: originalData,
    deleted_by: input.adminEmail || "unknown_admin",
    deleted_at: deletedAt,
  };
}

export async function moveRecordToTrash(input: MoveRecordToTrashInput): Promise<MoveRecordToTrashResult> {
  if (!input.supabase) {
    return { success: false, error: "Supabase client is not configured." };
  }

  const tableName = cleanTableName(input.tableName);
  const recordId = stringifyRecordId(input.recordId);

  if (!tableName) {
    return { success: false, error: "A valid table name is required before moving a record to trash." };
  }

  if (!recordId) {
    return { success: false, error: "A valid record id is required before moving a record to trash." };
  }

  if (blockedTables.has(tableName)) {
    return { success: false, error: `Moving records from ${tableName} to trash is intentionally blocked.` };
  }

  const trashPayload = buildTrashPayload({
    tableName,
    recordId,
    title: input.title,
    record: input.record,
    adminEmail: input.adminEmail,
    reason: input.reason,
  });

  const { error } = await input.supabase.from("trash_items").insert(trashPayload);

  if (error) {
    return {
      success: false,
      trashPayload,
      error: error.message || "Failed to insert trash item.",
    };
  }

  await input.supabase.from("activity_logs").insert({
    admin_email: input.adminEmail || "unknown_admin",
    action: "move_record_to_trash",
    entity_type: tableName,
    entity_id: recordId,
    old_data: JSON.stringify(input.record),
    new_data: JSON.stringify(trashPayload),
    ip_address: "",
  });

  return { success: true, trashPayload };
}
