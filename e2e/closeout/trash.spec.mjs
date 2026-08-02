import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test("real trash restore and two-step permanent deletion are enforced", async ({ request }, testInfo) => {
  const f = fixture();
  const admin = await token(request, f.accounts.employee);

  const restored = await rpc(request, admin, "pr99_restore_trash", { p_trash_id: f.core.trashRestore });
  expect(JSON.stringify(restored)).toMatch(/restored|pages/i);
  const page = await rest(request, admin, `pages?id=eq.${f.core.trashRestorePage}&select=id,title`);
  expect(page).toHaveLength(1);

  await rpc(request, admin, "pr99_permanent_delete_trash", {
    p_trash_id: f.core.trashDelete,
    p_confirmation: "DELETE",
  }, [400, 403]);

  const deleted = await rpc(request, admin, "pr99_permanent_delete_trash", {
    p_trash_id: f.core.trashDelete,
    p_confirmation: "DELETE PERMANENTLY",
  });
  expect(JSON.stringify(deleted)).toMatch(/permanently_deleted|deleted/i);

  const trashRow = await rest(request, admin, `trash_items?id=eq.${f.core.trashDelete}&select=restore_status,data,item_data`);
  expect(trashRow[0].restore_status).toBe("permanently_deleted");
  expect(trashRow[0].data).toEqual({});
  expect(trashRow[0].item_data).toBeNull();
  annotations(testInfo, 12);
});
