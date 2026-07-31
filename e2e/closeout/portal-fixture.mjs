import fs from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";

const fixturePath = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-portal-fixtures.json";
export function portalFixture() {
  if (!fs.existsSync(fixturePath)) throw new Error("portal_fixture_missing");
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}
export async function login(page, account) {
  await page.goto("/portal/login", { waitUntil: "networkidle" });
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(account.password);
  await page.getByRole("button", { name: /دخول|Sign in|Giriş yap/ }).click();
}
export async function browserPortalCredentials(page) {
  return page.evaluate(() => {
    let accessToken = "";
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        const candidate = value?.access_token || value?.currentSession?.access_token;
        if (typeof candidate === "string" && candidate.split(".").length === 3) {
          accessToken = candidate;
          break;
        }
      } catch {}
    }
    return {
      accessToken,
      platformSessionId: sessionStorage.getItem("hamza_portal_platform_session") || "",
    };
  });
}
export function evidence(testInfo, suite, role, locale = "ar") {
  const device = testInfo.project.name.startsWith("mobile") ? "mobile" : "desktop";
  const sha = process.env.CLOSEOUT_EXPECTED_SHA.slice(0, 8);
  return path.join("artifacts", "safe", "screenshots", `${suite}-${role}-${locale}-${device}-${sha}.png`);
}
export async function annotate(testInfo, count) {
  expect(count).toBeGreaterThan(0);
  testInfo.annotations.push({ type: "closeout-assertions", description: String(count) });
}
