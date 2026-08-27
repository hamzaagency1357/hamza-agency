import { test, expect } from "@playwright/test";

const missingCases = [
  {
    path: "/__missing_final_qa__",
    language: "ar",
    direction: "rtl",
    heading: "الصفحة غير موجودة",
  },
  {
    path: "/en/__missing_final_qa__",
    language: "en",
    direction: "ltr",
    heading: "Page not found",
  },
  {
    path: "/tr/__missing_final_qa__",
    language: "tr",
    direction: "ltr",
    heading: "Sayfa bulunamadı",
  },
];

test("AR EN TR unknown routes return real localized 404 responses without redirects", async ({
  page,
  request,
}) => {
  for (const item of missingCases) {
    const apiResponse = await request.get(item.path, { maxRedirects: 0 });
    expect(apiResponse.status(), item.path).toBe(404);
    expect(apiResponse.headers()["location"], item.path).toBeUndefined();
    expect(await apiResponse.text(), item.path).toMatch(/noindex/i);

    const navigationResponse = await page.goto(item.path, {
      waitUntil: "domcontentloaded",
    });
    expect(navigationResponse?.status(), item.path).toBe(404);
    await expect(page.locator("html"), item.path).toHaveAttribute(
      "lang",
      item.language,
    );
    await expect(page.locator("html"), item.path).toHaveAttribute(
      "dir",
      item.direction,
    );
    await expect(page.getByRole("heading", { name: item.heading }), item.path).toBeVisible();
  }
});

test("valid EN and TR routes remain successful", async ({ request }) => {
  for (const path of ["/en/about", "/tr/about"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    expect(response.headers()["location"], path).toBeUndefined();
  }
});

test("localized unknown routes do not redirect to locale roots or loop", async ({
  request,
}) => {
  for (const [path, forbiddenLocation] of [
    ["/en/__missing_final_qa__", "/en"],
    ["/tr/__missing_final_qa__", "/tr"],
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    const location = response.headers()["location"];
    expect(location, path).not.toBe(forbiddenLocation);
    expect(location, path).toBeUndefined();
  }
});
