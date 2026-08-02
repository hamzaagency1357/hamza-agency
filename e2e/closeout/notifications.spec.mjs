import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test("real notifications paginate, deduplicate failures, and mark selected or all read", async ({ request }, testInfo) => {
  const f = fixture();
  const admin = await token(request, f.accounts.employee);

  await rpc(request, admin, "pr99_log_operation_failure", {
    p_event_type: "backup_failure",
    p_entity_type: "backup",
    p_entity_id: "closeout-backup",
    p_safe_message: "Local backup failure evidence",
    p_route: "/admin/backups",
  });
  await rpc(request, admin, "pr99_log_operation_failure", {
    p_event_type: "backup_failure",
    p_entity_type: "backup",
    p_entity_id: "closeout-backup",
    p_safe_message: "Local backup failure evidence",
    p_route: "/admin/backups",
  });

  const rows = await rest(request, admin, "notifications?recipient_role=eq.admin&select=id,is_read,event_key,priority&order=id.asc&limit=20");
  expect(rows.length).toBeGreaterThanOrEqual(3);
  expect(new Set(rows.filter((row) => row.event_key).map((row) => row.event_key)).size)
    .toBe(rows.filter((row) => row.event_key).length);

  expect(await rpc(request, admin, "pr99_mark_notifications_read", { p_ids: [f.core.notificationOne] })).toBe(1);
  const selected = await rest(request, admin, `notifications?id=eq.${f.core.notificationOne}&select=is_read`);
  expect(selected[0].is_read).toBe(true);

  const marked = await rpc(request, admin, "pr99_mark_notifications_read", { p_ids: null });
  expect(marked).toBeGreaterThanOrEqual(1);
  const unread = await rest(request, admin, "notifications?recipient_role=eq.admin&is_read=eq.false&select=id");
  expect(unread).toHaveLength(0);
  annotations(testInfo, 12);
});
