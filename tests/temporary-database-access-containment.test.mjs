import test from "node:test";
import assert from "node:assert/strict";
import {
  PREFERRED_SCOPED_PAT_PERMISSIONS,
  TEMP_ACCESS,
  assertAllowedManagementRequest,
} from "../scripts/ops/temporary-database-access.mjs";

const ref = TEMP_ACCESS.projectRef;
const userId = "123e4567-e89b-42d3-a456-426614174000";

function rejects(method, path, pattern = /outside the explicit allowlist|canonical allowlisted path|restricted to one valid user id/) {
  assert.throws(() => assertAllowedManagementRequest(method, path), pattern);
}

test("preferred Scoped PAT permission set remains the seven-scope least-privilege target", () => {
  assert.deepEqual(PREFERRED_SCOPED_PAT_PERMISSIONS, [
    "project_admin_read",
    "project_admin_write",
    "database_jit_read",
    "database_jit_write",
    "database_pooling_config_read",
    "database_ssl_config_read",
    "edge_functions_read",
  ]);
});

test("classic PAT fallback can call only the explicit Production Management API allowlist", () => {
  for (const [method, path] of [
    ["GET", "/profile"],
    ["GET", `/projects/${ref}`],
    ["GET", `/projects/${ref}/ssl-enforcement`],
    ["GET", `/projects/${ref}/jit-access`],
    ["PUT", `/projects/${ref}/jit-access`],
    ["GET", `/projects/${ref}/database/jit`],
    ["GET", `/projects/${ref}/database/jit/list`],
    ["PUT", `/projects/${ref}/database/jit`],
    ["GET", `/projects/${ref}/config/database/pooler`],
    ["DELETE", `/projects/${ref}/database/jit/${userId}`],
  ]) {
    assert.equal(assertAllowedManagementRequest(method, path), true, `${method} ${path}`);
  }
});

test("unrelated Management API product surfaces fail closed even when the PAT itself is broad", () => {
  rejects("GET", `/projects/${ref}/config/auth`);
  rejects("GET", `/projects/${ref}/config/storage`);
  rejects("GET", `/projects/${ref}/api-keys`);
  rejects("PATCH", `/projects/${ref}/config/database/pooler`);
  rejects("POST", "/projects");
});

test("cross-project and non-canonical requests fail closed", () => {
  rejects("GET", "/projects/another-project-ref");
  rejects("GET", `/projects/${ref}/database/jit?anything=1`);
  rejects("GET", `/projects/${ref}/database/jit/list?anything=1`);
  rejects("DELETE", `/projects/${ref}/database/jit/not-a-uuid`);
  rejects("DELETE", `/projects/another-project-ref/database/jit/${userId}`);
});
