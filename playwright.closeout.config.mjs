import { defineConfig, devices } from "@playwright/test";
import { assertCloseoutEnvironment } from "./scripts/closeout/environment-guard.mjs";

const guard = assertCloseoutEnvironment();
const readonly = guard.mode !== "local-isolated";

export default defineConfig({
  testDir: "./e2e/closeout",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: guard.mode === "local-isolated" ? 1 : undefined,
  forbidOnly: true,
  reporter: [["line"], ["html", { outputFolder: "artifacts/playwright-report", open: "never" }], ["json", { outputFile: "artifacts/results.json" }]],
  outputDir: "artifacts/test-results",
  use: {
    baseURL: guard.targetOrigin,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    storageState: undefined,
    extraHTTPHeaders: { "x-closeout-readonly": readonly ? "1" : "0" },
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
