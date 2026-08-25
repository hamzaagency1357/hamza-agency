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
import { isGeneratedActionRoleAllowed } from "./admin-role-policy.ts";

export const GENERATED_ACTIONS = [...new Set([...BASE_GENERATED_ACTIONS, ...TRUSTED_RPC_ACTIONS])];
export const GENERATED_PERMISSIONS: Record<string, { module: string; permission: string }> = {
  ...BASE_GENERATED_PERMISSIONS,
  ...TRUSTED_RPC_PERMISSIONS,
};

type DispatchInput = Parameters<typeof dispatchBaseGeneratedAdminAction>[0];

export async function dispatchGeneratedAdminAction(input: DispatchInput) {
  if (!isGeneratedActionRoleAllowed(input.action, input.admin.role)) {
    return { ok: false, status: 403, body: { ok: false, code: "forbidden" } };
  }
  const trustedRpc = await dispatchTrustedRpcAction(input);
  if (trustedRpc) return trustedRpc;
  return dispatchBaseGeneratedAdminAction(input);
}
