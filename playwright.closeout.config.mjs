import { defineConfig, devices } from "@playwright/test";
import { assertCloseoutEnvironment } from "./scripts/closeout/environment-guard.mjs";

const guard = assertCloseoutEnvironment();
const suiteFile = `${guard.suite}.spec.mjs`;
const translationsCanRunParallel = guard.suite === "translations";
const ownerViewportProjects = ["public", "translations"].includes(guard.suite)
  ? [
      {
        name: "owner-mobile-390x844",
        use: {
          ...devices["Pixel 7"],
          viewport: { width: 390, height: 844 },
          screen: { width: 390, height: 844 },
        },
      },
      {
        name: "owner-mobile-narrow-320x720",
        use: {
          ...devices["Pixel 7"],
          viewport: { width: 320, height: 720 },
          screen: { width: 320, height: 720 },
        },
      },
    ]
  : [];

export default defineConfig({
  testDir: "./e2e/closeout",
  testMatch: suiteFile,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CLOSEOUT_DISABLE_RETRIES === "1" ? 0 : process.env.CI ? 1 : 0,
  workers: guard.mode === "local-isolated" && !translationsCanRunParallel ? 1 : undefined,
  forbidOnly: true,
  fullyParallel: guard.mode !== "local-isolated" || translationsCanRunParallel,
  reporter: [
    ["line"],
    ["html", { outputFolder: "artifacts/raw/playwright-report", open: "never" }],
    ["json", { outputFile: "artifacts/raw/results.json" }],
  ],
  outputDir: "artifacts/raw/test-results",
  use: {
    baseURL: guard.targetOrigin,
    headless: true,
    ignoreHTTPSErrors: guard.mode === "local-isolated",
    trace: "off",
    screenshot: "off",
    video: "off",
    storageState: undefined,
    serviceWorkers: "block",
    extraHTTPHeaders: { "x-closeout-readonly": guard.readonly ? "1" : "0" },
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    ...ownerViewportProjects,
  ],
});
