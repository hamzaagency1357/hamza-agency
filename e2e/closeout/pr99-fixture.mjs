import { expect } from "@playwright/test";
import path from "node:path";

export const token = process.env.PR99_E2E_TOKEN || "";

export async function openFixture(page) {
  expect(token.length).toBeGreaterThanOrEqual(32);
  await page.goto("/pr99-e2e", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "PR99 Isolated E2E Console" })).toBeVisible();
  await page.getByTestId("token").fill(token);
  await page.getByTestId("login").click();
  await expect(page.getByTestId("state")).toContainText("admin_login");
}

export async function resetFixture(page) {
  await page.getByTestId("reset").click();
  await expect(page.getByTestId("state")).toContainText('"authenticated": false');
}

export async function annotate(testInfo, count) {
  testInfo.annotations.push({ type: "closeout-assertions", description: String(count) });
}

export function evidence(testInfo, suite, scenario) {
  const sha = (process.env.CLOSEOUT_EXPECTED_SHA || "unknown").slice(0, 8);
  return path.join("artifacts", "raw", "screenshots", `${suite}-${scenario}-${testInfo.project.name}-${sha}.png`);
}
