import { test, expect } from "@playwright/test";
import { annotations, fixture, projectFixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test("real trash restore and two-step permanent deletion are tenant-authorized and persistent", async ({ request }, testInfo) => {
  const f = fixture();
  const project = projectFixture(f, testInfo);
  const admin = await token(request, f.accounts.employee);
  const client = await token(request, f.accounts.client);
  const otherTenant = await token(request, f.accounts.otherTenant);

  await rpc(request, client, "pr99_restore_trash", { p_trash_id: project.trashRestore }, [400, 403]);
  await rpc(request, otherTenant, "pr99_restore_trash", { p_trash_id: project.trashRestore }, [400, 403]);

  const restored = await rpc(request, admin, "pr99_restore_trash", { p_trash_id: project.trashRestore });
  expect(JSON.stringify(restored)).toMatch(/restored|pages/i);
  const page = await rest(request, admin, `pages?id=eq.${project.trashRestorePage}&select=id,title`);
  expect(page).toHaveLength(1);
  const restoredTrash = await rest(request, admin, `trash_items?id=eq.${project.trashRestore}&select=restore_status`);
  expect(restoredTrash[0].restore_status).toMatch(/restored/i);

  await rpc(request, admin, "pr99_permanent_delete_trash", {
    p_trash_id: project.trashDelete,
    p_confirmation: "DELETE",
  }, [400, 403]);

  await rpc(request, client, "pr99_permanent_delete_trash", {
    p_trash_id: project.trashDelete,
    p_confirmation: "DELETE PERMANENTLY",
  }, [400, 403]);

  const deleted = await rpc(request, admin, "pr99_permanent_delete_trash", {
    p_trash_id: project.trashDelete,
    p_confirmation: "DELETE PERMANENTLY",
  });
  expect(JSON.stringify(deleted)).toMatch(/permanently_deleted|deleted/i);

  const trashRow = await rest(request, admin, `trash_items?id=eq.${project.trashDelete}&select=restore_status,data,item_data`);
  expect(trashRow[0].restore_status).toBe("permanently_deleted");
  expect(trashRow[0].data).toEqual({});
  expect(trashRow[0].item_data).toBeNull();
  const deletedPage = await rest(request, admin, `pages?id=eq.${project.trashDeletePage}&select=id`);
  expect(deletedPage).toHaveLength(0);
  annotations(testInfo, 18);
});
