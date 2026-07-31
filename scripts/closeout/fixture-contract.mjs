import fs from "node:fs";

export function fixturePrefix(env = process.env) {
  const run = env.GITHUB_RUN_ID || "local";
  const attempt = env.GITHUB_RUN_ATTEMPT || "1";
  return `E2E-${run}-${attempt}`;
}

export function fixtureId(kind, suffix = crypto.randomUUID()) {
  return `${fixturePrefix()}-${kind}-${suffix}`;
}

export async function withCleanup(create, cleanup, verifyZero, execute) {
  const fixture = await create();
  try {
    return await execute(fixture);
  } finally {
    await cleanup(fixture);
    const remaining = await verifyZero(fixture);
    if (remaining !== 0) throw new Error(`Fixture cleanup failed: ${remaining} row(s) remain for ${fixturePrefix()}`);
  }
}

if (process.argv[2] === "verify-file") {
  const file = process.argv[3];
  if (!file || !fs.existsSync(file)) throw new Error("Fixture manifest missing");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  if (manifest.remaining !== 0) throw new Error(`${manifest.remaining} fixture row(s) remain`);
  console.log("Fixture cleanup verified: 0 rows remain.");
}
