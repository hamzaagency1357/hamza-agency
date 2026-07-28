const config = {
  testDir: "./e2e",
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    headless: true,
    trace: "retain-on-failure",
  },
};

export default config;
