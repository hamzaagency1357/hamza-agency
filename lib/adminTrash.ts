import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";

type JsonRecord = Record<string, unknown>;

export type MoveRecordToTrashInput = {
  supabase?: unknown;
  tableName: string;
  recordId: string | number;
  title?: string | null;
  record: JsonRecord;
  adminEmail?: string | null;
  reason?: string | null;
};

export type MoveRecordToTrashResult = { success: boolean; trashPayload?: JsonRecord; error?: string };

const allowedItemTypes = new Set([
  "announcements", "contact_messages", "faqs", "gallery", "jobs", "media_assets", "pages_content",
  "partners", "programs", "reviews", "sections", "service_requests", "success_stories"
]);

function cleanTableName(tableName: string) { return tableName.trim().replace(/[^a-zA-Z0-9_]/g, ""); }
function stringifyRecordId(recordId: string | number) { return String(recordId).trim(); }
function inferTitle(record: JsonRecord, fallback: string) {
  for (const value of [record.title, record.name, record.full_name, record.display_name, record.email, record.phone, record.whatsapp, record.request_code, record.tracking_code, record.slug]) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return fallback;
}
function cloneRecord(record: JsonRecord) { try { return JSON.parse(JSON.stringify(record)) as JsonRecord; } catch { return { ...record }; } }

export function buildTrashPayload(input: Omit<MoveRecordToTrashInput, "supabase">) {
  const tableName = cleanTableName(input.tableName);
  const recordId = stringifyRecordId(input.recordId);
  const deletedAt = new Date().toISOString();
  const originalData = cloneRecord(input.record);
  const title = input.title?.trim() || inferTitle(originalData, `${tableName} #${recordId}`);
  return { item_type: tableName, item_id: recordId, item_title: title, item_data: originalData, deleted_at: deletedAt };
}

export async function moveRecordToTrash(input: MoveRecordToTrashInput): Promise<MoveRecordToTrashResult> {
  const itemType = cleanTableName(input.tableName);
  const recordId = stringifyRecordId(input.recordId);
  if (!allowedItemTypes.has(itemType)) return { success: false, error: "هذا النوع غير مسموح بنقله إلى سلة المحذوفات." };
  if (!recordId) return { success: false, error: "الرقم المرجعي غير صالح." };
  const trashPayload = buildTrashPayload(input);
  const action = `pr116_trash_${itemType}_move`;
  const result = await adminBoundaryMutation(action, { itemType, recordId, title: trashPayload.item_title, record: input.record, reason: input.reason || null });
  if (result.error) return { success: false, trashPayload, error: result.error.message };
  return { success: true, trashPayload };
}
