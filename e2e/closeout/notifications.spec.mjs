import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test("real notifications paginate, deduplicate failures, persist read state, and deny clients", async ({ request }, testInfo) => {
  const f = fixture();
  const admin = await token(request, f.accounts.employee);
  const client = await token(request, f.accounts.client);
  const suffix = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const firstEntity = `closeout-backup-${suffix}`;
  const secondEntity = `closeout-publish-${suffix}`;

  const failure = {
    p_event_type: "backup_failure",
    p_entity_type: "backup",
    p_entity_id: firstEntity,
    p_safe_message: "Local backup failure evidence",
    p_route: "/admin/backups",
  };
  await rpc(request, admin, "pr99_log_operation_failure", failure, 204);
  await rpc(request, admin, "pr99_log_operation_failure", failure, 204);
  await rpc(request, client, "pr99_log_operation_failure", failure, [400, 403]);

  const deduplicated = await rest(request, admin, `notifications?recipient_role=eq.admin&entity_id=eq.${firstEntity}&select=id,is_read,event_key,priority`);
  expect(deduplicated).toHaveLength(1);
  expect(deduplicated[0].event_key).toBeTruthy();
  expect(deduplicated[0].is_read).toBe(false);

  const pageOne = await rest(request, admin, "notifications?recipient_role=eq.admin&select=id&order=id.asc&limit=1&offset=0");
  const pageTwo = await rest(request, admin, "notifications?recipient_role=eq.admin&select=id&order=id.asc&limit=1&offset=1");
  expect(pageOne).toHaveLength(1);
  expect(pageTwo).toHaveLength(1);
  expect(pageOne[0].id).not.toBe(pageTwo[0].id);

  expect(await rpc(request, admin, "pr99_mark_notifications_read", { p_ids: [deduplicated[0].id] })).toBe(1);
  const selected = await rest(request, admin, `notifications?id=eq.${deduplicated[0].id}&select=is_read`);
  expect(selected[0].is_read).toBe(true);

  await rpc(request, admin, "pr99_log_operation_failure", {
    ...failure,
    p_event_type: "publish_failure",
    p_entity_type: "page",
    p_entity_id: secondEntity,
    p_route: "/admin/page-builder",
  }, 204);
  const marked = await rpc(request, admin, "pr99_mark_notifications_read", { p_ids: null });
  expect(marked).toBeGreaterThanOrEqual(1);
  const unread = await rest(request, admin, "notifications?recipient_role=eq.admin&is_read=eq.false&select=id");
  expect(unread).toHaveLength(0);
  annotations(testInfo, 22);
});
