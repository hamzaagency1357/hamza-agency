import {
  GENERATED_ACTIONS as BASE_GENERATED_ACTIONS,
  GENERATED_PERMISSIONS as BASE_GENERATED_PERMISSIONS,
  dispatchGeneratedAdminAction as dispatchBaseGeneratedAdminAction,
} from "./generated-dispatch-base.ts";
import {
  TRUSTED_RPC_ACTIONS,
  TRUSTED_RPC_PERMISSIONS,
  dispatchTrustedRpcAction,
} from "./trusted-rpc-dispatch.ts";

export const GENERATED_ACTIONS = [...new Set([...BASE_GENERATED_ACTIONS, ...TRUSTED_RPC_ACTIONS])];
export const GENERATED_PERMISSIONS: Record<string, { module: string; permission: string }> = {
  ...BASE_GENERATED_PERMISSIONS,
  ...TRUSTED_RPC_PERMISSIONS,
};

const SUPER_ADMIN_ONLY_ACTIONS = new Set([
  "pr116_permissions_page_entity_admin_permissions_upsert",
  "pr116_permissions_page_entity_admin_permissions_delete",
]);

type DispatchInput = Parameters<typeof dispatchBaseGeneratedAdminAction>[0];

export async function dispatchGeneratedAdminAction(input: DispatchInput) {
  if (SUPER_ADMIN_ONLY_ACTIONS.has(input.action) && input.admin.role !== "super_admin") {
    return { ok: false, status: 403, body: { ok: false, code: "forbidden" } };
  }
  const trustedRpc = await dispatchTrustedRpcAction(input);
  if (trustedRpc) return trustedRpc;
  return dispatchBaseGeneratedAdminAction(input);
}
